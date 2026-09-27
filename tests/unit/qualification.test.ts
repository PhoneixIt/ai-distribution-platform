import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error Node test runner loads the TypeScript source directly.
import { qualifyCandidate } from '../../src/agents/partner-discovery/qualification.ts'
import type { PartnerCandidate, PartnerDiscoveryRequest } from '../../src/agents/partner-discovery/types.ts'

/**
 * Behavioural contract for qualification. These tests assert observable outcomes
 * (status, criteria classification, score) rather than internal implementation.
 */

function candidate(overrides: Partial<PartnerCandidate> = {}): PartnerCandidate {
  return {
    companyName: 'Example Security GmbH',
    website: 'https://example-security.test',
    country: 'Germany',
    partnerTypes: ['MSSP'],
    capabilities: ['Managed security services'],
    industries: [],
    customerSegments: ['Mid-market'],
    locations: ['Germany'],
    services: ['Managed security services'],
    technologies: ['Cybersecurity'],
    vendorPartnerships: [],
    certifications: [],
    description: 'Managed security provider based in Germany.',
    evidence: [
      {
        title: 'Example Security — services',
        url: 'https://example-security.test/services',
        sourceType: 'company-website',
        excerpt: 'Managed security services and cybersecurity operations in Germany.',
      },
    ],
    fitScore: 80,
    qualificationReasons: [],
    concerns: [],
    verificationStatus: 'verified',
    researchStatus: 'researched',
    researchSources: [],
    ...overrides,
  }
}

const fullRequest: PartnerDiscoveryRequest = {
  country: 'Germany',
  partnerTypes: ['MSSP'],
  technologyFocus: 'Cybersecurity',
  desiredCandidateCount: 5,
}

const objectiveOnlyRequest: PartnerDiscoveryRequest = {
  country: '',
  partnerTypes: [],
  technologyFocus: '',
  desiredCandidateCount: 5,
}

test('objective-only request with no evaluated criteria is needs_review, never qualified', () => {
  const result = qualifyCandidate(candidate(), objectiveOnlyRequest)

  assert.equal(result.status, 'needs_review')
  assert.notEqual(result.status, 'qualified')
  assert.equal(result.matchedCriteria.length, 0)
  assert.equal(result.unmetCriteria.length, 0)
  assert.equal(result.unknownCriteria.length, 0)
  assert.equal(result.score, 0)
})

test('a candidate with no attributable evidence cannot qualify on assumption alone', () => {
  const unverified = candidate({
    country: '',
    locations: [],
    partnerTypes: [],
    capabilities: [],
    technologies: [],
    description: '',
    evidence: [],
  })

  const result = qualifyCandidate(unverified, fullRequest)

  assert.notEqual(result.status, 'qualified')
  assert.equal(result.unmetCriteria.length, 0, 'absent values are unknown, not unmet')
  assert.equal(result.unknownCriteria.length, 3, 'country, partnerType and technology are all unknown')
  assert.equal(result.evidence.length, 0)
  assert.equal(result.score, 0)
})

test('unknown criteria stay unknown and are not counted as unmet', () => {
  // No technology attribute and no text mentioning the technology focus anywhere,
  // so the criterion is genuinely unknown rather than unmet.
  const partial = candidate({
    country: 'Germany',
    partnerTypes: ['MSSP'],
    technologies: [],
    capabilities: [],
    services: [],
    description: 'Regional services company operating in Germany.',
    evidence: [
      {
        title: 'Regional services company — about',
        url: 'https://example-security.test/about',
        sourceType: 'company-website',
        excerpt: 'A regional services company operating in Germany.',
      },
    ],
  })

  const result = qualifyCandidate(partial, fullRequest)

  const technology = result.unknownCriteria.find((item) => item.key === 'technology')
  assert.ok(technology, 'technology must be reported as unknown')
  assert.equal(
    result.unmetCriteria.some((item) => item.key === 'technology'),
    false,
    'a missing attribute must not be reported as an unmet requirement'
  )
  assert.notEqual(result.status, 'qualified')
})

test('explicitly evidenced criteria can qualify', () => {
  const result = qualifyCandidate(candidate(), fullRequest)

  assert.equal(result.status, 'qualified')
  assert.equal(result.unmetCriteria.length, 0)
  assert.equal(result.unknownCriteria.length, 0)
  assert.ok(result.matchedCriteria.length >= 3)
  assert.ok(result.score > 0, 'an evidenced match must produce a positive score')
  assert.ok(result.evidence.length > 0, 'qualification must be backed by evidence')
})

test('explicitly unmet criteria do not qualify', () => {
  // Wrong country, and no text anywhere referencing the requested country, so the
  // country criterion is explicitly unmet rather than unknown.
  const wrongCountry = candidate({
    country: 'France',
    locations: ['France'],
    description: 'Managed security provider based in France.',
    evidence: [
      {
        title: 'Example Security — services',
        url: 'https://example-security.test/services',
        sourceType: 'company-website',
        excerpt: 'Managed security services and cybersecurity operations in France.',
      },
    ],
  })

  const result = qualifyCandidate(wrongCountry, fullRequest)

  assert.equal(result.status, 'not_qualified')
  assert.ok(
    result.unmetCriteria.some((item) => item.key === 'country'),
    'the unmet country must be reported'
  )
  // A partial match still earns partial score for ranking, but never reaches qualified.
  assert.ok(result.score > 0 && result.score < 100, `expected partial score, got ${result.score}`)
  assert.ok(
    result.concerns.some((concern) => /Country or market does not meet the request/.test(concern)),
    'the unmet criterion must be explained in concerns'
  )
})

test('a single evidenced candidate qualifies, so no candidate-count gate exists', () => {
  const results = [qualifyCandidate(candidate(), fullRequest)]

  assert.equal(results.length, 1, 'qualification is evaluated per candidate')
  assert.equal(
    results[0].status,
    'qualified',
    'one fully evidenced candidate is enough; no minimum candidate count is required'
  )
})

test('excluded organisation types are not qualified', () => {
  const excluded = candidate({
    companyName: 'Example University Research Group',
    description: 'A university research institute.',
  })

  const result = qualifyCandidate(excluded, fullRequest)

  assert.equal(result.status, 'not_qualified')
  assert.equal(result.score, 0)
  assert.ok(result.concerns.some((concern) => /Excluded as/.test(concern)))
})
