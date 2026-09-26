import { inngest } from './client'
import { createAdminClient } from '@/lib/supabase/admin'
import { runPartnerDiscovery } from '@/agents/partner-discovery/runner'
import { createMissionDossierRecord, type DiscoveryCandidateForDossier } from '@/lib/missions/dossiers'
import type { PartnerDiscoveryRequest } from '@/agents/partner-discovery/types'

const MAX_CANDIDATES = 200

export const missionDiscoveryWorkflow = inngest.createFunction(
  {
    id: 'portai-mission-discovery',
    triggers: { event: 'portai/mission.workflow.started' },
    retries: 2,
    concurrency: 1,
    rateLimit: { limit: 1, period: '10s' },
  },
  async ({ event, step }) => {
    const { missionId, discoveryRunId } = event.data

    const supabase = createAdminClient()

    const run = await step.run('verify-run-status', async () => {
      const { data: runData, error } = await supabase
        .from('discovery_runs')
        .select('id,status,user_id')
        .eq('id', discoveryRunId)
        .maybeSingle()

      if (error) throw error
      if (!runData) throw new Error(`Discovery run ${discoveryRunId} not found.`)
      return runData
    })

    if (run.status === 'completed') {
      return { status: 'already_completed', discoveryRunId }
    }

    if (run.status === 'running') {
      return { status: 'already_running', discoveryRunId }
    }

    if (run.status === 'failed') {
      return { status: 'already_failed', discoveryRunId }
    }

    await step.run('mark-running', async () => {
      const { error } = await supabase
        .from('discovery_runs')
        .update({ status: 'running' })
        .eq('id', discoveryRunId)

      if (error) throw error
    })

    await step.run('mark-mission-running', async () => {
      const { error } = await supabase
        .from('missions')
        .update({
          status: 'running',
          current_stage: 'discovering',
          error_message: null,
        })
        .eq('id', missionId)

      if (error) throw error
    })

    const report = await step.run('execute-discovery', async () => {
      const { data: runData } = await supabase
        .from('discovery_runs')
        .select('request')
        .eq('id', discoveryRunId)
        .maybeSingle()

      if (!runData?.request) {
        throw new Error('Discovery request not found in discovery_runs record.')
      }

      const request = runData.request as Record<string, unknown>
      const desiredCandidateCount = Math.min(
        MAX_CANDIDATES,
        Math.max(1, Number(request.desiredCandidateCount) || 10)
      )

      return runPartnerDiscovery({
        ...request,
        desiredCandidateCount,
      } as PartnerDiscoveryRequest)
    })

    await step.run('persist-candidates', async () => {
      const rows = report.finalRankedCandidates.map((item, index) => ({
        discovery_run_id: discoveryRunId,
        company_name: item.candidate.companyName,
        website: item.candidate.website || null,
        company_type: item.candidate.partnerTypes.some((type: string) => /distributor/i.test(type)) ? 'distributor' : 'partner',
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

      if (rows.length) {
        const { data: insertedCandidates, error: candidateError } = await supabase
          .from('discovery_candidates')
          .insert(rows)
          .select('id,website,company_name,qualification_status')

        if (candidateError) throw candidateError
        if (insertedCandidates.length !== rows.length) {
          throw new Error(
            `Candidate persistence incomplete (${insertedCandidates.length}/${rows.length}).`
          )
        }
      }
    })

    await step.run('create-dossiers-if-mission', async () => {
      const { data: missionData } = await supabase
        .from('missions')
        .select('id,org_id')
        .eq('id', missionId)
        .maybeSingle()

      if (!missionData) return null

      const { data: savedCandidates } = await supabase
        .from('discovery_candidates')
        .select('id,company_name,website,country,customer_segments,services,partner_types,fit_score,qualification_score,qualification_status,qualification_reasons,concerns,evidence')
        .eq('discovery_run_id', discoveryRunId)
        .eq('qualification_status', 'qualified')
        .order('rank', { ascending: true })

      if (!savedCandidates?.length) return null

      const dossierRows = savedCandidates.map((candidate) =>
        createMissionDossierRecord(missionData.org_id, missionId, candidate as DiscoveryCandidateForDossier)
      )

      const { data: dossierData, error: dossierError } = await supabase
        .from('mission_dossiers')
        .upsert(dossierRows, { onConflict: 'mission_id,candidate_id' })
        .select('id,candidate_id')

      if (dossierError) throw dossierError
      if (dossierData.length !== savedCandidates.length) {
        throw new Error('Dossier persistence incomplete.')
      }

      return dossierData
    })

    const qualifiedCount = report.candidatesQualified.length
    const needsReviewCount = report.candidatesNeedingReview.length
    const missionStage = qualifiedCount >= 1 ? 'dossier_ready' : 'scored'

    await step.run('update-mission-and-run', async () => {
      const missionUpdate = await supabase
        .from('missions')
        .update({
          discovery_run_id: discoveryRunId,
          status: 'running',
          current_stage: missionStage,
          candidate_count: report.finalRankedCandidates.length,
          result_summary: {
            discovered: report.candidatesDiscovered,
            researched: report.candidatesResearched,
            research_failed: report.candidatesResearchFailed,
            verified: report.finalRankedCandidates.filter(
              (item: { candidate: { researchStatus: string } }) => item.candidate.researchStatus === 'researched'
            ).length,
            returned: report.finalRankedCandidates.length,
            qualified: qualifiedCount,
            needs_review: needsReviewCount,
            selected: 0,
          },
          completed_at: null,
        })
        .eq('id', missionId)

      if (missionUpdate.error) throw missionUpdate.error

      const runUpdate = await supabase
        .from('discovery_runs')
        .update({
          status: 'completed',
          search_queries: report.searchQueries,
          discovered_count: report.candidatesDiscovered,
          researched_count: report.candidatesResearched,
          returned_count: report.finalRankedCandidates.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', discoveryRunId)

      if (runUpdate.error) throw runUpdate.error
    })

    return {
      status: 'completed',
      discoveryRunId,
      missionId,
      candidatesDiscovered: report.candidatesDiscovered,
      qualifiedCount,
    }
  }
)

export const functions = [missionDiscoveryWorkflow]
