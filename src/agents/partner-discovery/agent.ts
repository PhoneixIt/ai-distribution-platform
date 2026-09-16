import { buildPartnerDiscoveryPrompt, PARTNER_DISCOVERY_SYSTEM_PROMPT } from './prompts'
import { qualifyCandidate } from './qualification'
import { enrichPartnerCandidate } from './research'
import { scorePartnerCandidate } from './scoring'
import { discoverPartnersFromWeb } from './web-discovery'
import { MOCK_CANDIDATES } from './__fixtures__/mock-candidates'
import type {
  PartnerCandidate,
  PartnerDiscoveryAgent,
  PartnerDiscoveryDependencies,
  PartnerDiscoveryRequest,
  PartnerDiscoveryResult,
} from './types'

/**
 * Validate partner discovery request has required fields
 */
function validateRequest(request: PartnerDiscoveryRequest): void {
  if (!request.country.trim()) {
    throw new Error('Partner discovery requires a country.')
  }
  if (!request.technologyFocus.trim()) {
    throw new Error('Partner discovery requires a technology focus.')
  }
  if (request.partnerTypes.length === 0) {
    throw new Error('Partner discovery requires at least one partner type.')
  }
  if (
    !Number.isInteger(request.desiredCandidateCount) ||
    request.desiredCandidateCount < 1
  ) {
    throw new Error('Desired candidate count must be a positive integer.')
  }
}

/**
 * Create a partner discovery agent with optional dependencies
 * If dependencies are not provided, mock data will be used
 */
export function createPartnerDiscoveryAgent(
  dependencies: PartnerDiscoveryDependencies = {}
): PartnerDiscoveryAgent {
  return {
    /**
     * Discover partners using a candidate source (or mock data)
     */
    async discover(request) {
      validateRequest(request)

      // Use provided candidate source or fall back to mock
      const candidates = dependencies.candidateSource
        ? await dependencies.candidateSource.discover(request)
        : discoverMockPartners(request)

      // Score and rank candidates
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

    /**
     * Discover partners from web search
     */
    discoverFromWeb(request, provider = dependencies.webSearch) {
      if (!provider) {
        throw new Error('A web search provider is required for web discovery.')
      }

      return discoverPartnersFromWeb(request, provider)
    },

    /**
     * Research and enrich a candidate with additional data
     */
    async researchCandidate(
      candidate,
      provider = dependencies.companyResearch
    ) {
      if (!provider) {
        throw new Error(
          'A company research provider is required for enrichment.'
        )
      }

      const research = await provider.research({
        companyName: candidate.companyName,
        website: candidate.website,
        country: candidate.country || undefined,
        sourceEvidence: candidate.evidence,
      })

      return enrichPartnerCandidate(candidate, research)
    },

    /**
     * Qualify a candidate against a discovery request
     */
    qualifyCandidate(candidate, request) {
      return qualifyCandidate(candidate, request)
    },
  }
}

/**
 * Get mock partners for testing and demonstrations
 * Returns a copy of mock candidates to avoid mutations
 */
export function discoverMockPartners(
  _request: PartnerDiscoveryRequest
): PartnerCandidate[] {
  // Return deep copies to prevent mutation of fixtures
  return MOCK_CANDIDATES.map((candidate) => ({ ...candidate }))
}

/**
 * Build a discovery prompt for LLM-based discovery
 */
export function buildDiscoveryPrompt(request: PartnerDiscoveryRequest) {
  return {
    systemPrompt: PARTNER_DISCOVERY_SYSTEM_PROMPT,
    userPrompt: buildPartnerDiscoveryPrompt(request),
  }
}
