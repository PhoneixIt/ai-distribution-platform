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
    .in('qualification_status', ['qualified', 'needs_review'])
    .not('rank', 'is', null)
    .order('qualification_score', { ascending: false })
    .order('fit_score', { ascending: false })
    .order('rank', { ascending: true })
    .limit(Math.max(1, Number((mission.data.result_summary || {}).requested || 10)))
  if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 })
  if (!candidates?.length) return NextResponse.json({ error: 'No viable candidates are available for contact research. PortAi needs more evidence before spending contact-enrichment credits.' }, { status: 409 })

  const domains = candidates.map((row) => domainFromWebsite(row.website)).filter((x): x is string => Boolean(x))
  if (!domains.length) return NextResponse.json({ error: 'No candidate websites can be enriched.' }, { status: 409 })

  let orgs: Record<string, unknown>[] = []
  let apolloAvailable = true
  let apolloError = ''
  let orgPayload: Record<string, unknown> = {}
  try {
    orgPayload = await enrichOrganizations(candidates.map((row) => ({ name: row.company_name, website: row.website, domain: domainFromWebsite(row.website) })))
    orgs = Array.isArray(orgPayload.organizations) ? orgPayload.organizations as Record<string, unknown>[] : []
  } catch (error) {
    apolloAvailable = false
    apolloError = error instanceof Error ? error.message : 'Apollo organization enrichment failed.'
  }

  const companyCredits = Number(orgPayload.credits_consumed)
  const companyCreditsConsumed = Number.isFinite(companyCredits) ? companyCredits : 0
  if (apolloAvailable) await supabase.from('mission_external_usage').insert({
    org_id: mission.data.org_id, mission_id: id, provider: 'apollo',
    operation: 'organization_enrichment', entity_count: domains.length,
    estimated_credits: domains.length, credits_consumed: companyCreditsConsumed,
    created_by: user.id, metadata: { waterfall: false, actual_usage_reported: Number.isFinite(companyCredits) }
  })

  const orgByDomain = new Map(orgs.map((org) => [String(org.primary_domain || org.domain || '').replace(/^www\./,''), org]))
  let people: Record<string, unknown>[] = []
  if (apolloAvailable) {
    try {
      const peopleSearch = await searchPeople(domains)
      people = Array.isArray(peopleSearch.people) ? peopleSearch.people as Record<string, unknown>[] : []
    } catch (error) {
      apolloAvailable = false
      apolloError = error instanceof Error ? error.message : 'Apollo people search failed.'
    }
  }

  const selected = candidates.map((candidate) => {
    const domain = domainFromWebsite(candidate.website)
    return domain ? pickOneByDomain(people, domain) : null
  }).filter((x): x is Record<string, unknown> => Boolean(x)).slice(0, candidates.length)

  if (selected.length && apolloAvailable) {
    const ids = selected.map((person) => String(person.id)).filter(Boolean)
    let peoplePayload: Record<string, unknown> = {}
    try {
      peoplePayload = await enrichPeople(ids)
    } catch (error) {
      apolloAvailable = false
      apolloError = error instanceof Error ? error.message : 'Apollo people enrichment failed.'
    }
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
        recommended_action: { action: 'review_contact_and_prepare_personalized_outreach', rationale: 'Candidate was selected from the strongest qualified and evidence-backed review candidates; confirm fit before outreach.' },
        status: 'contacts_researched'
      }
      await supabase.from('mission_dossiers').upsert(dossier, { onConflict: 'mission_id,candidate_id' })
    }
  }

  // Apollo is an enrichment layer, not a reason to lose the entire mission.
  // Keep the evidence-backed company dossiers even when contact enrichment is unavailable.
  if (!apolloAvailable) {
    for (const candidate of candidates) {
      const domain = domainFromWebsite(candidate.website)
      const apolloOrg = domain ? orgByDomain.get(domain) : undefined
      await supabase.from('mission_dossiers').upsert({
        org_id: mission.data.org_id,
        mission_id: id,
        candidate_id: candidate.id,
        company: { name: candidate.company_name, website: candidate.website, country: candidate.country },
        commercial: { customer_segments: candidate.customer_segments, services: candidate.services, partner_types: candidate.partner_types },
        intelligence: { discovery_fit_score: candidate.fit_score, qualification_score: candidate.qualification_score, qualification_status: candidate.qualification_status, reasons: candidate.qualification_reasons, concerns: candidate.concerns, evidence: candidate.evidence, apollo_company: apolloOrg || null },
        people: [],
        recommended_action: { action: 'configure_contact_enrichment', rationale: 'Company research is ready. Contact enrichment is unavailable, so PortAi will not spend or invent contact data.' },
        status: 'contacts_researched'
      }, { onConflict: 'mission_id,candidate_id' })
    }
  }

  const dossierCount = await supabase.from('mission_dossiers').select('id', { count: 'exact', head: true }).eq('mission_id', id)
  const usage = await supabase.from('mission_external_usage').select('credits_consumed').eq('mission_id', id)
  const apolloCreditsConsumed = (usage.data || []).reduce((sum, row) => sum + Number(row.credits_consumed || 0), 0)
  await supabase.from('missions').update({
    current_stage: 'contacts_researched',
    status: 'running',
    result_summary: { ...(mission.data.result_summary || {}), contacts_found: selected.length, dossiers_completed: dossierCount.count || 0, selected_for_research: candidates.length, apollo_credits_consumed: apolloCreditsConsumed, contact_enrichment_status: apolloAvailable ? 'completed' : 'unavailable', contact_enrichment_error: apolloAvailable ? null : apolloError }
  }).eq('id', id)

  return NextResponse.json({
    missionId: id,
    candidates: candidates.length,
    contactsFound: selected.length,
    dossiersCompleted: dossierCount.count || 0,
    apollo: { available: apolloAvailable, companyEnrichment: apolloAvailable ? domains.length : 0, peopleSearch: selected.length, peopleEnrichment: selected.length, creditsConsumed: apolloCreditsConsumed, error: apolloAvailable ? null : apolloError }
  })
}