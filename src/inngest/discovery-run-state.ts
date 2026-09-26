import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Production `discovery_runs.status` only allows: running | completed | partial | failed.
 *
 * The API always creates a run as `running` before emitting the Inngest event, so
 * `running` and `partial` are ACTIVE states that this workflow must still process.
 * Only states that have already reached a terminal outcome are skipped.
 */
export type DiscoveryRunGuard = 'proceed' | 'already_completed' | 'already_failed'

export function resolveDiscoveryRunGuard(status: string): DiscoveryRunGuard {
  if (status === 'completed') return 'already_completed'
  if (status === 'failed') return 'already_failed'
  return 'proceed'
}

const MAX_ERROR_MESSAGE_LENGTH = 2000

function toErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown discovery failure.'

  return `Discovery workflow failed: ${message}`.slice(0, MAX_ERROR_MESSAGE_LENGTH)
}

export type DiscoveryWorkflowStateUpdate = Record<string, unknown>

export type DiscoveryWorkflowFailureUpdate = {
  run: DiscoveryWorkflowStateUpdate
  mission: DiscoveryWorkflowStateUpdate
  errorMessage: string
}

export function buildDiscoveryWorkflowFailureUpdate(
  error: unknown,
  completedAt: string
): DiscoveryWorkflowFailureUpdate {
  const errorMessage = toErrorMessage(error)

  return {
    run: { status: 'failed', error_message: errorMessage, completed_at: completedAt },
    mission: { status: 'failed', current_stage: 'failed', error_message: errorMessage },
    errorMessage,
  }
}

/**
 * Persists a terminal discovery failure for a workflow that exhausted its retries.
 * Uses the existing production columns only; adds no schema.
 * Database errors are rethrown so the original failure is never swallowed.
 */
export async function persistDiscoveryWorkflowFailure(
  supabase: SupabaseClient,
  params: { missionId: string; discoveryRunId: string; error: unknown; completedAt?: string }
): Promise<DiscoveryWorkflowFailureUpdate> {
  const { missionId, discoveryRunId, error } = params
  const update = buildDiscoveryWorkflowFailureUpdate(
    error,
    params.completedAt ?? new Date().toISOString()
  )

  const runUpdate = await supabase.from('discovery_runs').update(update.run).eq('id', discoveryRunId)
  if (runUpdate.error) throw runUpdate.error

  const missionUpdate = await supabase.from('missions').update(update.mission).eq('id', missionId)
  if (missionUpdate.error) throw missionUpdate.error

  return update
}

export type DiscoveryCompletionReport = {
  searchQueries: string[]
  candidatesDiscovered: number
  candidatesResearched: number
  candidatesResearchFailed: number
  candidatesQualified: unknown[]
  candidatesNeedingReview: unknown[]
  finalRankedCandidates: Array<{ candidate: { researchStatus: string } }>
}

export type DiscoveryRunCompletionUpdate = {
  mission: DiscoveryWorkflowStateUpdate
  run: DiscoveryWorkflowStateUpdate
  missionStage: 'dossier_ready' | 'scored'
  qualifiedCount: number
  needsReviewCount: number
}

export function buildDiscoveryRunCompletionUpdate(params: {
  discoveryRunId: string
  report: DiscoveryCompletionReport
  completedAt: string
}): DiscoveryRunCompletionUpdate {
  const { discoveryRunId, report, completedAt } = params
  const qualifiedCount = report.candidatesQualified.length
  const needsReviewCount = report.candidatesNeedingReview.length
  const missionStage = qualifiedCount >= 1 ? 'dossier_ready' : 'scored'

  return {
    missionStage,
    qualifiedCount,
    needsReviewCount,
    mission: {
      discovery_run_id: discoveryRunId,
      status: 'running',
      current_stage: missionStage,
      candidate_count: report.finalRankedCandidates.length,
      result_summary: {
        discovered: report.candidatesDiscovered,
        researched: report.candidatesResearched,
        research_failed: report.candidatesResearchFailed,
        verified: report.finalRankedCandidates.filter(
          (item) => item.candidate.researchStatus === 'researched'
        ).length,
        returned: report.finalRankedCandidates.length,
        qualified: qualifiedCount,
        needs_review: needsReviewCount,
        selected: 0,
      },
      completed_at: null,
    },
    run: {
      status: 'completed',
      search_queries: report.searchQueries,
      discovered_count: report.candidatesDiscovered,
      researched_count: report.candidatesResearched,
      returned_count: report.finalRankedCandidates.length,
      completed_at: completedAt,
    },
  }
}
