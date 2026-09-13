import { buildPartnerDiscoveryPrompt, PARTNER_DISCOVERY_SYSTEM_PROMPT } from './prompts'
import { scorePartnerCandidate } from './scoring'
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
    evidence: [],
    fitScore: 0,
    qualificationReasons: [],
    concerns: [],
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
      }

      return result
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