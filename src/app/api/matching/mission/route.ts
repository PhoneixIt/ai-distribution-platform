import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type Mission = {
  id: string
  objective: string
  vendor_name: string | null
  product_name: string | null
  country: string | null
  partner_types: string[]
  technology_focus: string | null
  customer_segment: string | null
  status: string
  current_stage: string
  candidate_count: number
  discovery_run_id: string | null
  result_summary: Record<string, unknown>
}

type Candidate = {
  id: string
  company_name: string
  website: string | null
  country: string | null
  description: string | null
  partner_types: string[]
  technologies: string[]
  customer_segments: string[]
  services: string[]
  vendor_partnerships: string[]
  certifications: string[]
  fit_score: number
  qualification_score: number
  qualification_status: string
  qualification_reasons: string[]
  concerns: string[]
  research_status: string
  research_confidence: number
  evidence: unknown[]
  rank: number
}

function normalize(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => normalize(item))
  if (typeof value === 'string') return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
  return []
}

function overlaps(requested: string[], available: string[]) {
  return requested.some((need) => available.some((value) => value === need || value.includes(need) || need.includes(value)))
}

function scoreMissionCandidate(mission: Mission, candidate: Candidate) {
  const technologyNeeds = normalize(mission.technology_focus)
  const partnerNeeds = normalize(mission.partner_types)
  const countryNeed = normalize(mission.country)
  const segmentNeed = normalize(mission.customer_segment)

  const candidateTechnology = normalize([
    ...candidate.technologies,
    ...candidate.services,
    ...candidate.certifications,
    candidate.description || '',
  ])
  const candidatePartnerTypes = normalize(candidate.partner_types)
  const candidateCountry = normalize(candidate.country)
  const candidateSegments = normalize(candidate.customer_segments)

  const technologyFit = technologyNeeds.length ? (overlaps(technologyNeeds, candidateTechnology) ? 100 : 0) : 50
  const partnerFit = partnerNeeds.length ? (overlaps(partnerNeeds, candidatePartnerTypes) ? 100 : 0) : 50
  const geographyFit = countryNeed.length ? (overlaps(countryNeed, candidateCountry) ? 100 : 0) : 50
  const segmentFit = segmentNeed.length ? (overlaps(segmentNeed, candidateSegments) ? 100 : 0) : 50
  const evidenceFit = Math.min(100, Math.round((Number(candidate.research_confidence || 0) * 70) + (candidate.evidence?.length ? 30 : 0)))

  const matchScore = Math.round(
    technologyFit * 0.30 +
    partnerFit * 0.30 +
    geographyFit * 0.20 +
    segmentFit * 0.10 +
    evidenceFit * 0.10,
  )

  const strengths: string[] = []
  const risks: string[] = []
  if (technologyFit >= 70) strengths.push('Technology aligns with the mission')
  else if (technologyNeeds.length) risks.push('Technology alignment is not confirmed')
  if (partnerFit >= 70) strengths.push('Requested partner type is supported')
  else if (partnerNeeds.length) risks.push('Requested partner type is not confirmed')
  if (geographyFit >= 70) strengths.push('Geography aligns with the mission')
  else if (countryNeed.length) risks.push('Geographic coverage is not confirmed')
  if (segmentFit >= 70) strengths.push('Customer segment aligns')
  else if (segmentNeed.length) risks.push('Customer segment fit is not confirmed')
  if (candidate.research_status === 'researched') strengths.push('Research completed with supporting evidence')
  else risks.push('Research is incomplete')

  const recommendedAction =
    matchScore >= 80 ? 'Prioritize this candidate for review and engagement.' :
    matchScore >= 60 ? 'Review the evidence before deciding on engagement.' :
    'Keep as a lower-priority candidate until additional evidence is available.'

  return {
    candidate,
    matchScore,
    technologyFit,
    partnerFit,
    geographyFit,
    segmentFit,
    evidenceFit,
    strengths,
    risks,
    recommendedAction,
  }
}

async function getWorkspace() {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return { supabase: null, user: null, orgId: null, response: NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 }) }
  }
  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (membershipError || !membership?.org_id) {
    return { supabase: null, user: null, orgId: null, response: NextResponse.json({ error: 'Workspace not found.' }, { status: 403 }) }
  }
  return { supabase, user, orgId: membership.org_id, response: null }
}

export async function GET() {
  const { supabase, orgId, response } = await getWorkspace()
  if (response || !supabase || !orgId) return response

  const { data, error } = await supabase
    .from('missions')
    .select('id,objective,vendor_name,product_name,country,partner_types,technology_focus,customer_segment,status,current_stage,candidate_count,discovery_run_id,result_summary')
    .eq('org_id', orgId)
    .gt('candidate_count', 0)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ missions: (data || []) as Mission[] })
}

export async function POST(request: Request) {
  const { supabase, user, orgId, response } = await getWorkspace()
  if (response || !supabase || !orgId || !user) return response

  let missionId = ''
  try {
    const body = await request.json()
    missionId = String(body?.missionId || '').trim()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (!missionId) return NextResponse.json({ error: 'Mission ID is required.' }, { status: 400 })

  const { data: missionData, error: missionError } = await supabase
    .from('missions')
    .select('id,objective,vendor_name,product_name,country,partner_types,technology_focus,customer_segment,status,current_stage,candidate_count,discovery_run_id,result_summary')
    .eq('id', missionId)
    .eq('org_id', orgId)
    .single()

  if (missionError || !missionData) return NextResponse.json({ error: missionError?.message || 'Mission not found.' }, { status: 404 })

  const mission = missionData as Mission
  if (!mission.discovery_run_id) {
    return NextResponse.json({ error: 'This mission has no discovery run yet. Run discovery first.' }, { status: 409 })
  }

  const startedAt = new Date().toISOString()
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      org_id: orgId,
      initiated_by: user.id,
      objective: 'AI matching: ' + mission.objective,
      status: 'running',
      provider: 'deterministic',
      model: 'mission-matching-v1',
      metadata: { mission_id: mission.id, discovery_run_id: mission.discovery_run_id },
      started_at: startedAt,
    })
    .select('id')
    .single()

  if (runError || !run) return NextResponse.json({ error: runError?.message || 'Could not create matching run.' }, { status: 500 })

  try {
    const { data: candidates, error: candidateError } = await supabase
      .from('discovery_candidates')
      .select('id,company_name,website,country,description,partner_types,technologies,customer_segments,services,vendor_partnerships,certifications,fit_score,qualification_score,qualification_status,qualification_reasons,concerns,research_status,research_confidence,evidence,rank')
      .eq('discovery_run_id', mission.discovery_run_id)
      .order('rank', { ascending: true })
      .limit(500)

    if (candidateError) throw candidateError

    const scored = ((candidates || []) as Candidate[])
      .map((candidate) => scoreMissionCandidate(mission, candidate))
      .sort((left, right) =>
        right.matchScore - left.matchScore ||
        right.candidate.qualification_score - left.candidate.qualification_score ||
        right.candidate.fit_score - left.candidate.fit_score ||
        left.candidate.company_name.localeCompare(right.candidate.company_name),
      )
      .slice(0, 50)

    const matchSummary = {
      match_run_id: run.id,
      match_completed_at: new Date().toISOString(),
      match_candidates: scored.length,
      high_fit: scored.filter((item) => item.matchScore >= 80).length,
      review: scored.filter((item) => item.matchScore >= 60 && item.matchScore < 80).length,
      low_fit: scored.filter((item) => item.matchScore < 60).length,
    }

    const resultSummary = { ...(mission.result_summary || {}), ...matchSummary }
    const missionUpdate = await supabase
      .from('missions')
      .update({ result_summary: resultSummary, ai_run_id: run.id })
      .eq('id', mission.id)
      .eq('org_id', orgId)
    if (missionUpdate.error) throw missionUpdate.error

    const avgConfidence = scored.length
      ? scored.reduce((sum, item) => sum + item.matchScore, 0) / scored.length / 100
      : 0

    await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        summary: matchSummary,
        confidence: avgConfidence,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    return NextResponse.json({
      missionId: mission.id,
      runId: run.id,
      objective: mission.objective,
      matched: scored.length,
      summary: matchSummary,
      matches: scored.map((item, index) => ({
        rank: index + 1,
        company: {
          id: item.candidate.id,
          name: item.candidate.company_name,
          website: item.candidate.website,
          country: item.candidate.country,
          description: item.candidate.description,
        },
        matchScore: item.matchScore,
        technologyFit: item.technologyFit,
        partnerFit: item.partnerFit,
        geographyFit: item.geographyFit,
        segmentFit: item.segmentFit,
        evidenceFit: item.evidenceFit,
        qualificationStatus: item.candidate.qualification_status,
        researchStatus: item.candidate.research_status,
        researchConfidence: item.candidate.research_confidence,
        strengths: item.strengths,
        risks: item.risks,
        reasons: item.candidate.qualification_reasons,
        concerns: item.candidate.concerns,
        evidence: item.candidate.evidence,
        recommendedAction: item.recommendedAction,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Matching failed.')
    await supabase
      .from('agent_runs')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', run.id)
    return NextResponse.json({ runId: run.id, error: message }, { status: 500 })
  }
}
