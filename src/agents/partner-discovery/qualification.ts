import type {
  PartnerCandidate,
  PartnerDiscoveryRequest,
  PartnerEvidenceSource,
  QualificationCriterion,
  QualificationResult,
} from './types'

const QUALIFICATION_WEIGHTS = {
  country: 25,
  partnerType: 25,
  technology: 20,
  industry: 8,
  customerSegment: 15,
  serviceOrCapability: 4,
  vendorPartnership: 2,
  certification: 1,
  companySize: 0,
} as const

type CriterionState = 'matched' | 'unmet' | 'unknown'
type EvaluatedCriterion = { state: CriterionState; criterion: QualificationCriterion }

const EXCLUSION_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: 'government/public authority', pattern: /\b(?:government|federal|municipal|ministry|parliament|bundesregierung|bundesamt|behörde|behoerde)\b/i },
  { label: 'research/academic organization', pattern: /\b(?:university|universit(?:y|ät)|research institute|research center|forschungseinrichtung|institut für|wissenschaft)\b/i },
  { label: 'media/news publisher', pattern: /\b(?:news publisher|news outlet|magazine|journalist|media company|publication|editorial)\b/i },
  { label: 'insurance company', pattern: /\b(?:insurance company|insurance provider|versicherung|versicherer|insurer)\b/i },
  { label: 'association/federation', pattern: /\b(?:association|federation|verband|verein|chamber|kammer)\b/i },
]

const ARTICLE_TITLE_RULE = /\b(?:study|studie|report|bericht|news|article|obligations|deadlines|measures|workforce|lagebild|state of|home page)\b/i

function normalize(value: string) { return value.trim().toLowerCase() }

function matchesRequestedValue(values: string[], requestedValue: string) {
  const requested = normalize(requestedValue)
  return values.some((value) => {
    const normalized = normalize(value)
    return normalized === requested || normalized.includes(requested) || requested.includes(normalized)
  })
}

function searchableCandidateText(candidate: PartnerCandidate) {
  return [candidate.companyName, candidate.description, ...candidate.evidence.map((source) => `${source.title} ${source.excerpt || ''}`)].join(' ').toLowerCase()
}

function evidenceFor(candidate: PartnerCandidate, requestedValue: string, values: string[]) {
  const terms = [requestedValue, ...values].map(normalize).filter(Boolean)
  return candidate.evidence.filter((source) => {
    const text = normalize(`${source.title} ${source.excerpt || ''}`)
    return terms.some((term) => text.includes(term))
  })
}

function uniqueEvidence(evidence: PartnerEvidenceSource[]) {
  return evidence.filter((source, index, sources) => sources.findIndex((other) => other.url === source.url && other.excerpt === source.excerpt) === index)
}

function criterion(key: QualificationCriterion['key'], label: string, requestedValue: string, weight: number, evidence: PartnerEvidenceSource[]): QualificationCriterion {
  return { key, label, requestedValue, weight, evidence }
}

function inferPartnerTypes(text: string) {
  const inferred: string[] = []
  if (/\bmanaged security service provider\b|\bmanaged security services?\b|\bmanaged detection and response\b|\bmanaged SOC\b|\bMSSP\b/i.test(text)) inferred.push('MSSP')
  if (/\bmanaged service provider\b|\bmanaged services?\b|\bMSP\b/i.test(text)) inferred.push('MSP')
  if (/\bsystem integrator\b|\bsystems integration\b/i.test(text)) inferred.push('System Integrator')
  if (/\bvalue[- ]added reseller\b|\bVAR\b/i.test(text)) inferred.push('Value-added Reseller')
  if (/\breseller\b/i.test(text)) inferred.push('Reseller')
  if (/\bdistributor\b/i.test(text)) inferred.push('Distributor')
  return [...new Set(inferred)]
}

function inferCustomerSegments(text: string) {
  const segments: string[] = []
  if (/\bmid[- ]market\b|\bmid[- ]size(?:d)? companies?\b|\bmidsize businesses?\b/i.test(text)) segments.push('Mid-market')
  if (/\bmittelstand\b|\bmittelständ\w*\b|\bKMU\b|\bSME(?:s)?\b|\bsmall and medium[- ]sized (?:businesses|companies|enterprises)\b/i.test(text)) segments.push('SMB')
  if (/\benterprise(?:s)?\b|\blarge enterprises?\b|\bcorporate (?:clients|customers)\b/i.test(text)) segments.push('Enterprise')
  return [...new Set(segments)]
}

function evaluate(item: QualificationCriterion, explicitValues: string[], searchableText = ''): EvaluatedCriterion {
  if (matchesRequestedValue(explicitValues, item.requestedValue)) return { state: 'matched', criterion: item }
  if (searchableText && normalize(searchableText).includes(normalize(item.requestedValue))) return { state: 'matched', criterion: item }
  return { state: explicitValues.length ? 'unmet' : 'unknown', criterion: item }
}

function evaluateCountry(candidate: PartnerCandidate, request: PartnerDiscoveryRequest) {
  const values = [candidate.country, ...candidate.locations].filter(Boolean)
  return evaluate(criterion('country', 'Country or market', request.country, QUALIFICATION_WEIGHTS.country, evidenceFor(candidate, request.country, values)), values, searchableCandidateText(candidate))
}

function evaluatePartnerType(candidate: PartnerCandidate, request: PartnerDiscoveryRequest): EvaluatedCriterion {
  const values = [...new Set([...candidate.partnerTypes, ...inferPartnerTypes(searchableCandidateText(candidate))])]
  const requestedValue = request.partnerTypes.join(', ')
  const item = criterion('partnerType', 'Partner type', requestedValue, QUALIFICATION_WEIGHTS.partnerType, evidenceFor(candidate, requestedValue, values))
  if (!values.length) return { state: 'unknown', criterion: item }
  return { state: request.partnerTypes.some((type) => matchesRequestedValue(values, type)) ? 'matched' : 'unmet', criterion: item }
}

function evaluateTechnology(candidate: PartnerCandidate, request: PartnerDiscoveryRequest) {
  const values = [...candidate.technologies, ...candidate.capabilities]
  return evaluate(criterion('technology', 'Technology focus', request.technologyFocus, QUALIFICATION_WEIGHTS.technology, evidenceFor(candidate, request.technologyFocus, values)), values, searchableCandidateText(candidate))
}

function evaluateCustomerSegment(candidate: PartnerCandidate, request: PartnerDiscoveryRequest) {
  if (!request.customerSegment?.trim()) return undefined
  const values = [...new Set([...candidate.customerSegments, ...inferCustomerSegments(searchableCandidateText(candidate))])]
  return evaluate(criterion('customerSegment', 'Customer segment', request.customerSegment, QUALIFICATION_WEIGHTS.customerSegment, evidenceFor(candidate, request.customerSegment, values)), values, searchableCandidateText(candidate))
}

function optionalCriterion(candidate: PartnerCandidate, key: QualificationCriterion['key'], label: string, requestedValue: string | undefined, weight: number, values: string[]) {
  if (!requestedValue?.trim()) return undefined
  return evaluate(criterion(key, label, requestedValue, weight, evidenceFor(candidate, requestedValue, values)), values, searchableCandidateText(candidate))
}

function formatEvidence(evidence: PartnerEvidenceSource[]) {
  return evidence.length ? ` Sources: ${evidence.slice(0, 3).map((source) => source.url).join(', ')}` : ''
}

function exclusionFor(candidate: PartnerCandidate) {
  const identityText = [candidate.companyName, candidate.description, ...candidate.evidence.filter((source) => source.sourceType === 'search-result').map((source) => `${source.title} ${source.excerpt || ''}`)].join(' ')
  const matchedRule = EXCLUSION_RULES.find((rule) => rule.pattern.test(identityText))
  if (matchedRule) return matchedRule.label
  if (ARTICLE_TITLE_RULE.test(candidate.companyName) && !candidate.partnerTypes.length) return 'article/report/search-result page'
  return undefined
}

export function qualifyCandidate(candidate: PartnerCandidate, request: PartnerDiscoveryRequest): QualificationResult {
  const exclusion = exclusionFor(candidate)
  const evaluated: EvaluatedCriterion[] = [
    evaluateCountry(candidate, request),
    ...(request.partnerTypes.length ? [evaluatePartnerType(candidate, request)] : []),
    evaluateTechnology(candidate, request),
  ]

  const optionalCriteria = [
    evaluateCustomerSegment(candidate, request),
    optionalCriterion(candidate, 'industry', 'Industry', request.industry, QUALIFICATION_WEIGHTS.industry, candidate.industries),
    optionalCriterion(candidate, 'serviceOrCapability', 'Service or capability', request.serviceOrCapability, QUALIFICATION_WEIGHTS.serviceOrCapability, [...candidate.services, ...candidate.capabilities]),
    optionalCriterion(candidate, 'vendorPartnership', 'Vendor partnership', request.vendorPartnership, QUALIFICATION_WEIGHTS.vendorPartnership, candidate.vendorPartnerships),
    optionalCriterion(candidate, 'certification', 'Certification', request.certification, QUALIFICATION_WEIGHTS.certification, candidate.certifications),
    optionalCriterion(candidate, 'companySize', 'Company size', request.companySize, QUALIFICATION_WEIGHTS.companySize, candidate.companySize ? [candidate.companySize] : []),
  ]
  evaluated.push(...optionalCriteria.filter((item): item is EvaluatedCriterion => Boolean(item)))

  const totalWeight = evaluated.reduce((total, item) => total + item.criterion.weight, 0)
  const matchedWeight = evaluated.filter((item) => item.state === 'matched').reduce((total, item) => total + item.criterion.weight, 0)
  const score = totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0
  const matchedCriteria = evaluated.filter((item) => item.state === 'matched').map((item) => item.criterion)
  const unmetCriteria = evaluated.filter((item) => item.state === 'unmet').map((item) => item.criterion)
  const unknownCriteria = evaluated.filter((item) => item.state === 'unknown').map((item) => item.criterion)
  const evidence = uniqueEvidence(evaluated.flatMap((item) => item.criterion.evidence))

  const reasons = matchedCriteria.map((item) => `${item.label} matched: ${item.requestedValue}.${formatEvidence(item.evidence)}`)
  const concerns = [
    ...(exclusion ? [`Excluded as ${exclusion}.`] : []),
    ...unmetCriteria.map((item) => `${item.label} does not meet the request: ${item.requestedValue}.${formatEvidence(item.evidence)}`),
    ...unknownCriteria.map((item) => `${item.label} is unknown from the available evidence: ${item.requestedValue}.`),
  ]

  const status: QualificationResult['status'] = exclusion ? 'not_qualified' : unmetCriteria.length ? 'not_qualified' : unknownCriteria.length ? 'needs_review' : 'qualified'
  const confidence = Math.round(((matchedCriteria.length + unmetCriteria.length) / evaluated.length) * 100) / 100

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

export function runQualificationDemoScenarios() {
  const evidence: PartnerEvidenceSource[] = [{ title: 'Security services', url: 'https://northstar.example.com/services', sourceType: 'company-website', excerpt: 'Managed security service provider for mid-market customers in Germany.' }]
  const baseCandidate: PartnerCandidate = {
    companyName: 'Northstar Cyber Systems', website: 'https://northstar.example.com', country: 'Germany', description: 'Managed security service provider for mid-market customers.', partnerTypes: ['MSSP'], capabilities: ['Cybersecurity'], industries: [], customerSegments: ['Mid-market'], locations: ['Germany'], services: ['Managed security services'], technologies: ['Cybersecurity'], vendorPartnerships: [], certifications: [], evidence, fitScore: 80, qualificationReasons: [], concerns: [], verificationStatus: 'preliminary', researchStatus: 'researched', researchSources: evidence,
  }
  const strongRequest: PartnerDiscoveryRequest = { country: 'Germany', partnerTypes: ['MSSP'], technologyFocus: 'Cybersecurity', customerSegment: 'Mid-market', desiredCandidateCount: 1 }
  const partialRequest: PartnerDiscoveryRequest = { ...strongRequest, partnerTypes: ['MSP'] }
  const mismatchCandidate = { ...baseCandidate, country: 'France', locations: ['France'] }
  const certificationRequest = { ...strongRequest, certification: 'ISO 27001' }
  return {
    strongMatch: qualifyCandidate(baseCandidate, strongRequest),
    partialEvidence: qualifyCandidate({ ...baseCandidate, partnerTypes: [], customerSegments: [] }, partialRequest),
    explicitMismatch: qualifyCandidate(mismatchCandidate, strongRequest),
    unsupportedCertification: qualifyCandidate(baseCandidate, certificationRequest),
  }
}
