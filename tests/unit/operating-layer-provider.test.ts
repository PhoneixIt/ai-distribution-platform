import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runOperatingLayer, resolveExecutionProvenance } from '../../src/lib/agents/operating-layer'

/**
 * Regression contract for the AI operating layer provider provenance.
 *
 * A run must never be persisted as though a model answered when no model was
 * reachable. The deterministic operating rules remain a legitimate outcome, but
 * they must be recorded as a degraded run, not a completed OpenAI run.
 */

type Recorded = { table: string; op: string; payload: Record<string, unknown> | null }

function createFakeSupabase(recorded: Recorded[], rows: Record<string, unknown>[]) {
  // Minimal chainable PostgREST double. Every builder method returns `this`, and
  // terminal operations record the call and resolve to a benign, shaped result.
  const terminal = (table: string, op: string, payload: Record<string, unknown> | null) => {
    recorded.push({ table, op, payload })
    const builder: Record<string, unknown> = {
      data: rows,
      error: null,
      count: rows.length,
      select: () => builder,
      insert: (value: Record<string, unknown>) => { recorded.push({ table, op: 'insert', payload: value }); return builder },
      update: (value: Record<string, unknown>) => { recorded.push({ table, op: 'update', payload: value }); return builder },
      upsert: (value: Record<string, unknown>) => { recorded.push({ table, op: 'upsert', payload: value }); return builder },
      delete: () => builder,
      eq: () => builder,
      in: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: () => Promise.resolve({ data: { id: `${table}-1`, ...rows[0] }, error: null }),
      maybeSingle: () => Promise.resolve({ data: { id: `${table}-1`, ...rows[0] }, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve),
    }
    return builder
  }

  return {
    from(table: string) {
      const builder: Record<string, unknown> = {
        select: () => terminal(table, 'select', null),
        insert: (value: Record<string, unknown>) => terminal(table, 'insert', value),
        update: (value: Record<string, unknown>) => terminal(table, 'update', value),
        upsert: (value: Record<string, unknown>) => terminal(table, 'upsert', value),
        delete: () => terminal(table, 'delete', null),
      }
      return builder
    },
  }
}

function updatesFor(recorded: Recorded[], table: string) {
  return recorded.filter((entry) => entry.table === table && entry.op === 'update' && entry.payload)
}

test('a run whose OpenAI credential cannot be resolved is persisted as degraded, not as a completed model run', async () => {
  const recorded: Recorded[] = []
  const supabase = createFakeSupabase(recorded, [{ id: 'org-1', name: 'Acme' }])

  const result = await runOperatingLayer(
    supabase as never,
    'org-1',
    'user-1',
    'Grow distributor revenue in the DACH region this quarter',
    {
      resolveOpenAIToken: async () => {
        throw new Error('Vercel Connect connector is not authorized for this environment.')
      },
    },
  )

  // The returned result must state the degradation.
  assert.equal(result.degraded, true, 'result must report degraded=true')
  assert.equal(result.provider, 'rules_fallback', 'result must name the rules provider, not OpenAI')
  assert.equal(result.model, null, 'a degraded run must not claim a model')
  assert.match(String(result.degradedReason), /not authorized/, 'result must carry the provider failure reason')

  // The run must not be reported as a completed model run.
  assert.notEqual(result.status, 'completed', 'a degraded run must not report status=completed')
  assert.equal(result.status, 'partial', 'a degraded run must be recorded as partial')

  // The persisted run row must never claim OpenAI answered.
  const runInserts = recorded.filter((e) => e.table === 'agent_runs' && e.op === 'insert')
  assert.equal(runInserts.length, 1, 'exactly one agent_runs insert is expected')
  const inserted = runInserts[0].payload as Record<string, unknown>
  assert.equal(inserted.provider, 'rules_fallback', 'the run must be created against the real provider')
  assert.equal(inserted.model, null, 'the run must not be created claiming a model')
  assert.equal((inserted.metadata as Record<string, unknown>).degraded, true, 'metadata must record the degradation')

  // The terminal update must persist the truthful provider, model, status and error.
  const terminal = updatesFor(recorded, 'agent_runs').at(-1)?.payload as Record<string, unknown>
  assert.equal(terminal.provider, 'rules_fallback', 'terminal update must persist rules_fallback')
  assert.equal(terminal.model, null, 'terminal update must clear the model')
  assert.equal(terminal.status, 'partial', 'terminal update must persist partial')
  assert.match(String(terminal.error_message), /not authorized/, 'terminal update must persist the provider failure')

  // No agent_runs row anywhere in the run may claim OpenAI answered.
  for (const entry of recorded.filter((e) => e.table === 'agent_runs' && e.payload)) {
    const payload = entry.payload as Record<string, unknown>
    assert.notEqual(payload.provider, 'openai_responses', 'no agent_runs write may claim openai_responses in a degraded run')
    assert.notEqual(payload.model, 'gpt-5.6-luna', 'no agent_runs write may claim the default model in a degraded run')
  }
})

test('a resolved credential yields an OpenAI provenance that is not degraded', async () => {
  // Exercised directly so the healthy path never reaches the network: driving
  // runOperatingLayer with a live-looking token would make a real provider call.
  const provenance = await resolveExecutionProvenance(async () => 'test-token')

  assert.equal(provenance.degraded, false, 'a resolved credential must not be degraded')
  assert.equal(provenance.provider, 'openai_responses', 'provider must be openai_responses')
  assert.equal(provenance.token, 'test-token', 'the resolved token must be carried through')
  assert.equal(provenance.degradedReason, null, 'a healthy provenance must not carry a failure reason')
  assert.equal(provenance.model, process.env.OPENAI_AGENT_MODEL || 'gpt-5.6-luna', 'a healthy provenance must name the effective model')
})

test('a credential that throws yields a rules provenance carrying the failure reason', async () => {
  const provenance = await resolveExecutionProvenance(async () => {
    throw new Error('Vercel Connect connector is not authorized for this environment.')
  })

  assert.equal(provenance.degraded, true)
  assert.equal(provenance.provider, 'rules_fallback')
  assert.equal(provenance.token, null, 'a failed resolution must not carry a token')
  assert.equal(provenance.model, null, 'a degraded provenance must not name a model')
  assert.match(String(provenance.degradedReason), /not authorized/)
})

test('a credential that resolves to an empty value is treated as unavailable, not as success', async () => {
  const recorded: Recorded[] = []
  const supabase = createFakeSupabase(recorded, [{ id: 'org-1', name: 'Acme' }])

  const result = await runOperatingLayer(
    supabase as never,
    'org-1',
    'user-1',
    'Grow distributor revenue in the DACH region this quarter',
    { resolveOpenAIToken: async () => '' },
  )

  assert.equal(result.degraded, true, 'an empty token must be treated as unavailable')
  assert.equal(result.provider, 'rules_fallback')
  assert.match(String(result.degradedReason), /no token/i, 'the reason must explain that no token was returned')
})
