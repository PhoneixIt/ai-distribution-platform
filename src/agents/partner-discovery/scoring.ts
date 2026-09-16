import { SCORING_MODEL } from './scoring-model'
import type { PartnerCandidate, PartnerDiscoveryRequest } from './types'

function normalize(value: string): string { return value.trim().toLowerCase() }

function matches(candidateValues: string[], requestedValue?: string): boolean {
  if (!requestedValue) return false
  const request = normalize(requestedValue)
  return candidateValues.some((value) => {
    const candidate = normalize(value)
    return candidate === request || candidate.includes(request) || request.includes(candidate)
  })
}

function hasTechnologyMatch(candidate: PartnerCandidate, request: PartnerDiscoveryRequest): boolean {
  const technology = normalize(request.technologyFocus)
  const searchableText = [candidate.description, ...candidate.capabilities, ...candidate.technologies].join(' ').toLowerCase()
  return searchableText.includes(technology)
}

export function calculatePartnerFitScore(candidate: PartnerCandidate, request: PartnerDiscoveryRequest): number {
  let score = 0
  if (normalize(candidate.country) === normalize(request.country) || (request.market && normalize(candidate.country) === normalize(request.market))) score += SCORING_MODEL.country
  if (request.partnerTypes.some((type) => matches(candidate.partnerTypes, type))) score += SCORING_MODEL.partnerType
  if (hasTechnologyMatch(candidate, request)) score += SCORING_MODEL.technology
  if (matches(candidate.industries, request.industry)) score += SCORING_MODEL.industry
  if (matches(candidate.customerSegments, request.customerSegment)) score += SCORING_MODEL.customerSegment
  return score
}

export function explainPartnerFit(candidate: PartnerCandidate, request: PartnerDiscoveryRequest) {
  const reasons: string[] = []
  const concerns: string[] = []
  if (normalize(candidate.country) === normalize(request.country)) reasons.push(`Operates in the requested country: ${request.country}.`)
  else concerns.push(`Country coverage does not clearly match ${request.country}.`)
  if (request.partnerTypes.some((type) => matches(candidate.partnerTypes, type))) reasons.push('Supports at least one requested partner type.')
  else concerns.push('No requested partner type is confirmed.')
  if (hasTechnologyMatch(candidate, request)) reasons.push(`Shows capability related to ${request.technologyFocus}.`)
  else concerns.push(`Technology focus for ${request.technologyFocus} is not confirmed.`)
  if (request.industry && matches(candidate.industries, request.industry)) reasons.push(`Serves the requested industry: ${request.industry}.`)
  else if (request.industry) concerns.push(`Industry fit for ${request.industry} is not confirmed.`)
  if (request.customerSegment && matches(candidate.customerSegments, request.customerSegment)) reasons.push(`Reaches the requested customer segment: ${request.customerSegment}.`)
  else if (request.customerSegment) concerns.push(`Customer segment fit for ${request.customerSegment} is not confirmed.`)
  if (candidate.evidence.length === 0) concerns.push('No supporting sources are attached yet.')
  return { reasons, concerns }
}

export function scorePartnerCandidate(candidate: PartnerCandidate, request: PartnerDiscoveryRequest): PartnerCandidate {
  const fitScore = calculatePartnerFitScore(candidate, request)
  const { reasons, concerns } = explainPartnerFit(candidate, request)
  return { ...candidate, fitScore, qualificationReasons: reasons, concerns }
}
