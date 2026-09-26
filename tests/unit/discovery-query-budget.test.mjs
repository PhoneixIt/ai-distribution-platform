import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPartnerDiscoveryQueries } from '../../src/agents/partner-discovery/web-search.ts'

test('caps discovery query fan-out at six complementary searches', () => {
  const queries = buildPartnerDiscoveryQueries({
    country: 'Germany',
    technologyFocus: 'Cybersecurity',
    partnerTypes: ['MSP', 'MSSP', 'System Integrator', 'Reseller'],
    customerSegment: 'mid-market',
    industry: 'technology',
    serviceOrCapability: 'managed security',
    vendorPartnership: 'backup software',
    certification: 'ISO 27001',
    companySize: '50-500 employees',
  })

  assert.equal(queries.length, 6)
  assert.equal(new Set(queries).size, queries.length)
})

test('preserves the highest-priority partner-type queries when capped', () => {
  const queries = buildPartnerDiscoveryQueries({
    country: 'Germany',
    technologyFocus: 'Cybersecurity',
    partnerTypes: ['MSP', 'MSSP'],
  })

  assert.deepEqual(queries.slice(0, 6), [
    'Cybersecurity MSP Germany',
    'MSP Cybersecurity services Germany',
    'Cybersecurity MSP Germany',
    'MSP companies Germany',
    'Cybersecurity MSSP Germany',
    'MSSP Cybersecurity services Germany',
  ].filter((query, index, all) => all.indexOf(query) === index))
})
