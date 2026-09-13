import type { PartnerCandidate } from '../types'

/**
 * Mock partner candidates for testing and demonstrations
 * These should NOT be used in production code
 */
export const MOCK_CANDIDATES: PartnerCandidate[] = [
  {
    companyName: 'Northstar Cyber Systems',
    website: 'https://northstar.example.com',
    country: 'Germany',
    description:
      'Cybersecurity-focused managed services partner for enterprise customers.',
    partnerTypes: ['MSSP', 'Reseller'],
    capabilities: [
      'Cybersecurity',
      'Managed detection and response',
      'Cloud security',
    ],
    industries: ['Enterprise', 'Financial services'],
    customerSegments: ['Enterprise'],
    locations: ['Germany'],
    services: ['Managed detection and response', 'Cloud security'],
    technologies: ['Cybersecurity'],
    vendorPartnerships: [],
    certifications: [],
    evidence: [
      {
        title: 'Northstar Cyber Systems services',
        url: 'https://northstar.example.com/services',
        sourceType: 'company-website',
        excerpt:
          'Security operations and managed detection services.',
      },
    ],
    fitScore: 0,
    qualificationReasons: [],
    concerns: [],
    verificationStatus: 'mock',
    researchStatus: 'unresearched',
    researchSources: [],
  },
  {
    companyName: 'Alpine Digital Partners',
    website: 'https://alpine.example.com',
    country: 'Germany',
    description:
      'Systems integrator delivering cloud transformation and technology consulting.',
    partnerTypes: ['Systems integrator', 'Reseller'],
    capabilities: [
      'Cloud infrastructure',
      'Technology consulting',
      'Cybersecurity',
    ],
    industries: ['Manufacturing', 'Enterprise'],
    customerSegments: ['Enterprise', 'Mid-market'],
    locations: ['Germany'],
    services: ['Cloud transformation', 'Technology consulting'],
    technologies: ['Cloud infrastructure', 'Cybersecurity'],
    vendorPartnerships: [],
    certifications: [],
    evidence: [
      {
        title: 'Alpine Digital Partners overview',
        url: 'https://alpine.example.com/about',
        sourceType: 'company-website',
      },
    ],
    fitScore: 0,
    qualificationReasons: [],
    concerns: [],
    verificationStatus: 'mock',
    researchStatus: 'unresearched',
    researchSources: [],
  },
  {
    companyName: 'Rheinland IT Services',
    website: 'https://rheinland.example.com',
    country: 'Germany',
    description:
      'Regional IT reseller serving growing businesses with infrastructure support.',
    partnerTypes: ['Reseller'],
    capabilities: ['IT infrastructure', 'Endpoint management'],
    industries: ['Professional services'],
    customerSegments: ['SMB'],
    locations: ['Germany'],
    services: ['Infrastructure support'],
    technologies: ['IT infrastructure', 'Endpoint management'],
    vendorPartnerships: [],
    certifications: [],
    evidence: [],
    fitScore: 0,
    qualificationReasons: [],
    concerns: [],
    verificationStatus: 'mock',
    researchStatus: 'unresearched',
    researchSources: [],
  },
]
