import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OAUTH_ONBOARDING_TTL_MS,
  createPendingOrganizationState,
  getOrganizationProfile,
  parseOrganizationSelection,
  parsePendingOrganizationSelection,
} from '../../src/lib/organization-roles.ts'

test('accepts each primary organization type', () => {
  for (const organizationType of ['vendor', 'distributor', 'partner', 'customer']) {
    assert.deepEqual(parseOrganizationSelection({ organization_type: organizationType }), {
      organizationType,
      organizationRoles: [],
    })
  }
})

test('allows partner subtype selection to be empty or contain multiple supported values', () => {
  assert.deepEqual(parseOrganizationSelection({ organization_type: 'partner' }), {
    organizationType: 'partner',
    organizationRoles: [],
  })
  assert.deepEqual(parseOrganizationSelection({
    organization_type: 'partner',
    organization_roles: ['msp', 'system_integrator', 'msp'],
  }), {
    organizationType: 'partner',
    organizationRoles: ['msp', 'system_integrator'],
  })
})

test('rejects unknown primary types, unsupported subtypes, and subtypes on non-partner organizations', () => {
  assert.equal(parseOrganizationSelection({ organization_type: 'attacker' }), null)
  assert.equal(parseOrganizationSelection({ organization_type: 'partner', organization_roles: ['unknown'] }), null)
  assert.equal(parseOrganizationSelection({ organization_type: 'vendor', organization_roles: ['msp'] }), null)
  assert.equal(parseOrganizationSelection({ organization_type: 'customer', organization_roles: 'msp' }), null)
})

test('maps legacy partner organization types without requiring existing rows to be rewritten', () => {
  const profile = getOrganizationProfile('msp', [])
  assert.equal(profile.primaryType, 'partner')
  assert.equal(profile.label, 'Partner')
  assert.deepEqual(profile.partnerRoles, ['msp'])
  assert.equal(profile.isConfigured, true)
})

test('does not classify untyped workspaces as configured', () => {
  assert.equal(getOrganizationProfile(null).isConfigured, false)
  assert.equal(getOrganizationProfile('vendor', []).isConfigured, true)
})

test('accepts only valid, unexpired OAuth onboarding state', () => {
  const now = 1_800_000_000_000
  const validState = JSON.stringify({ organizationType: 'partner', organizationRoles: ['msp'], createdAt: now })
  assert.deepEqual(parsePendingOrganizationSelection(validState, now), {
    organizationType: 'partner',
    organizationRoles: ['msp'],
  })
  assert.equal(parsePendingOrganizationSelection(validState, now + OAUTH_ONBOARDING_TTL_MS + 1), null)
  assert.equal(parsePendingOrganizationSelection('{invalid', now), null)
  assert.equal(parsePendingOrganizationSelection(JSON.stringify({ organizationType: 'unknown', createdAt: now }), now), null)
})

test('creates same-tab OAuth state for the selected primary role and partner subtypes', () => {
  const before = Date.now()
  const state = JSON.parse(createPendingOrganizationState({
    organizationType: 'partner',
    organizationRoles: ['msp', 'system_integrator'],
  }))
  const after = Date.now()

  assert.deepEqual(parsePendingOrganizationSelection(JSON.stringify(state), state.createdAt), {
    organizationType: 'partner',
    organizationRoles: ['msp', 'system_integrator'],
  })
  assert.ok(state.createdAt >= before && state.createdAt <= after)
})
