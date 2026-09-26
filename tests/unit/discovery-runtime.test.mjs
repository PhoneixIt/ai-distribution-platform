import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDiscoverySearchDiagnostics } from '../../src/lib/discovery/runtime-diagnostics.ts'

test('classifies total provider failure as a hard discovery failure', () => {
  const diagnostics = buildDiscoverySearchDiagnostics(
    3,
    3,
    [
      'Query failed: cybersecurity MSSP Germany (Firecrawl HTTP 401: invalid key)',
      'Query failed: MSSP cybersecurity services Germany (Firecrawl HTTP 401: invalid key)',
      'Query failed: MSSP companies Germany (Firecrawl HTTP 401: invalid key)',
    ],
  )

  assert.deepEqual(diagnostics, {
    code: 'DISCOVERY_SEARCH_FAILURE',
    provider: 'firecrawl',
    failedQueries: 3,
    totalQueries: 3,
    details: [
      'Query failed: cybersecurity MSSP Germany (Firecrawl HTTP 401: invalid key)',
      'Query failed: MSSP cybersecurity services Germany (Firecrawl HTTP 401: invalid key)',
      'Query failed: MSSP companies Germany (Firecrawl HTTP 401: invalid key)',
    ],
  })
})

test('classifies partial provider failure without blocking successful candidates', () => {
  const diagnostics = buildDiscoverySearchDiagnostics(
    4,
    1,
    [
      'Query failed: cybersecurity MSSP Germany (Firecrawl HTTP 429: rate limited)',
      'Duplicate result skipped: https://example.com',
    ],
  )

  assert.equal(diagnostics?.code, 'DISCOVERY_SEARCH_PARTIAL_FAILURE')
  assert.equal(diagnostics?.failedQueries, 1)
  assert.equal(diagnostics?.totalQueries, 4)
  assert.equal(diagnostics?.details.length, 1)
})

test('returns no diagnostic when every query completed', () => {
  assert.equal(buildDiscoverySearchDiagnostics(4, 0, []), null)
})
