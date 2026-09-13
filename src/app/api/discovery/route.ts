import { NextResponse } from 'next/server'
import { runPartnerDiscovery } from '@/agents/partner-discovery/runner'
import type { PartnerDiscoveryRequest } from '@/agents/partner-discovery/types'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

const MAX_CANDIDATES = 25

function normalizeRequest(input: Partial<PartnerDiscoveryRequest>): PartnerDiscoveryRequest {
  const partnerTypes = Array.isArray(input.partnerTypes)
    ? input.partnerTypes.map((value) => String(value).trim()).filter(Boolean)
    : []

  return {
    country: String(input.country || '').trim(),
    market: input.market ? String(input.market).trim() : undefined,
    partnerTypes,
    technologyFocus: String(input.technologyFocus || '').trim(),
    industry: input.industry ? String(input.industry).trim() : undefined,
    customerSegment: input.customerSegment ? String(input.customerSegment).trim() : undefined,
    serviceOrCapability: input.serviceOrCapability ? String(input.serviceOrCapability).trim() : undefined,
    vendorPartnership: input.vendorPartnership ? String(input.vendorPartnership).trim() : undefined,
    certification: input.certification ? String(input.certification).trim() : undefined,
    companySize: input.companySize ? String(input.companySize).trim() : undefined,
    desiredCandidateCount: Math.min(MAX_CANDIDATES, Math.max(1, Number(input.desiredCandidateCount) || 10)),
  }
}

export async function POST(request: Request) {
  if (!process.env.EXA_API_KEY) return NextResponse.json({ error: 'EXA_API_KEY is not configured on the server.' }, { status: 503 })

  let input: Partial<PartnerDiscoveryRequest>
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const discoveryRequest = normalizeRequest(input)
  if (!discoveryRequest.country || !discoveryRequest.technologyFocus) return NextResponse.json({ error: 'Country and technology focus are required.' }, { status: 400 })
  if (!discoveryRequest.partnerTypes.length) return NextResponse.json({ error: 'At least one partner type is required.' }, { status: 400 })

  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user) return NextResponse.json({ error: authError?.message || 'Authentication is unavailable.' }, { status: 401 })

  const { data: recentRun } = await supabase
    .from('discovery_runs')
    .select('id,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentRun && Date.now() - new Date(recentRun.created_at).getTime() < 60_000) {
    return NextResponse.json({ error: 'Please wait about one minute before starting another discovery run.' }, { status: 429 })
  }

  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .insert({ user_id: user.id, request: discoveryRequest, provider: 'exa', status: 'running' })
    .select('id')
    .single()

  if (runError || !run) return NextResponse.json({ error: runError?.message || 'Could not create discovery run.' }, { status: 500 })

  try {
    const report = await runPartnerDiscovery(discoveryRequest)
    const rows = report.finalRankedCandidates.map((item, index) => ({
      discovery_run_id: run.id,
      company_name: item.candidate.companyName,
      website: item.candidate.website || null,
      company_type: item.candidate.partnerTypes.some((type) => /distributor/i.test(type)) ? 'distributor' : 'partner',
      country: item.candidate.country || null,
      description: item.candidate.description || null,
      partner_types: item.candidate.partnerTypes,
      technologies: item.candidate.technologies,
      customer_segments: item.candidate.customerSegments,
      industries: item.candidate.industries,
      services: item.candidate.services,
      vendor_partnerships: item.candidate.vendorPartnerships,
      certifications: item.candidate.certifications,
      fit_score: item.candidate.fitScore,
      qualification_status: item.qualification.status,
      qualification_score: item.qualification.score,
      qualification_reasons: item.qualification.reasons,
      concerns: item.qualification.concerns,
      research_status: item.candidate.researchStatus,
      research_confidence: item.candidate.researchConfidence || 0,
      evidence: item.candidate.evidence,
      rank: index + 1,
    }))

    let savedCandidates: Array<{ id: string; website: string | null }> = []
    if (rows.length) {
      const { data: insertedCandidates, error: candidateError } = await supabase
        .from('discovery_candidates')
        .insert(rows)
        .select('id,website')
      if (candidateError) throw candidateError
      savedCandidates = insertedCandidates || []
    }

    await supabase.from('discovery_runs').update({
      status: 'completed',
      search_queries: report.searchQueries,
      discovered_count: report.candidatesDiscovered,
      researched_count: report.candidatesResearched,
      returned_count: report.finalRankedCandidates.length,
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)

    const candidateIdsByWebsite = new Map(savedCandidates.map((item) => [item.website, item.id]))
    const finalRankedCandidates = report.finalRankedCandidates.map((item) => ({
      ...item,
      candidateId: candidateIdsByWebsite.get(item.candidate.website) || null,
    }))

    return NextResponse.json({ runId: run.id, report: { ...report, finalRankedCandidates } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discovery failed.'
    await supabase.from('discovery_runs').update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() }).eq('id', run.id)
    return NextResponse.json({ runId: run.id, error: message }, { status: 500 })
  }
}

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedServerClient()
  if (error || !user) return NextResponse.json({ error: error?.message || 'Authentication is unavailable.' }, { status: 401 })

  const { data, error: queryError } = await supabase
    .from('discovery_runs')
    .select('id,request,status,provider,search_queries,discovered_count,researched_count,returned_count,created_at,completed_at,error_message')
    .order('created_at', { ascending: false })
    .limit(20)

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 })
  return NextResponse.json({ runs: data || [] })
}
