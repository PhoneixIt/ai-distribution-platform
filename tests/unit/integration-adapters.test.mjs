import test from 'node:test'
import assert from 'node:assert/strict'
import { assertActionAllowed, resolveCapability } from '../../src/lib/integrations/adapters.ts'

const capability = {
  id: 'communication.outbound',
  name: 'External communication',
  description: 'Send approved communications.',
  layer: 'communication',
  integrations: ['agentmail', 'gmail'],
  status: 'planned',
  mode: 'connect',
  userScoped: true,
  requiresApproval: true,
}

const integrations = [
  { id: 'agentmail', name: 'AgentMail', layer: 'communication', mode: 'connect', status: 'planned', capabilities: ['agent-email'] },
  { id: 'gmail', name: 'Gmail', layer: 'communication', mode: 'connect', status: 'configured', capabilities: ['email-send'] },
]

test('resolves configured providers without coupling product code to one provider', () => {
  const resolution = resolveCapability(capability, integrations)
  assert.deepEqual(resolution.readyProviderIds, ['gmail'])
  assert.equal(resolution.requiresApproval, true)
})

test('blocks consequential actions before approval', () => {
  assert.throws(
    () => assertActionAllowed(capability, 'send', false),
    /requires explicit approval/
  )
  assert.doesNotThrow(() => assertActionAllowed(capability, 'send', true))
})

test('allows non-external capability work without approval', () => {
  assert.doesNotThrow(() => assertActionAllowed(capability, 'read', false))
})
