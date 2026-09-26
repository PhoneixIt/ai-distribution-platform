import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { enrichOrganizations, enrichPeople, searchPeople } from '@/lib/apollo'

type Context = { params: Promise<{ id: string }> }

function domainFromWebsite(value: string | null) {
  if (!value) return null
  try { return new URL(value.startsWith('http') ? value : 'https://' + value).hostname.replace(/^www\./,'') } catch { return null }
}

function pickOneByDomain(people: Record<string, unknown>[], domain: string) {
  const matches = people.filter((person) => {
    const org = person.organization && typeof person.organization === 'object' ? person.organization as Record<string, unknown> : {}
    return String(org.primary_domain || org.domain || '').replace(/^www\./,'') === domain
  })
  return matches.sort((a,b) => Number(Boolean(b.email_status === 'verified')) - Number(Boolean(a.email_status === 'verified')))[0] || null
}

export async function POST(_request: Request, context: Context) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  const { id } = await context.params

  const mission = await supabase.from('missions').select('*').eq('id', id).maybeSingle()
  if (mission.error) return NextResponse.json({ error: mission.error.message }, { status: 500 })
  if (!mission.data) return NextResponse.json({ error: 'Mission not found.' }, { status: 404 })
  if (!mission.data.discovery_run_id) return NextResponse.json({ error: 'Mission has no completed discovery run.' }, { status: 409 })

  const { data: candidates, error: candidateError } = await supabase
    .from('discovery_candidates')
    .select('*')
    .eq('discovery_run_id', mission.data.discovery_run_id)
    .eq('qualification_status', 'qualified')
    .order('rank', { ascending: true })
    .limit(10)
  if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 })
  if (!candidates?.length) return NextResponse.json({ error: 'No qualified candidates are available for contact research.' }, { status: 409 })

  const domains = candidates.map((row) => domainFromWebsite(row.website)).filter((x): x is string => Boolean(x))
  if (!domains.length) return NextResponse.json({ error: 'No candidate websites can be enriched.' }, { status: 409 })

  const orgPayload = await enrichOrganizations(candidates.map((row) => ({ name: row.company_name, website: row.website, domain: domainFromWebsite(row.website) })))
  const orgs = Array.isArray(orgPayload.organizations) ? orgPayload.organizations as Record<string, unknown>[] : []

  const companyCredits = Number(orgPayload.credits_consumed)
  const companyCreditsConsumed = Number.isFinite(companyCredits) ? companyCredits : domains.length
  await supabase.from('mission_external_usage').insert({
    org_id: mission.data.org_id, mission_id: id, provider: 'apollo',
    operation: 'organization_enrichment', entity_count: domains.length,
    estimated_credits: domains.length, credits_consumed: companyCreditsConsumed,
    created_by: user.id, metadata: { waterfall: false, actual_usage_reported: Number.isFinite(companyCredits) }
  })

  const orgByDomain = new Map(orgs.map((org) => [String(org.primary_domain || org.domain || '').replace(/^www\./,''), org]))
  const peopleSearch = await searchPeople(domains)
  const people = Array.isArray(peopleSearch.people) ? peopleSearch.people as Record<string, unknown>[] : []

  const selected = candidates.map((candidate) => {
    const domain = domainFromWebsite(candidate.website)
    return domain ? pickOneByDomain(people, domain) : null
  }).filter((x): x is Record<string, unknown> => Boolean(x)).slice(0,10)

  if (selected.length) {
    const ids = selected.map((person) => String(person.id)).filter(Boolean)
    const peoplePayload = await enrichPeople(ids)
    const matches = Array.isArray(peoplePayload.matches) ? peoplePayload.matches as Record<string, unknown>[] : []
    const consumed = Number(peoplePayload.credits_consumed || 0)
    await supabase.from('mission_external_usage').insert({
      org_id: mission.data.org_id, mission_id: id, provider: 'apollo',
      operation: 'people_enrichment', entity_count: ids.length,
      estimated_credits: ids.length, credits_consumed: Number.isFinite(consumed) ? consumed : 0,
      created_by: user.id, metadata: { waterfall: false, reveal_phone_number: false, reveal_personal_emails: false }
    })

    const byId = new Map(matches.map((person) => [String(person.id), person]))
    for (const candidate of candidates) {
      const domain = domainFromWebsite(candidate.website)
      const apolloOrg = domain ? orgByDomain.get(domain) : undefined
      const searched = domain ? pickOneByDomain(people, domain) : null
      const enriched = searched ? byId.get(String(searched.id)) : null
      const dossier = {
        org_id: mission.data.org_id,
        mission_id: id,
        candidate_id: candidate.id,
        company: { name: candidate.company_name, website: candidate.website, country: candidate.country },
        commercial: { customer_segments: candidate.customer_segments, services: candidate.services, partner_types: candidate.partner_types },
        intelligence: { discovery_fit_score: candidate.fit_score, qualification_score: candidate.qualification_score, qualification_status: candidate.qualification_status, reasons: candidate.qualification_reasons, concerns: candidate.concerns, evidence: candidate.evidence, apollo_company: apolloOrg || null },
        people: enriched ? [enriched] : searched ? [searched] : [],
        recommended_action: { action: 'review_contact_and_prepare_personalized_outreach', rationale: 'Candidate passed the discovery qualification stage; review the evidence and contact context before outreach.' },
        status: 'contacts_researched'
      }
      const dossierWrite = await supabase.from('mission_dossiers').upsert(dossier, { onConflict: 'mission_id,candidate_id' })
      if (dossierWrite.error) {
        return NextResponse.json({ error: dossierWrite.error.message, stage: 'contact_research' }, { status: 500 })
      }
    }
  }

  const dossierCount = await supabase.from('mission_dossiers').select('id', { count: 'exact', head: true }).eq('mission_id', id)
  const usage = await supabase.from('mission_external_usage').select('credits_consumed').eq('mission_id', id)
  const apolloCreditsConsumed = (usage.data || []).reduce((sum, row) => sum + Number(row.credits_consumed || 0), 0)
  const missionUpdate = await supabase.from('missions').update({
    current_stage: 'contacts_researched',
    status: 'running',
    result_summary: { ...(mission.data.result_summary || {}), contacts_found: selected.length, dossiers_completed: dossierCount.count || 0, apollo_credits_consumed: apolloCreditsConsumed }
  }).eq('id', id)
  if (missionUpdate.error) {
    return NextResponse.json({ error: missionUpdate.error.message, stage: 'contact_research' }, { status: 500 })
  }

  return NextResponse.json({
    missionId: id,
    candidates: candidates.length,
    contactsFound: selected.length,
    dossiersCompleted: dossierCount.count || 0,
    apollo: { companyEnrichment: domains.length, peopleSearch: selected.length, peopleEnrichment: selected.length, creditsConsumed: apolloCreditsConsumed }
  })
}