import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error Node test runner loads the TypeScript source directly.
import { enrichMissionResultSummary, tallyCandidatesByRun } from '../../src/lib/missions/result-summary.ts'

/**
 * Regression coverage for the mission result summary.
 *
 * Production mission 86549c16-911f-427e-a831-15b29eab8b6f (run
 * 7c0d007a-f567-4ce9-b847-fa9892349057, 2026-09-27T04:55Z) reported
 * "Discovered 3" on the mission page. The workflow had actually discovered 30
 * organizations and researched 27; only 3 were persisted as candidates.
 *
 * GET /api/missions counted `discovery_candidates` rows and spread the result
 * over the stored summary, so the row count replaced the run's discovered_count.
 * These tests pin the corrected contract using that mission's real values.
 */

const RUN = '7c0d007a-f567-4ce9-b847-fa9892349057'

/** The three candidates the real run persisted. */
const realCandidates = [
  { discovery_run_id: RUN, research_status: 'researched', qualification_status: 'needs_review' },
  { discovery_run_id: RUN, research_status: 'failed', qualification_status: 'needs_review' },
  { discovery_run_id: RUN, research_status: 'failed', qualification_status: 'needs_review' },
]

/** What the durable workflow actually persisted for that mission. */
const realStoredSummary = {
  returned: 3,
  selected: 0,
  verified: 1,
  qualified: 0,
  discovered: 30,
  researched: 27,
  needs_review: 3,
  research_failed: 3,
}

const realMission = {
  id: '86549c16-911f-427e-a831-15b29eab8b6f',
  discovery_run_id: RUN,
  candidate_count: 3,
  result_summary: realStoredSummary,
}

test('a row count never replaces the number of organizations the run discovered', () => {
  const tallies = tallyCandidatesByRun(realCandidates)
  const { result_summary } = enrichMissionResultSummary(realMission, tallies)

  assert.equal(result_summary.discovered, 30, 'the funnel width must stay 30, not collapse to the 3 persisted rows')
  assert.equal(result_summary.researched, 27)
  assert.equal(result_summary.verified, 1)
  assert.equal(result_summary.qualified, 0)
  assert.equal(result_summary.research_failed, 3)
})

test('row-derived counts stay available under an explicit prefix', () => {
  const tallies = tallyCandidatesByRun(realCandidates)
  const { result_summary } = enrichMissionResultSummary(realMission, tallies)

  assert.equal(result_summary.candidates_persisted, 3)
  assert.equal(result_summary.candidates_verified, 1)
  assert.equal(result_summary.candidates_qualified, 0)
  assert.equal(result_summary.candidates_needs_review, 3)
  assert.equal(result_summary.candidates_research_failed, 2, 'two persisted candidates actually failed research')
})

test('the discovery funnel is internally consistent and monotonic', () => {
  const tallies = tallyCandidatesByRun(realCandidates)
  const { result_summary } = enrichMissionResultSummary(realMission, tallies) as {
    result_summary: Record<string, number>
  }

  assert.ok(
    result_summary.discovered >= result_summary.researched,
    'cannot research more organizations than were discovered',
  )
  assert.equal(result_summary.returned, 3)
  assert.equal(result_summary.candidates_persisted, result_summary.returned)
  assert.equal(result_summary.selected, 0, 'selecting a candidate is a separate human action')
})

test('an older row with no recorded funnel still renders real numbers', () => {
  const legacyMission = {
    id: 'legacy',
    discovery_run_id: RUN,
    candidate_count: 3,
    result_summary: null,
  }
  const tallies = tallyCandidatesByRun(realCandidates)
  const { result_summary } = enrichMissionResultSummary(legacyMission, tallies)

  assert.equal(result_summary.discovered, 3, 'falls back to the persisted count when nothing was recorded')
  assert.equal(result_summary.verified, 1)
  assert.equal(result_summary.research_failed, 2, 'falls back to the row-derived failure count')
  assert.equal(result_summary.selected, 0)
})

test('a mission with no run is left alone apart from selected', () => {
  const { result_summary } = enrichMissionResultSummary(
    { id: 'draft', discovery_run_id: null, candidate_count: 0, result_summary: null },
    tallyCandidatesByRun(realCandidates),
  )
  assert.deepEqual(result_summary, { selected: 0 })
})

test('tallies are grouped per run and ignore rows without a run', () => {
  const tallies = tallyCandidatesByRun([
    ...realCandidates,
    { discovery_run_id: 'other-run', research_status: 'researched', qualification_status: 'qualified' },
    { discovery_run_id: null, research_status: 'researched', qualification_status: 'qualified' },
  ])

  assert.equal(tallies.get(RUN)!.persisted, 3)
  assert.equal(tallies.get('other-run')!.persisted, 1)
  assert.equal(tallies.get('other-run')!.qualified, 1)
  assert.equal(tallies.size, 2, 'a row with no run must not create a bucket')
})

test('an empty candidate set does not throw and reports zeroes', () => {
  const tallies = tallyCandidatesByRun([])
  const { result_summary } = enrichMissionResultSummary(
    { id: 'x', discovery_run_id: RUN, candidate_count: 0, result_summary: { discovered: 12 } },
    tallies,
  )
  assert.equal(result_summary.discovered, 12)
  assert.equal(result_summary.candidates_persisted, 0)
})
