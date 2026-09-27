import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDiscoveryIntent } from '../../src/lib/missions/discovery-intent.ts'

test('extracts stated discovery criteria from the intent-first example', () => {
  assert.deepEqual(parseDiscoveryIntent('Find 20 qualified cybersecurity MSPs in Germany that could sell my product.'), {
    country: 'Germany',
    technologyFocus: 'cybersecurity',
    partnerTypes: ['MSP'],
    customerSegment: undefined,
    desiredCandidateCount: 20,
  })
})

test('extracts multiple partner types and customer segment without inventing extra criteria', () => {
  assert.deepEqual(parseDiscoveryIntent('Find 15 cybersecurity MSPs and resellers in Germany serving mid-market customers.'), {
    country: 'Germany',
    technologyFocus: 'cybersecurity',
    partnerTypes: ['MSP', 'Reseller'],
    customerSegment: 'Mid-market',
    desiredCandidateCount: 15,
  })
})

test('caps a requested result count at the discovery API limit', () => {
  assert.equal(parseDiscoveryIntent('Find 250 cloud security MSSPs in Germany.').desiredCandidateCount, 100)
})

test('leaves broad regions and unsupported intent details unresolved for the user to fill in', () => {
  assert.deepEqual(parseDiscoveryIntent('Help me grow in Europe.'), {
    country: undefined,
    technologyFocus: undefined,
    partnerTypes: [],
    customerSegment: undefined,
    desiredCandidateCount: undefined,
  })
})
