import { buildPartnerDiscoveryPrompt, PARTNER_DISCOVERY_SYSTEM_PROMPT } from './prompts'
import { qualifyCandidate } from './qualification'
import { enrichPartnerCandidate } from './research'
import { scorePartnerCandidate } from './scoring'
import { discoverPartnersFromWeb } from './web-discovery'
import { MOCK_CANDIDATES } from './__fixtures__/mock-candidates'
import type { PartnerCandidate, PartnerDiscoveryAgent, PartnerDiscoveryDependencies, PartnerDiscoveryRequest, PartnerDiscoveryResult } from './types'

function validateRequest(request: PartnerDiscoveryRequest): void {
  if (!request.country.trim()) throw new Error('Partner discovery requires a country.')
  if (!request.technologyFocus.trim()) throw new Error('Partner discovery requires a technology focus.')
  if (request.partnerTypes.length === 0) throw new Error('Partner discovery requires at least one partner type.')
  if (!Number.isInteger(request.desiredCandidateCount) || request.desiredCandidateCount < 1) {
    throw new Error('Desired candidate count must be a positive integer.')
  }
}

export function createPartnerDiscoveryAgent(dependencies: PartnerDiscoveryDependencies = {}): PartnerDiscoveryAgent {
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
        searchQueriesFailed: 0,
        skippedResults: [],
      }
      return result
    },

    discoverFromWeb(request, provider = dependencies.webSearch) {
      if (!provider) throw new Error('A web search provider is required for web discovery.')
      return discoverPartnersFromWeb(request, provider)
    },

    async researchCandidate(candidate, provider = dependencies.companyResearch) {
      if (!provider) throw new Error('A company research provider is required for enrichment.')
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

export function discoverMockPartners(_request: PartnerDiscoveryRequest): PartnerCandidate[] {
  void _request
  return MOCK_CANDIDATES.map((candidate) => ({ ...candidate }))
}

export function buildDiscoveryPrompt(request: PartnerDiscoveryRequest) {
  return {
    systemPrompt: PARTNER_DISCOVERY_SYSTEM_PROMPT,
    userPrompt: buildPartnerDiscoveryPrompt(request),
  }
}
