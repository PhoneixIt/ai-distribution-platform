import { SCORING_MODEL, calculateMatchPercentage } from './scoring-model'
import type {
  PartnerCandidate,
  PartnerDiscoveryRequest,
} from './types'

/**
 * Normalize a string for comparison (trim, lowercase)
 */
function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Check if any candidate values match the requested value
 * Uses substring matching: exact, contains, or is contained
 */
function matches(candidateValues: string[], requestedValue?: string): boolean {
  if (!requestedValue) return false

  const request = normalize(requestedValue)
  return candidateValues.some((value) => {
    const candidate = normalize(value)
    return (
      candidate === request ||
      candidate.includes(request) ||
      request.includes(candidate)
    )
  })
}

/**
 * Check if candidate has technology match
 * Searches both explicit technologies list and description/capabilities
 */
function hasTechnologyMatch(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): boolean {
  const technology = normalize(request.technologyFocus)
  const searchableText = [
    candidate.description,
    ...candidate.capabilities,
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(technology)
}

/**
 * Calculate partner fit score against discovery request
 * Returns a score between 0-100 based on weighted criteria matches
 */
export function calculatePartnerFitScore(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): number {
  let score = 0

  // Geography: exact country match or market match
  if (
    normalize(candidate.country) === normalize(request.country) ||
    (request.market && normalize(candidate.country) === normalize(request.market))
  ) {
    score += SCORING_MODEL.country
  }

  // Partner type: must match at least one requested type
  if (request.partnerTypes.some((type) => matches(candidate.partnerTypes, type))) {
    score += SCORING_MODEL.partnerType
  }

  // Technology: must appear in capabilities or description
  if (hasTechnologyMatch(candidate, request)) {
    score += SCORING_MODEL.technology
  }

  // Industry: optional but weighted if provided and matched
  if (matches(candidate.industries, request.industry)) {
    score += SCORING_MODEL.industry
  }

  // Customer segment: optional but weighted if provided and matched
  if (matches(candidate.customerSegments, request.customerSegment)) {
    score += SCORING_MODEL.customerSegment
  }

  return score
}

/**
 * Generate human-readable reasons and concerns for a partner's fit
 */
export function explainPartnerFit(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
) {
  const reasons: string[] = []
  const concerns: string[] = []

  // Country
  if (normalize(candidate.country) === normalize(request.country)) {
    reasons.push(`Operates in the requested country: ${request.country}.`)
  } else {
    concerns.push(`Country coverage does not clearly match ${request.country}.`)
  }

  // Partner type
  if (request.partnerTypes.some((type) => matches(candidate.partnerTypes, type))) {
    reasons.push('Supports at least one requested partner type.')
  } else {
    concerns.push('No requested partner type is confirmed.')
  }

  // Technology
  if (hasTechnologyMatch(candidate, request)) {
    reasons.push(`Shows capability related to ${request.technologyFocus}.`)
  } else {
    concerns.push(
      `Technology focus for ${request.technologyFocus} is not confirmed.`
    )
  }

  // Industry (optional)
  if (request.industry && matches(candidate.industries, request.industry)) {
    reasons.push(`Serves the requested industry: ${request.industry}.`)
  } else if (request.industry) {
    concerns.push(`Industry fit for ${request.industry} is not confirmed.`)
  }

  // Customer segment (optional)
  if (
    request.customerSegment &&
    matches(candidate.customerSegments, request.customerSegment)
  ) {
    reasons.push(
      `Reaches the requested customer segment: ${request.customerSegment}.`
    )
  } else if (request.customerSegment) {
    concerns.push(
      `Customer segment fit for ${request.customerSegment} is not confirmed.`
    )
  }

  // Evidence
  if (candidate.evidence.length === 0) {
    concerns.push('No supporting sources are attached yet.')
  }

  return { reasons, concerns }
}

/**
 * Score a partner candidate and attach fit score + reasons
 */
export function scorePartnerCandidate(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): PartnerCandidate {
  const fitScore = calculatePartnerFitScore(candidate, request)
  const { reasons, concerns } = explainPartnerFit(candidate, request)

  return {
    ...candidate,
    fitScore,
    qualificationReasons: reasons,
    concerns,
  }
}
