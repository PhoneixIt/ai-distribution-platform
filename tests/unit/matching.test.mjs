import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateOpportunityPartnerMatch,
  normalizeMatchValues,
  overlapScore,
} from '../../src/lib/matching/opportunity-partner.ts'

function partner(overrides = {}) {
  return {
    id: 'partner-1',
    name: 'Acme Security',
    country: 'Germany',
    regions: ['Germany'],
    industries: ['Financial Services'],
    companySize: 'Mid-market',
    employeeRange: '51-200',
    specializations: ['Managed Security'],
    certifications: ['ISO 27001'],
    technologies: ['Cybersecurity', 'Microsoft'],
    services: ['MSSP'],
    customerSegments: ['Mid-market'],
    deploymentCapabilities: ['Managed services'],
    salesRegions: ['Germany'],
    isVerified: true,
    verificationStatus: 'verified',
    ...overrides,
  }
}

test('normalizes nested and comma-separated matching values', () => {
  assert.deepEqual(normalizeMatchValues(['Cybersecurity, Microsoft', ['MSSP']]), [
    'cybersecurity',
    'microsoft',
    'mssp',
  ])
})

test('returns a full perfect match at 100', () => {
  const result = calculateOpportunityPartnerMatch(
    {
      requirements: ['MSSP'],
      technologyCategories: ['Cybersecurity'],
      preferredRegion: 'Germany',
      customerIndustry: 'Financial Services',
      customerCompanySize: 'Mid-market',
    },
    partner(),
  )

  assert.equal(result.capabilityFit, 100)
  assert.equal(result.geographyFit, 100)
  assert.equal(result.industryFit, 100)
  assert.equal(result.companySizeFit, 100)
  assert.equal(result.verificationFit, 100)
  assert.equal(result.matchScore, 100)
})

test('returns low overlap when all explicit requirements are absent', () => {
  const result = calculateOpportunityPartnerMatch(
    {
      requirements: ['ERP'],
      technologyCategories: ['SAP'],
      preferredRegion: 'France',
      customerIndustry: 'Healthcare',
      customerCompanySize: 'Enterprise',
    },
    partner({ isVerified: false, verificationStatus: 'unverified' }),
  )

  assert.equal(result.capabilityFit, 0)
  assert.equal(result.geographyFit, 0)
  assert.equal(result.industryFit, 0)
  assert.equal(result.companySizeFit, 0)
  assert.equal(result.verificationFit, 50)
  assert.equal(result.matchScore, 5)
})

test('uses neutral defaults when customer matching data is missing', () => {
  const result = calculateOpportunityPartnerMatch(
    {
      requirements: ['MSSP'],
      technologyCategories: ['Cybersecurity'],
    },
    partner(),
  )

  assert.equal(result.industryFit, 50)
  assert.equal(result.companySizeFit, 50)
  assert.equal(result.geographyFit, 50)
})

test('handles missing partner attributes without throwing', () => {
  const result = calculateOpportunityPartnerMatch(
    {
      requirements: ['MSSP'],
      technologyCategories: ['Cybersecurity'],
      preferredRegion: 'Germany',
      customerIndustry: 'Finance',
      customerCompanySize: 'Mid-market',
    },
    {
      id: 'partner-2',
      name: 'Sparse Partner',
    },
  )

  assert.equal(result.capabilityFit, 0)
  assert.equal(result.geographyFit, 0)
  assert.equal(result.industryFit, 0)
  assert.equal(result.companySizeFit, 0)
  assert.equal(result.verificationFit, 50)
})

test('overlapScore is zero for missing or empty inputs', () => {
  assert.equal(overlapScore([], ['x']), 0)
  assert.equal(overlapScore(['x'], []), 0)
})
