import { NextResponse } from 'next/server'
import { runPartnerDiscovery } from '@/agents/partner-discovery/runner'
import type { PartnerDiscoveryRequest } from '@/agents/partner-discovery/types'
import { createMissionDossierRecord, getDiscoveryMissionStage } from '@/lib/missions/dossiers'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

const MAX_CANDIDATES = 100

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
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: authError?.message || 'Authentication is unavailable.' }, { status: 401 })
  }

  if (!process.env.EXA_API_KEY && !process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json({ error: 'No web discovery provider is configured on the server.' }, { status: 503 })
  }

  let input: Partial<PartnerDiscoveryRequest>
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const missionId = typeof (input as Record<string, unknown>).missionId === 'string' ? String((input as Record<string, unknown>).missionId).trim() : ''
  const discoveryRequest = normalizeRequest(input)
  if (!discoveryRequest.country || !discoveryRequest.technologyFocus) return NextResponse.json({ error: 'Country and technology focus are required.' }, { status: 400 })
  if (!discoveryRequest.partnerTypes.length) return NextResponse.json({ error: 'At least one partner type is required.' }, { status: 400 })

  let mission: { id: string; org_id: string } | null = null
  if (missionId) {
    const missionResult = await supabase
      .from('missions')
      .select('id,org_id,status,current_stage')
      .eq('id', missionId)
      .maybeSingle()
    if (missionResult.error) return NextResponse.json({ error: missionResult.error.message }, { status: 500 })
    if (!missionResult.data) return NextResponse.json({ error: 'Mission was not found in this workspace.' }, { status: 404 })
    mission = { id: missionResult.data.id, org_id: missionResult.data.org_id }
  }

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

  if (mission) {
    const missionUpdate = await supabase
      .from('missions')
      .update({ status: 'running', current_stage: 'discovering', error_message: null })
      .eq('id', mission.id)
    if (missionUpdate.error) return NextResponse.json({ error: missionUpdate.error.message }, { status: 500 })
  }

  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .insert({ user_id: user.id, request: discoveryRequest, provider: 'exa+firecrawl', status: 'running' })
    .select('id')
    .single()

  if (runError || !run) {
    if (mission) {
      const failureUpdate = await supabase.from('missions').update({ status: 'failed', current_stage: 'failed', error_message: runError?.message || 'Could not create discovery run.' }).eq('id', mission.id)
      if (failureUpdate.error) console.error('Failed to mark mission after discovery run creation error.', { missionId: mission.id, error: failureUpdate.error })
    }
    return NextResponse.json({ error: runError?.message || 'Could not create discovery run.' }, { status: 500 })
  }

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

    let savedCandidates: Array<{ id: string; website: string | null; company_name: string; qualification_status: string }> = []
    if (rows.length) {
      const { data: insertedCandidates, error: candidateError } = await supabase
        .from('discovery_candidates')
        .insert(rows)
        .select('id,website,company_name,qualification_status')
      if (candidateError) throw candidateError
      savedCandidates = insertedCandidates || []
      if (savedCandidates.length !== rows.length) {
        throw new Error(`Discovery candidate persistence was incomplete (${savedCandidates.length}/${rows.length} rows returned).`)
      }
    }

    let dossierCandidateIds: string[] = []
    let persistedDossierCandidateIds: string[] = []
    if (mission) {
      const qualifiedCandidates = savedCandidates.filter((candidate) => candidate.qualification_status === 'qualified')
      dossierCandidateIds = qualifiedCandidates.map((candidate) => candidate.id)

      if (qualifiedCandidates.length) {
        const candidatesForDossiers = await supabase
          .from('discovery_candidates')
          .select('id,company_name,website,country,customer_segments,services,partner_types,fit_score,qualification_score,qualification_status,qualification_reasons,concerns,evidence')
          .eq('discovery_run_id', run.id)
          .eq('qualification_status', 'qualified')
          .order('rank', { ascending: true })
        if (candidatesForDossiers.error) throw candidatesForDossiers.error
        if ((candidatesForDossiers.data || []).length !== qualifiedCandidates.length) {
          throw new Error(`Could not verify all qualified discovery candidates (${(candidatesForDossiers.data || []).length}/${qualifiedCandidates.length} rows found).`)
        }

        const dossierRows = (candidatesForDossiers.data || []).map((candidate) => createMissionDossierRecord(mission.org_id, mission.id, candidate))
        const dossierWrite = await supabase
          .from('mission_dossiers')
          .upsert(dossierRows, { onConflict: 'mission_id,candidate_id' })
          .select('id,candidate_id')
        if (dossierWrite.error) throw dossierWrite.error

        persistedDossierCandidateIds = (dossierWrite.data || []).map((dossier) => dossier.candidate_id)
        if (persistedDossierCandidateIds.length !== dossierCandidateIds.length || dossierCandidateIds.some((id) => !persistedDossierCandidateIds.includes(id))) {
          throw new Error(`Dossier persistence was incomplete (${persistedDossierCandidateIds.length}/${dossierCandidateIds.length} rows returned).`)
        }
      }
    }

    const missionStage = mission
      ? getDiscoveryMissionStage(dossierCandidateIds, persistedDossierCandidateIds)
      : null

    const runUpdate = await supabase.from('discovery_runs').update({
      status: 'completed',
      search_queries: report.searchQueries,
      discovered_count: report.candidatesDiscovered,
      researched_count: report.candidatesResearched,
      returned_count: report.finalRankedCandidates.length,
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
    if (runUpdate.error) throw runUpdate.error

    if (mission) {
      const missionUpdate = await supabase.from('missions').update({
        discovery_run_id: run.id,
        status: 'running',
        current_stage: missionStage,
        candidate_count: report.finalRankedCandidates.length,
        result_summary: {
          discovered: report.candidatesDiscovered,
          researched: report.candidatesResearched,
          returned: report.finalRankedCandidates.length,
          qualified: report.candidatesQualified.length,
          needs_review: report.candidatesNeedingReview.length,
        },
        completed_at: null,
      }).eq('id', mission.id)
      if (missionUpdate.error) throw missionUpdate.error
    }

    const candidateIdsByWebsite = new Map(savedCandidates.map((item) => [item.website, item.id]))
    const finalRankedCandidates = report.finalRankedCandidates.map((item) => ({
      ...item,
      candidateId: candidateIdsByWebsite.get(item.candidate.website) || null,
    }))

    return NextResponse.json({ missionId: mission?.id || null, runId: run.id, missionStage, dossiersCreated: dossierCandidateIds.length, report: { ...report, finalRankedCandidates } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Discovery failed.')
    console.error('Mission discovery failed before all workflow data was persisted.', { missionId: mission?.id || null, runId: run.id, error })
    const runFailureUpdate = await supabase.from('discovery_runs').update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() }).eq('id', run.id)
    if (runFailureUpdate.error) console.error('Failed to mark discovery run as failed.', { runId: run.id, error: runFailureUpdate.error })
    if (mission) {
      const missionFailureUpdate = await supabase.from('missions').update({ status: 'failed', current_stage: 'failed', error_message: message, discovery_run_id: run.id }).eq('id', mission.id)
      if (missionFailureUpdate.error) console.error('Failed to mark mission as failed.', { missionId: mission.id, error: missionFailureUpdate.error })
    }
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

