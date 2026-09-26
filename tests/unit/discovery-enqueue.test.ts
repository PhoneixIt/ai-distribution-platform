import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
// @ts-expect-error Node test runner loads the TypeScript source directly.
import { buildDiscoveryRunCompletionUpdate, buildDiscoveryWorkflowFailureUpdate, persistDiscoveryWorkflowFailure, resolveDiscoveryRunGuard } from '../../src/inngest/discovery-run-state.ts'
import type { DiscoveryCompletionReport } from '../../src/inngest/discovery-run-state.ts'
// @ts-expect-error Node test runner loads the TypeScript source directly.
import { missionDiscoveryWorkflow } from '../../src/inngest/functions.ts'

/**
 * These tests exercise the real production workflow lifecycle module used by
 * src/inngest/functions.ts. They intentionally do not re-state the rules: they call
 * production code, so reintroducing either defect makes them fail.
 */

const PRODUCTION_RUN_STATUSES = ['running', 'completed', 'partial', 'failed']

const report: DiscoveryCompletionReport = {
  searchQueries: ['mssp germany cybersecurity', 'distributor germany cybersecurity'],
  candidatesDiscovered: 12,
  candidatesResearched: 8,
  candidatesResearchFailed: 4,
  candidatesQualified: [{ id: 'a' }, { id: 'b' }],
  candidatesNeedingReview: [{ id: 'c' }],
  finalRankedCandidates: [
    { candidate: { researchStatus: 'researched' } },
    { candidate: { researchStatus: 'researched' } },
    { candidate: { researchStatus: 'failed' } },
  ],
}

type RecordedWrite = {
  table: string
  values: Record<string, unknown>
  column: string
  value: string
}

function createRecordingSupabase(options: { runError?: Error; missionError?: Error } = {}) {
  const writes: RecordedWrite[] = []

  const client = {
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          return {
            async eq(column: string, value: string) {
              writes.push({ table, values, column, value })
              const error = table === 'discovery_runs' ? options.runError : options.missionError
              return { data: null, error: error ?? null }
            },
          }
        },
      }
    },
  }

  return { writes, supabase: client as unknown as SupabaseClient }
}

function writeFor(writes: RecordedWrite[], table: string) {
  const match = writes.find((write) => write.table === table)
  assert.ok(match, `expected a write to ${table}`)
  return match
}

test('an API-created running discovery run is eligible for workflow execution', () => {
  // src/app/api/discovery/route.ts inserts every run with status 'running'.
  assert.equal(resolveDiscoveryRunGuard('running'), 'proceed')
})

test('a partial discovery run is still eligible for workflow execution', () => {
  assert.equal(resolveDiscoveryRunGuard('partial'), 'proceed')
})

test('the guard never returns an already_running terminal outcome for any production status', () => {
  const outcomes = PRODUCTION_RUN_STATUSES.map((status) => resolveDiscoveryRunGuard(status))

  assert.deepEqual(outcomes, ['proceed', 'already_completed', 'proceed', 'already_failed'])
  assert.equal(
    outcomes.includes('already_running' as never),
    false,
    '`running` must not be treated as terminal or discovery can never execute'
  )
})

test('completed runs remain idempotent and are not reprocessed', () => {
  assert.equal(resolveDiscoveryRunGuard('completed'), 'already_completed')
})

test('failed runs are not reprocessed after retries are exhausted', () => {
  assert.equal(resolveDiscoveryRunGuard('failed'), 'already_failed')
})

test('a successful discovery completes the run and advances the mission to dossier_ready', () => {
  const completion = buildDiscoveryRunCompletionUpdate({
    discoveryRunId: 'run-1',
    report,
    completedAt: '2026-09-26T12:00:00.000Z',
  })

  assert.equal(completion.run.status, 'completed')
  assert.equal(completion.run.completed_at, '2026-09-26T12:00:00.000Z')
  assert.equal(completion.run.returned_count, 3)
  assert.equal(completion.run.discovered_count, 12)
  assert.equal(completion.run.researched_count, 8)
  assert.deepEqual(completion.run.search_queries, report.searchQueries)

  assert.equal(completion.missionStage, 'dossier_ready')
  assert.equal(completion.mission.current_stage, 'dossier_ready')
  assert.equal(completion.mission.discovery_run_id, 'run-1')
  assert.equal(completion.mission.candidate_count, 3)
  assert.deepEqual(completion.mission.result_summary, {
    discovered: 12,
    researched: 8,
    research_failed: 4,
    verified: 2,
    returned: 3,
    qualified: 2,
    needs_review: 1,
    selected: 0,
  })
})

test('a successful discovery with no qualified candidates advances the mission to scored', () => {
  const completion = buildDiscoveryRunCompletionUpdate({
    discoveryRunId: 'run-2',
    report: { ...report, candidatesQualified: [], candidatesNeedingReview: [] },
    completedAt: '2026-09-26T12:00:00.000Z',
  })

  assert.equal(completion.run.status, 'completed')
  assert.equal(completion.missionStage, 'scored')
  assert.equal(completion.mission.current_stage, 'scored')
})

test('a workflow failure persists failed status on the discovery run', async () => {
  const { writes, supabase } = createRecordingSupabase()

  await persistDiscoveryWorkflowFailure(supabase, {
    missionId: 'mission-1',
    discoveryRunId: 'run-1',
    error: new Error('Firecrawl Search HTTP 402: payment required'),
    completedAt: '2026-09-26T12:00:00.000Z',
  })

  const runWrite = writeFor(writes, 'discovery_runs')
  assert.equal(runWrite.values.status, 'failed')
  assert.equal(runWrite.column, 'id')
  assert.equal(runWrite.value, 'run-1')
  assert.equal(runWrite.values.completed_at, '2026-09-26T12:00:00.000Z')
})

test('a workflow failure marks the associated mission failed at stage failed', async () => {
  const { writes, supabase } = createRecordingSupabase()

  await persistDiscoveryWorkflowFailure(supabase, {
    missionId: 'mission-1',
    discoveryRunId: 'run-1',
    error: new Error('provider chain exhausted'),
  })

  const missionWrite = writeFor(writes, 'missions')
  assert.equal(missionWrite.values.status, 'failed')
  assert.equal(missionWrite.values.current_stage, 'failed')
  assert.equal(missionWrite.value, 'mission-1')
})

test('a workflow failure retains the original error in the persisted error information', async () => {
  const { writes, supabase } = createRecordingSupabase()
  const original = new Error('Exa web search requires EXA_API_KEY in the server environment.')

  await persistDiscoveryWorkflowFailure(supabase, {
    missionId: 'mission-1',
    discoveryRunId: 'run-1',
    error: original,
  })

  const runMessage = String(writeFor(writes, 'discovery_runs').values.error_message)
  const missionMessage = String(writeFor(writes, 'missions').values.error_message)

  assert.ok(runMessage.includes(original.message), 'run error_message must retain the original error')
  assert.ok(missionMessage.includes(original.message), 'mission error_message must retain the original error')
  assert.equal(runMessage, missionMessage)
})

test('a workflow failure surfaces database errors instead of swallowing them', async () => {
  const { supabase } = createRecordingSupabase({ runError: new Error('permission denied') })

  await assert.rejects(
    () =>
      persistDiscoveryWorkflowFailure(supabase, {
        missionId: 'mission-1',
        discoveryRunId: 'run-1',
        error: new Error('discovery blew up'),
      }),
    /permission denied/
  )
})

test('persisted lifecycle state never writes queued or started_at', () => {
  const completion = buildDiscoveryRunCompletionUpdate({
    discoveryRunId: 'run-1',
    report,
    completedAt: '2026-09-26T12:00:00.000Z',
  })
  const failure = buildDiscoveryWorkflowFailureUpdate(
    new Error('boom'),
    '2026-09-26T12:00:00.000Z'
  )

  const allValues = [completion.run, completion.mission, failure.run, failure.mission]

  for (const values of allValues) {
    assert.equal('queued' in values, false, 'production discovery_runs has no queued status')
    assert.equal(values.status === 'queued', false)
    assert.equal('started_at' in values, false, 'production discovery_runs has no started_at column')
  }

  const statuses = allValues.map((values) => values.status)
  for (const status of statuses) {
    assert.ok(
      status === undefined || PRODUCTION_RUN_STATUSES.includes(String(status)) || status === 'running',
      `unexpected status written: ${String(status)}`
    )
  }
})

// --- Wiring: the registered Inngest function must actually use this logic ---

type RegisteredFunctionOptions = {
  id: string
  retries?: number
  onFailure?: unknown
  triggers: Array<{ event: string }>
}

const registeredOptions = missionDiscoveryWorkflow.opts as unknown as RegisteredFunctionOptions

test('the registered workflow triggers on the event the API emits', () => {
  assert.equal(registeredOptions.id, 'portai-mission-discovery')
  assert.deepEqual(
    registeredOptions.triggers.map((trigger) => trigger.event),
    ['portai/mission.workflow.started']
  )
})

test('the registered workflow persists failure after retries are exhausted', () => {
  assert.equal(typeof registeredOptions.onFailure, 'function')
  assert.equal(registeredOptions.retries, 2)
})

test('the workflow module does not reintroduce a terminal already_running outcome', () => {
  const source = readFileSync('src/inngest/functions.ts', 'utf8')

  assert.equal(
    source.includes('already_running'),
    false,
    'the `running` guard must not be reintroduced; it made every API-created run skip discovery'
  )
  assert.ok(source.includes('resolveDiscoveryRunGuard'), 'workflow must delegate to the tested guard')
  assert.ok(
    source.includes('persistDiscoveryWorkflowFailure'),
    'workflow must delegate failure persistence to the tested helper'
  )
})

// --- mission <-> discovery_run linkage ---

test('the enqueue route links the mission to the run before emitting the event', () => {
  const source = readFileSync('src/app/api/discovery/route.ts', 'utf8')

  const insertIndex = source.indexOf(".from('discovery_runs')")
  const linkIndex = source.indexOf('discovery_run_id: run.id')
  const emitIndex = source.indexOf('inngest.send')

  assert.ok(insertIndex > -1, 'route must create a discovery_runs row')
  assert.ok(linkIndex > -1, 'route must persist missions.discovery_run_id at enqueue')
  assert.ok(emitIndex > -1, 'route must emit the Inngest event')
  assert.ok(
    insertIndex < linkIndex,
    'the run must exist before the mission can be linked to it'
  )
  assert.ok(
    linkIndex < emitIndex,
    'the mission must be linked before the workflow event is emitted, so a running, stalled or failed run stays traceable'
  )
})

test('a failed mission link fails the run instead of emitting an unlinked event', () => {
  const source = readFileSync('src/app/api/discovery/route.ts', 'utf8')
  const linkIndex = source.indexOf('discovery_run_id: run.id')
  const failIndex = source.indexOf("status: 'failed', error_message: 'Could not link discovery run to mission.'")

  assert.ok(failIndex > -1, 'a link failure must mark the run failed')
  assert.ok(
    failIndex > linkIndex,
    'the compensating failure write must follow the failed linkage attempt'
  )
  assert.ok(
    source.includes("update({ discovery_run_id: run.id })"),
    'the linkage must target the newly created run id'
  )
})

test('the workflow still records the run id on completion', () => {
  const source = readFileSync('src/inngest/functions.ts', 'utf8')

  assert.ok(
    source.includes('discovery_run_id: discoveryRunId'),
    'completion must keep missions.discovery_run_id authoritative'
  )
})

// --- mock discovery must be unreachable from production ---

test('discover() refuses to return fixture candidates when no candidate source is injected', async () => {
  // @ts-expect-error Node test runner loads the TypeScript source directly.
  const { createPartnerDiscoveryAgent } = await import('../../src/agents/partner-discovery/agent.ts')

  const agent = createPartnerDiscoveryAgent({})
  const request = {
    country: 'Germany',
    partnerTypes: ['MSSP'],
    technologyFocus: 'Cybersecurity',
    desiredCandidateCount: 5,
  }

  await assert.rejects(
    () => agent.discover(request),
    /requires an injected candidateSource/,
    'discover() must fail loudly instead of silently returning mock candidates'
  )
})

test('discover() still honours an explicitly injected candidate source', async () => {
  // @ts-expect-error Node test runner loads the TypeScript source directly.
  const { createPartnerDiscoveryAgent } = await import('../../src/agents/partner-discovery/agent.ts')

  const agent = createPartnerDiscoveryAgent({
    candidateSource: {
      async discover() {
        return [
          {
            companyName: 'Injected Co',
            website: 'https://injected.example',
            country: 'Germany',
            partnerTypes: ['MSSP'],
            capabilities: ['Managed security services'],
            customerSegments: ['Mid-market'],
            services: ['Managed security services'],
            technologies: ['Cybersecurity'],
            industries: [],
            vendorPartnerships: [],
            certifications: [],
            locations: ['Germany'],
            description: 'Injected candidate for the dependency-injection path.',
            evidence: [
              {
                title: 'Injected evidence',
                url: 'https://injected.example/about',
                sourceType: 'company-website' as const,
                excerpt: 'Injected evidence used by the test.',
              },
            ],
            fitScore: 50,
            qualificationReasons: [],
            concerns: [],
            verificationStatus: 'preliminary' as const,
            researchStatus: 'researched' as const,
            researchSources: [],
            pagesFetched: 1,
            failedUrls: [],
          },
        ]
      },
    },
  })

  const result = await agent.discover({
    country: 'Germany',
    partnerTypes: ['MSSP'],
    technologyFocus: 'Cybersecurity',
    desiredCandidateCount: 5,
  })

  assert.equal(result.source, 'provider')
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].companyName, 'Injected Co')
})
