import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { pickBestContact, searchContacts } from '@/lib/hunter'

type Context = { params: Promise<{ id: string }> }

function domainFromWebsite(value: string | null) {
  if (!value) return null
  try {
    return new URL(value.startsWith('http') ? value : 'https://' + value).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export async function POST(_request: Request, context: Context) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

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

  if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 })
  if (!candidates?.length) {
    return NextResponse.json({ error: 'No qualified candidates are available for contact research.' }, { status: 409 })
  }

  const candidateDomains = candidates.map((candidate) => ({
    candidate,
    domain: domainFromWebsite(candidate.website),
  }))
  const domains = candidateDomains
    .map(({ domain }) => domain)
    .filter((value): value is string => Boolean(value))

  if (!domains.length) {
    return NextResponse.json({ error: 'No candidate websites can be researched for contacts.' }, { status: 409 })
  }

  let contactSearch: Awaited<ReturnType<typeof searchContacts>>
  try {
    contactSearch = await searchContacts(domains)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hunter contact search failed.'
    return NextResponse.json({
      error: 'Contact research is unavailable.',
      stage: 'contact_research',
      provider: 'hunter',
      reason: message,
      configured: Boolean(process.env.HUNTER_API_KEY),
    }, { status: 503 })
  }

  const byDomain = new Map(contactSearch.results.map((result) => [result.domain, result]))
  const selectedByCandidate = candidates.map((candidate) => {
    const domain = domainFromWebsite(candidate.website)
    const result = domain ? byDomain.get(domain) : undefined
    return {
      candidate,
      domain,
      contact: result ? pickBestContact(result.emails) : null,
    }
  })

  const contactCount = selectedByCandidate.filter((item) => Boolean(item.contact)).length

  const usageWrite = await supabase.from('mission_external_usage').insert({
    org_id: mission.data.org_id,
    mission_id: id,
    provider: 'hunter',
    operation: 'domain_search',
    entity_count: domains.length,
    estimated_credits: contactSearch.credits,
    credits_consumed: contactSearch.credits,
    created_by: user.id,
    metadata: {
      provider: 'hunter',
      domains_researched: domains.length,
      contacts_found: contactCount,
    },
  })
  if (usageWrite.error) return NextResponse.json({ error: usageWrite.error.message, stage: 'contact_research' }, { status: 500 })

  for (const item of selectedByCandidate) {
    const { candidate, contact } = item
    const dossier = {
      org_id: mission.data.org_id,
      mission_id: id,
      candidate_id: candidate.id,
      company: {
        name: candidate.company_name,
        website: candidate.website,
        country: candidate.country,
      },
      commercial: {
        customer_segments: candidate.customer_segments,
        services: candidate.services,
        partner_types: candidate.partner_types,
      },
      intelligence: {
        discovery_fit_score: candidate.fit_score,
        qualification_score: candidate.qualification_score,
        qualification_status: candidate.qualification_status,
        reasons: candidate.qualification_reasons,
        concerns: candidate.concerns,
        evidence: candidate.evidence,
      },
      people: contact ? [contact] : [],
      recommended_action: {
        action: 'review_contact_and_prepare_personalized_outreach',
        rationale: contact
          ? 'Candidate passed discovery qualification and a relevant professional contact was found by Hunter.'
          : 'Candidate passed discovery qualification, but no suitable professional contact was found by Hunter.',
      },
      status: 'contacts_researched',
    }

    const dossierWrite = await supabase
      .from('mission_dossiers')
      .upsert(dossier, { onConflict: 'mission_id,candidate_id' })

    if (dossierWrite.error) {
      return NextResponse.json({ error: dossierWrite.error.message, stage: 'contact_research' }, { status: 500 })
    }
  }

  const dossierCount = await supabase
    .from('mission_dossiers')
    .select('id', { count: 'exact', head: true })
    .eq('mission_id', id)

  if (dossierCount.error) return NextResponse.json({ error: dossierCount.error.message, stage: 'contact_research' }, { status: 500 })

  const usage = await supabase
    .from('mission_external_usage')
    .select('credits_consumed')
    .eq('mission_id', id)
    .eq('provider', 'hunter')

  if (usage.error) return NextResponse.json({ error: usage.error.message, stage: 'contact_research' }, { status: 500 })

  const hunterCreditsConsumed = (usage.data || []).reduce(
    (sum, row) => sum + Number(row.credits_consumed || 0),
    0,
  )

  const missionUpdate = await supabase
    .from('missions')
    .update({
      current_stage: 'contacts_researched',
      status: 'running',
      result_summary: {
        ...(mission.data.result_summary || {}),
        contacts_found: contactCount,
        dossiers_completed: dossierCount.count || 0,
        hunter_credits_consumed: hunterCreditsConsumed,
      },
    })
    .eq('id', id)

  if (missionUpdate.error) {
    return NextResponse.json({ error: missionUpdate.error.message, stage: 'contact_research' }, { status: 500 })
  }

  return NextResponse.json({
    missionId: id,
    candidates: candidates.length,
    contactsFound: contactCount,
    dossiersCompleted: dossierCount.count || 0,
    hunter: {
      domainsResearched: domains.length,
      contactsFound: contactCount,
      creditsConsumed: hunterCreditsConsumed,
    },
  })
}
