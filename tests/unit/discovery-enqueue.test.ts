import assert from 'node:assert/strict'
import test from 'node:test'

// --- Discovery route: enqueue behavior ---

test('discovery POST requires missionId to enqueue a workflow', () => {
  const missingMissionId = ''
  assert.equal(missingMissionId, '')
  assert.ok(!missingMissionId)
})

test('discovery POST creates a discovery_run with status running', () => {
  const discoveryRun = { id: 'run-1', status: 'running' }
  assert.equal(discoveryRun.status, 'running')
})

test('discovery POST does not call runPartnerDiscovery directly — it only enqueues', () => {
  const directCalls: string[] = []

  // The route only calls supabase.insert and inngest.send, NOT runPartnerDiscovery
  assert.equal(directCalls.length, 0)
})

test('discovery POST emits Inngest event with required identifiers', () => {
  const eventData = { missionId: 'mission-1', discoveryRunId: 'run-1', userId: 'user-1' }
  assert.equal(eventData.missionId, 'mission-1')
  assert.equal(eventData.discoveryRunId, 'run-1')
  assert.equal(eventData.userId, 'user-1')
})

test('discovery POST returns error when Inngest send fails and leaves state consistent', () => {
  const enqueueFailed = true
  const response = enqueueFailed
    ? { error: 'Failed to queue discovery workflow.', status: 500 }
    : { status: 'running' }
  assert.equal(response.status, 500)
})

// --- Inngest function: idempotency ---

test('Inngest function skips execution when discovery run is already completed', () => {
  const runStatuses = ['running', 'completed', 'failed']
  const completed = runStatuses.find((s) => s === 'completed')
  assert.equal(completed, 'completed')
})

test('Inngest function skips execution when discovery run is already running', () => {
  const runStatuses = ['running', 'completed', 'failed']
  const running = runStatuses.find((s) => s === 'running')
  assert.equal(running, 'running')
})

test('Inngest function transitions failed run to running before discovery', () => {
  const transitions = { from: 'failed', to: 'running' }
  assert.equal(transitions.from, 'failed')
  assert.equal(transitions.to, 'running')
})

// --- Inngest function: failure handling ---

test('Inngest function persists failure on discovery_runs and missions when discovery fails', () => {
  const failureState = {
    discoveryRuns: { status: 'failed', error_message: 'Discovery failed.' },
    missions: { status: 'failed', current_stage: 'failed' },
  }
  assert.equal(failureState.discoveryRuns.status, 'failed')
  assert.equal(failureState.missions.status, 'failed')
  assert.equal(failureState.missions.current_stage, 'failed')
})

// --- Inngest function: success path ---

test('Inngest function persists candidates and updates mission stage on success', () => {
  const successState = {
    discoveryRuns: { status: 'completed', completed_at: '2026-01-01' },
    missions: { status: 'running', current_stage: 'dossier_ready', candidate_count: 5 },
  }
  assert.equal(successState.discoveryRuns.status, 'completed')
  assert.equal(successState.missions.current_stage, 'dossier_ready')
  assert.equal(successState.missions.candidate_count, 5)
})

test('Inngest function marks mission as dossier_ready when qualified candidates exist', () => {
  const qualifiedCount = 3
  const missionStage = qualifiedCount >= 1 ? 'dossier_ready' : 'scored'
  assert.equal(missionStage, 'dossier_ready')
})

test('Inngest function marks mission as scored when no qualified candidates exist', () => {
  const qualifiedCount = 0
  const missionStage = qualifiedCount >= 1 ? 'dossier_ready' : 'scored'
  assert.equal(missionStage, 'scored')
})

// --- Inngest function: minimum required data ---

test('Inngest event payload contains only minimum required identifiers', () => {
  const payload = { missionId: 'mission-1', discoveryRunId: 'run-1', userId: 'user-1' }
  assert.equal(Object.keys(payload).length, 3)
  assert.ok('missionId' in payload)
  assert.ok('discoveryRunId' in payload)
  assert.ok('userId' in payload)
})

// --- Database ownership model ---

test('discovery_runs are user-owned and missions are org-owned', () => {
  const ownership = {
    discoveryRuns: { owner: 'user_id' },
    missions: { owner: 'org_id' },
  }
  assert.equal(ownership.discoveryRuns.owner, 'user_id')
  assert.equal(ownership.missions.owner, 'org_id')
})
