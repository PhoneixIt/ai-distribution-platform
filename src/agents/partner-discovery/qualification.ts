import { SCORING_MODEL, QUALIFICATION_THRESHOLDS, calculateMatchPercentage } from './scoring-model'
import { deduplicateEvidence, formatEvidenceForDisplay, findMatchingEvidence } from './evidence-utils'
import type {
  PartnerCandidate,
  PartnerDiscoveryRequest,
  PartnerEvidenceSource,
  QualificationCriterion,
  QualificationResult,
} from './types'

/**
 * Normalize a string for comparison
 */
function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Check if any candidate values match the requested value
 */
function matchesRequestedValue(values: string[], requestedValue: string): boolean {
  const requested = normalize(requestedValue)
  return values.some((value) => {
    const normalized = normalize(value)
    return (
      normalized === requested ||
      normalized.includes(requested) ||
      requested.includes(normalized)
    )
  })
}

/**
 * Get all searchable text from a candidate (name, description, evidence)
 */
function searchableCandidateText(candidate: PartnerCandidate): string {
  return [
    candidate.companyName,
    candidate.description,
    ...candidate.evidence.map((source) => `${source.title} ${source.excerpt || ''}`),
  ]
    .join(' ')
    .toLowerCase()
}

/**
 * Find evidence sources that mention a value
 */
function evidenceFor(
  candidate: PartnerCandidate,
  requestedValue: string,
  values: string[]
): PartnerEvidenceSource[] {
  return findMatchingEvidence(candidate.evidence, [
    requestedValue,
    ...values,
  ])
}

/**
 * Infer partner types from text (MSSP, MSP, SI, VAR, Reseller, Distributor)
 */
function inferPartnerTypes(text: string): string[] {
  const inferred: string[] = []
  if (
    /\bmanaged security service provider\b|\bmanaged security services?\b|\bmanaged detection and response\b|\bmanaged SOC\b/i.test(
      text
    )
  )
    inferred.push('MSSP')
  if (
    /\bmanaged service provider\b|\bmanaged services?\b/i.test(text)
  )
    inferred.push('MSP')
  if (/\bsystem integrator\b|\bsystems integration\b/i.test(text))
    inferred.push('System Integrator')
  if (/\bvalue[- ]added reseller\b|\bVAR\b/i.test(text))
    inferred.push('Value-added Reseller')
  if (/\breseller\b/i.test(text)) inferred.push('Reseller')
  if (/\bdistributor\b/i.test(text)) inferred.push('Distributor')
  return [...new Set(inferred)]
}

/**
 * Infer customer segments from text (SMB, Mid-market, Enterprise)
 */
function inferCustomerSegments(text: string): string[] {
  const segments: string[] = []
  if (
    /\bmid[- ]market\b|\bmid[- ]size(?:d)? companies?\b|\bmidsize businesses?\b/i.test(
      text
    )
  )
    segments.push('Mid-market')
  if (
    /\bmittelstand\b|\bmittelständ\w*\b|\bKMU\b|\bSME(?:s)?\b|\bsmall and medium[- ]sized (?:businesses|companies|enterprises)\b/i.test(
      text
    )
  )
    segments.push('SMB')
  if (
    /\benterprise(?:s)?\b|\blarge enterprises?\b|\bcorporate (?:clients|customers)\b/i.test(
      text
    )
  )
    segments.push('Enterprise')
  return [...new Set(segments)]
}

/**
 * Criterion state: matched, unmet, or unknown
 */
type CriterionState = 'matched' | 'unmet' | 'unknown'
type EvaluatedCriterion = {
  state: CriterionState
  criterion: QualificationCriterion
}

/**
 * Exclusion rules for disqualifying candidates
 */
const EXCLUSION_RULES: Array<{ label: string; pattern: RegExp }> = [
  {
    label: 'government/public authority',
    pattern:
      /\b(?:government|federal|municipal|ministry|parliament|bundesregierung|bundesamt|behörde|behoerde)\b/i,
  },
  {
    label: 'research/academic organization',
    pattern:
      /\b(?:university|universit(?:y|ät)|research institute|research center|forschungseinrichtung|institut für|wissenschaft)\b/i,
  },
  {
    label: 'media/news publisher',
    pattern:
      /\b(?:news publisher|news outlet|magazine|journalist|media company|publication|editorial)\b/i,
  },
  {
    label: 'insurance company',
    pattern:
      /\b(?:insurance company|insurance provider|versicherung|versicherer|insurer)\b/i,
  },
  {
    label: 'association/federation',
    pattern: /\b(?:association|federation|verband|verein|chamber|kammer)\b/i,
  },
]

/**
 * Rule to detect article/report pages pretending to be companies
 */
const ARTICLE_TITLE_RULE =
  /\b(?:study|studie|report|bericht|news|article|obligations|deadlines|measures|workforce|lagebild|state of|home page)\b/i

/**
 * Create a qualification criterion
 */
function criterion(
  key: QualificationCriterion['key'],
  label: string,
  requestedValue: string,
  weight: number,
  evidence: PartnerEvidenceSource[]
): QualificationCriterion {
  return { key, label, requestedValue, weight, evidence }
}

/**
 * Evaluate a criterion: matched, unmet, or unknown
 */
function evaluate(
  item: QualificationCriterion,
  explicitValues: string[],
  searchableText = ''
): EvaluatedCriterion {
  if (matchesRequestedValue(explicitValues, item.requestedValue)) {
    return { state: 'matched', criterion: item }
  }
  if (
    searchableText &&
    normalize(searchableText).includes(normalize(item.requestedValue))
  ) {
    return { state: 'matched', criterion: item }
  }
  return {
    state: explicitValues.length ? 'unmet' : 'unknown',
    criterion: item,
  }
}

/**
 * Evaluate country criterion
 */
function evaluateCountry(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): EvaluatedCriterion {
  const values = [candidate.country, ...candidate.locations].filter(Boolean)
  return evaluate(
    criterion(
      'country',
      'Country or market',
      request.country,
      SCORING_MODEL.country,
      evidenceFor(candidate, request.country, values)
    ),
    values,
    searchableCandidateText(candidate)
  )
}

/**
 * Evaluate partner type criterion
 */
function evaluatePartnerType(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): EvaluatedCriterion {
  const values = [
    ...new Set([
      ...candidate.partnerTypes,
      ...inferPartnerTypes(searchableCandidateText(candidate)),
    ]),
  ]
  const requestedValue = request.partnerTypes.join(', ')
  const item = criterion(
    'partnerType',
    'Partner type',
    requestedValue,
    SCORING_MODEL.partnerType,
    evidenceFor(candidate, requestedValue, values)
  )
  if (!values.length) return { state: 'unknown', criterion: item }
  return {
    state: request.partnerTypes.some((type) =>
      matchesRequestedValue(values, type)
    )
      ? 'matched'
      : 'unmet',
    criterion: item,
  }
}

/**
 * Evaluate technology criterion
 */
function evaluateTechnology(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): EvaluatedCriterion {
  const values = [...candidate.technologies, ...candidate.capabilities]
  return evaluate(
    criterion(
      'technology',
      'Technology focus',
      request.technologyFocus,
      SCORING_MODEL.technology,
      evidenceFor(candidate, request.technologyFocus, values)
    ),
    values,
    searchableCandidateText(candidate)
  )
}

/**
 * Evaluate customer segment criterion (optional)
 */
function evaluateCustomerSegment(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): EvaluatedCriterion | undefined {
  if (!request.customerSegment?.trim()) return undefined
  const values = [
    ...new Set([
      ...candidate.customerSegments,
      ...inferCustomerSegments(searchableCandidateText(candidate)),
    ]),
  ]
  return evaluate(
    criterion(
      'customerSegment',
      'Customer segment',
      request.customerSegment,
      SCORING_MODEL.customerSegment,
      evidenceFor(candidate, request.customerSegment, values)
    ),
    values,
    searchableCandidateText(candidate)
  )
}

/**
 * Evaluate an optional criterion
 */
function optionalCriterion(
  candidate: PartnerCandidate,
  key: QualificationCriterion['key'],
  label: string,
  requestedValue: string | undefined,
  weight: number,
  values: string[]
): EvaluatedCriterion | undefined {
  if (!requestedValue?.trim()) return undefined
  return evaluate(
    criterion(
      key,
      label,
      requestedValue,
      weight,
      evidenceFor(candidate, requestedValue, values)
    ),
    values,
    searchableCandidateText(candidate)
  )
}

/**
 * Check if a candidate is excluded by rules
 */
function exclusionFor(candidate: PartnerCandidate): string | undefined {
  const identityText = [
    candidate.companyName,
    candidate.description,
    ...candidate.evidence
      .filter((source) => source.sourceType === 'search-result')
      .map((source) => `${source.title} ${source.excerpt || ''}`),
  ].join(' ')

  const matchedRule = EXCLUSION_RULES.find((rule) =>
    rule.pattern.test(identityText)
  )
  if (matchedRule) return matchedRule.label

  if (ARTICLE_TITLE_RULE.test(candidate.companyName) && !candidate.partnerTypes.length) {
    return 'article/report/search-result page'
  }

  return undefined
}

/**
 * Qualify a partner candidate against a discovery request
 * Returns detailed qualification result with score, status, reasons, and concerns
 */
export function qualifyCandidate(
  candidate: PartnerCandidate,
  request: PartnerDiscoveryRequest
): QualificationResult {
  const exclusion = exclusionFor(candidate)

  // Evaluate all criteria
  const evaluated: EvaluatedCriterion[] = [
    evaluateCountry(candidate, request),
    ...(request.partnerTypes.length ? [evaluatePartnerType(candidate, request)] : []),
    evaluateTechnology(candidate, request),
  ]

  // Add optional criteria
  const optionalCriteria = [
    evaluateCustomerSegment(candidate, request),
    optionalCriterion(
      candidate,
      'industry',
      'Industry',
      request.industry,
      SCORING_MODEL.industry,
      candidate.industries
    ),
    optionalCriterion(
      candidate,
      'serviceOrCapability',
      'Service or capability',
      request.serviceOrCapability,
      SCORING_MODEL.serviceOrCapability,
      [...candidate.services, ...candidate.capabilities]
    ),
    optionalCriterion(
      candidate,
      'vendorPartnership',
      'Vendor partnership',
      request.vendorPartnership,
      SCORING_MODEL.vendorPartnership,
      candidate.vendorPartnerships
    ),
    optionalCriterion(
      candidate,
      'certification',
      'Certification',
      request.certification,
      SCORING_MODEL.certification,
      candidate.certifications
    ),
    optionalCriterion(
      candidate,
      'companySize',
      'Company size',
      request.companySize,
      SCORING_MODEL.companySize,
      candidate.companySize ? [candidate.companySize] : []
    ),
  ]
  evaluated.push(
    ...optionalCriteria.filter((item): item is EvaluatedCriterion =>
      Boolean(item)
    )
  )

  // Calculate scores
  const totalWeight = evaluated.reduce((total, item) => total + item.criterion.weight, 0)
  const matchedWeight = evaluated
    .filter((item) => item.state === 'matched')
    .reduce((total, item) => total + item.criterion.weight, 0)
  const score = calculateMatchPercentage(matchedWeight, totalWeight)

  // Categorize criteria
  const matchedCriteria = evaluated
    .filter((item) => item.state === 'matched')
    .map((item) => item.criterion)
  const unmetCriteria = evaluated
    .filter((item) => item.state === 'unmet')
    .map((item) => item.criterion)
  const unknownCriteria = evaluated
    .filter((item) => item.state === 'unknown')
    .map((item) => item.criterion)

  // Collect unique evidence
  const evidence = deduplicateEvidence(
    evaluated.flatMap((item) => item.criterion.evidence)
  )

  // Build reasons and concerns
  const reasons = matchedCriteria.map(
    (item) =>
      `${item.label} matched: ${item.requestedValue}.${formatEvidenceForDisplay(item.evidence)}`
  )
  const concerns = [
    ...(exclusion ? [`Excluded as ${exclusion}.`] : []),
    ...unmetCriteria.map(
      (item) =>
        `${item.label} does not meet the request: ${item.requestedValue}.${formatEvidenceForDisplay(item.evidence)}`
    ),
    ...unknownCriteria.map(
      (item) =>
        `${item.label} is unknown from the available evidence: ${item.requestedValue}.`
    ),
  ]

  // Determine status based on unified thresholds
  let status: QualificationResult['status']
  if (exclusion) {
    status = 'not_qualified'
  } else if (unmetCriteria.length > 0) {
    status = 'not_qualified'
  } else {
    const matchRate = matchedCriteria.length / evaluated.length
    status =
      matchRate >= QUALIFICATION_THRESHOLDS.qualified
        ? 'qualified'
        : 'needs_review'
  }

  // Calculate confidence
  const explicitCriteria = matchedCriteria.length + unmetCriteria.length
  const confidence =
    Math.round(((explicitCriteria / evaluated.length) * 100) / 100)

  return {
    status,
    score: exclusion ? 0 : score,
    reasons,
    concerns,
    matchedCriteria,
    unmetCriteria,
    unknownCriteria,
    evidence,
    confidence: exclusion ? Math.min(confidence, 0.35) : confidence,
  }
}
