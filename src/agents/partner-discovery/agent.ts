import { buildPartnerDiscoveryPrompt, PARTNER_DISCOVERY_SYSTEM_PROMPT } from './prompts'
import { qualifyCandidate } from './qualification'
import { enrichPartnerCandidate } from './research'
import { scorePartnerCandidate } from './scoring'
import { discoverPartnersFromWeb } from './web-discovery'
import type {
  PartnerCandidate,
  PartnerDiscoveryAgent,
  PartnerDiscoveryDependencies,
  PartnerDiscoveryRequest,
  PartnerDiscoveryResult,
} from './types'

const MOCK_CANDIDATES: PartnerCandidate[] = [
  {
    companyName: 'Northstar Cyber Systems',
    website: 'https://northstar.example.com',
    country: 'Germany',
    description: 'Cybersecurity-focused managed services partner for enterprise customers.',
    partnerTypes: ['MSP', 'Reseller'],
    capabilities: ['Cybersecurity', 'Managed detection and response', 'Cloud security'],
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
        excerpt: 'Security operations and managed detection services.',
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
    description: 'Systems integrator delivering cloud transformation and technology consulting.',
    partnerTypes: ['Systems integrator', 'Reseller'],
    capabilities: ['Cloud infrastructure', 'Technology consulting', 'Cybersecurity'],
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
    description: 'Regional IT reseller serving growing businesses with infrastructure support.',
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

function validateRequest(request: PartnerDiscoveryRequest) {
  if (!request.country.trim()) throw new Error('Partner discovery requires a country.')
  if (!request.technologyFocus.trim()) {
    throw new Error('Partner discovery requires a technology focus.')
  }
  if (request.partnerTypes.length === 0) {
    throw new Error('Partner discovery requires at least one partner type.')
  }
  if (!Number.isInteger(request.desiredCandidateCount) || request.desiredCandidateCount < 1) {
    throw new Error('Desired candidate count must be a positive integer.')
  }
}

export function createPartnerDiscoveryAgent(
  dependencies: PartnerDiscoveryDependencies = {}
): PartnerDiscoveryAgent {
  return {
    async discover(request) {
      validateRequest(request)

      const candidates = dependencies.candidateSource
        ? await dependencies.candidateSource.discover(request)
        : discoverMockPartners(request)

      const scoredCandidates = candidates
        .map((candidate) => scorePartnerCandidate(candidate, request))
        .sort((left, right) => right.fitScore - left.fitScore)
        .slice(0, request.desiredCandidateCount)

      const result: PartnerDiscoveryResult = {
        request,
        candidates: scoredCandidates,
        generatedAt: new Date().toISOString(),
        source: dependencies.candidateSource ? 'provider' : 'mock',
        searchQueries: [],
        searchResultsProcessed: 0,
        skippedResults: [],
      }

      return result
    },
    discoverFromWeb(request, provider = dependencies.webSearch) {
      if (!provider) {
        throw new Error('A web search provider is required for web discovery.')
      }

      return discoverPartnersFromWeb(request, provider)
    },
    async researchCandidate(candidate, provider = dependencies.companyResearch) {
      if (!provider) {
        throw new Error('A company research provider is required for enrichment.')
      }

      const research = await provider.research({
        companyName: candidate.companyName,
        website: candidate.website,
        country: candidate.country || undefined,
        sourceEvidence: candidate.evidence,
      })

      return enrichPartnerCandidate(candidate, research)
    },
    qualifyCandidate(candidate, request) {
      return qualifyCandidate(candidate, request)
    },
  }
}

export function discoverMockPartners(request: PartnerDiscoveryRequest) {
  void request
  return MOCK_CANDIDATES.map((candidate) => ({ ...candidate }))
}

export function buildDiscoveryPrompt(request: PartnerDiscoveryRequest) {
  return {
    systemPrompt: PARTNER_DISCOVERY_SYSTEM_PROMPT,
    userPrompt: buildPartnerDiscoveryPrompt(request),
  }
}