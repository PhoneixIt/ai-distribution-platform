import { inngest } from './client'
import { createAdminClient } from '@/lib/supabase/admin'
import { runPartnerDiscovery } from '@/agents/partner-discovery/runner'
import { createMissionDossierRecord, type DiscoveryCandidateForDossier } from '@/lib/missions/dossiers'
import type { PartnerDiscoveryRequest } from '@/agents/partner-discovery/types'
import {
  buildDiscoveryRunCompletionUpdate,
  persistDiscoveryWorkflowFailure,
  resolveDiscoveryRunGuard,
} from './discovery-run-state'

const MAX_CANDIDATES = 200

export const missionDiscoveryWorkflow = inngest.createFunction(
  {
    id: 'portai-mission-discovery',
    triggers: { event: 'portai/mission.workflow.started' },
    retries: 2,
    concurrency: 1,
    rateLimit: { limit: 1, period: '10s' },
    // Runs after the final retry is exhausted so a failed discovery can never be
    // left stranded in `running`. The original error is persisted, not swallowed.
    onFailure: async ({ event, error }) => {
      const originalEvent = event.data.event.data as {
        missionId?: string
        discoveryRunId?: string
      }
      const missionId = originalEvent?.missionId
      const discoveryRunId = originalEvent?.discoveryRunId

      if (!missionId || !discoveryRunId) {
        throw new Error(
          'Discovery workflow failure payload is missing missionId or discoveryRunId.'
        )
      }

      await persistDiscoveryWorkflowFailure(createAdminClient(), {
        missionId,
        discoveryRunId,
        error,
      })
    },
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

    // Production only allows running | completed | partial | failed. The API creates the
    // run as `running` before emitting the event, so `running` and `partial` are ACTIVE
    // states this workflow must still process. Treating `running` as terminal made every
    // API-created run return before `execute-discovery`. Only completed/failed are skipped.
    const guard = resolveDiscoveryRunGuard(run.status)

    if (guard === 'already_completed') {
      return { status: 'already_completed', discoveryRunId }
    }

    if (guard === 'already_failed') {
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

    const completion = await step.run('update-mission-and-run', async () => {
      const completionUpdate = buildDiscoveryRunCompletionUpdate({
        discoveryRunId,
        report,
        completedAt: new Date().toISOString(),
      })

      const missionUpdate = await supabase
        .from('missions')
        .update(completionUpdate.mission)
        .eq('id', missionId)

      if (missionUpdate.error) throw missionUpdate.error

      const runUpdate = await supabase
        .from('discovery_runs')
        .update(completionUpdate.run)
        .eq('id', discoveryRunId)

      if (runUpdate.error) throw runUpdate.error

      return {
        qualifiedCount: completionUpdate.qualifiedCount,
        needsReviewCount: completionUpdate.needsReviewCount,
        missionStage: completionUpdate.missionStage,
      }
    })

    return {
      status: 'completed',
      discoveryRunId,
      missionId,
      candidatesDiscovered: report.candidatesDiscovered,
      qualifiedCount: completion.qualifiedCount,
      needsReviewCount: completion.needsReviewCount,
      missionStage: completion.missionStage,
    }
  }
)

export const functions = [missionDiscoveryWorkflow]
