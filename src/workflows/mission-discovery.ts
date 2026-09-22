import { createClient } from '@supabase/supabase-js'
import { runPartnerDiscovery } from '@/agents/partner-discovery/runner'
import type { PartnerDiscoveryRequest } from '@/agents/partner-discovery/types'

type MissionDiscoveryInput = {
  runId: string
  missionId: string
  userId: string
  discoveryRequest: PartnerDiscoveryRequest
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase service credentials are not configured for durable mission workflows.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function missionDiscoveryWorkflow(input: MissionDiscoveryInput) {
  'use workflow'
  return executeMissionDiscovery(input)
}

async function executeMissionDiscovery(input: MissionDiscoveryInput) {
  'use step'
  const supabase = getServiceClient()
  try {
    const report = await runPartnerDiscovery(input.discoveryRequest, {
      onProgress: async (progress) => {
        await supabase.from('discovery_runs').update({
          discovered_count: progress.discovered,
          researched_count: progress.researched,
          returned_count: progress.qualified + progress.needsReview,
          error_message: progress.message,
        }).eq('id', input.runId)
        await supabase.from('missions').update({
          status: 'running',
          current_stage: progress.stage === 'discovering' ? 'discovering' : progress.stage === 'researching' ? 'researching' : progress.stage === 'qualifying' ? 'scored' : 'dossier_ready',
          candidate_count: progress.discovered,
          result_summary: {
            discovered: progress.discovered,
            researched: progress.researched,
            qualified: progress.qualified,
            needs_review: progress.needsReview,
            progress_message: progress.message,
          },
          error_message: null,
        }).eq('id', input.missionId)
      },
    })

    const selected = new Set(report.finalRankedCandidates.map((item) => item.candidate.website))
    const rows = report.researchedCandidates.map((item) => ({
      discovery_run_id: input.runId,
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
      rank: selected.has(item.candidate.website) ? report.finalRankedCandidates.findIndex((selectedItem) => selectedItem.candidate.website === item.candidate.website) + 1 : null,
    }))

    if (rows.length) {
      const { error } = await supabase.from('discovery_candidates').insert(rows)
      if (error) throw error
    }

    const allQualified = report.researchedCandidates.filter((item) => item.qualification.status === 'qualified').length
    const allReview = report.researchedCandidates.filter((item) => item.qualification.status === 'needs_review').length
    await supabase.from('missions').update({
      discovery_run_id: input.runId,
      status: 'running',
      current_stage: report.finalRankedCandidates.length ? 'dossier_ready' : 'scored',
      candidate_count: report.candidatesDiscovered,
      result_summary: {
        discovered: report.candidatesDiscovered,
        researched: report.candidatesResearched,
        qualified: allQualified,
        needs_review: allReview,
        selected: report.finalRankedCandidates.length,
        requested: report.request.desiredCandidateCount,
      },
      completed_at: null,
      error_message: null,
    }).eq('id', input.missionId)

    await supabase.from('discovery_runs').update({
      status: 'completed',
      search_queries: report.searchQueries,
      discovered_count: report.candidatesDiscovered,
      researched_count: report.candidatesResearched,
      returned_count: report.finalRankedCandidates.length,
      error_message: null,
      completed_at: new Date().toISOString(),
    }).eq('id', input.runId)

    return { selected: report.finalRankedCandidates.length, researched: report.candidatesResearched, discovered: report.candidatesDiscovered }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discovery failed.'
    await supabase.from('discovery_runs').update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() }).eq('id', input.runId)
    await supabase.from('missions').update({ status: 'failed', current_stage: 'failed', error_message: message, discovery_run_id: input.runId }).eq('id', input.missionId)
    throw error
  }
}
