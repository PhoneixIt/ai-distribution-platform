/**
 * Mission result-summary enrichment.
 *
 * The durable discovery workflow (src/inngest/discovery-run-state.ts) is the system
 * of record for how a run performed. It records the width of the net:
 *
 *   discovered: 30   organizations found by the search providers
 *   researched: 27   of those that were fetched and read
 *   returned:    3   that were persisted as candidates
 *
 * `discovery_candidates` only ever holds the *persisted* rows, so counting those
 * rows answers "how many candidates were saved", not "how many were discovered".
 * Spreading a row count over the stored summary therefore replaced a truthful
 * `discovered: 30` with `discovered: 3`, and the mission page reported that the
 * system had discovered 3 organizations when it had discovered 30.
 *
 * The rule here: a fact the workflow recorded always wins. Row-derived counts fill
 * gaps for older rows that predate a given field, and are also published under an
 * explicit `candidates_` prefix so nothing is silently discarded.
 */

export type CandidateTally = {
  persisted: number
  verified: number
  qualified: number
  needs_review: number
  research_failed: number
}

export type TalliedCandidate = {
  discovery_run_id: string | null
  research_status: string | null
  qualification_status: string | null
}

/** Counts persisted candidate rows per discovery run. */
export function tallyCandidatesByRun(candidates: TalliedCandidate[] | null | undefined): Map<string, CandidateTally> {
  const tallies = new Map<string, CandidateTally>()

  for (const candidate of candidates || []) {
    if (!candidate.discovery_run_id) continue
    const tally = tallies.get(candidate.discovery_run_id) || {
      persisted: 0,
      verified: 0,
      qualified: 0,
      needs_review: 0,
      research_failed: 0,
    }
    tally.persisted += 1
    if (candidate.research_status === 'researched') tally.verified += 1
    if (candidate.research_status === 'failed') tally.research_failed += 1
    if (candidate.qualification_status === 'qualified') tally.qualified += 1
    if (candidate.qualification_status === 'needs_review') tally.needs_review += 1
    tallies.set(candidate.discovery_run_id, tally)
  }

  return tallies
}

type SummarisableMission = {
  discovery_run_id?: string | null
  candidate_count?: number | null
  result_summary?: Record<string, unknown> | null
}

/** The mission with a guaranteed, fully-populated result summary. */
export type EnrichedMission<T> = Omit<T, 'result_summary'> & { result_summary: Record<string, unknown> }

const EMPTY_TALLY: CandidateTally = {
  persisted: 0,
  verified: 0,
  qualified: 0,
  needs_review: 0,
  research_failed: 0,
}

/**
 * Merges a run's row tally into a mission's stored summary without overwriting a
 * fact the workflow already recorded. `selected` stays 0 because selecting a
 * candidate is a separate, human action; the returned count is the candidate count.
 */
export function enrichMissionResultSummary<T extends SummarisableMission>(mission: T, tallies: Map<string, CandidateTally>): EnrichedMission<T> {
  const stored = mission.result_summary || {}

  // A mission with no discovery run has nothing to enrich. A mission whose run
  // persisted no candidates still reports zeroes rather than omitting the fields.
  if (!mission.discovery_run_id) {
    return { ...mission, result_summary: { ...stored, selected: 0 } }
  }

  const tally = tallies.get(mission.discovery_run_id) || EMPTY_TALLY
  const number = (value: unknown) => (typeof value === 'number' ? value : undefined)

  return {
    ...mission,
    result_summary: {
      ...stored,
      // Workflow-recorded facts win; the row count is only a fallback.
      discovered: number(stored.discovered) ?? tally.persisted,
      verified: number(stored.verified) ?? tally.verified,
      qualified: number(stored.qualified) ?? tally.qualified,
      needs_review: number(stored.needs_review) ?? tally.needs_review,
      research_failed: number(stored.research_failed) ?? tally.research_failed,
      selected: 0,
      returned: mission.candidate_count ?? number(stored.returned) ?? tally.persisted,
      // Row-derived counts, published under an unambiguous prefix.
      candidates_persisted: tally.persisted,
      candidates_verified: tally.verified,
      candidates_qualified: tally.qualified,
      candidates_needs_review: tally.needs_review,
      candidates_research_failed: tally.research_failed,
    },
  }
}
