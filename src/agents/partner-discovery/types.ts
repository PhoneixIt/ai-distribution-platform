export type PartnerDiscoveryRequest = {
  objective?: string
  country: string
  market?: string
  partnerTypes: string[]
  technologyFocus: string
  industry?: string
  customerSegment?: string
  serviceOrCapability?: string
  vendorPartnership?: string
  certification?: string
  companySize?: string
  desiredCandidateCount: number
}

export type PartnerEvidenceSource = {
  title: string
  url: string
  sourceType: 'company-website' | 'directory' | 'search-result' | 'other'
  excerpt?: string
}

export type WebSearchRequest = {
  query: string
  maxResults?: number
}

export type WebSearchResult = {
  title: string
  url: string
  snippet?: string
}

export type PartnerCandidate = {
  companyName: string
  website: string
  country: string
  companySize?: string
  description: string
  partnerTypes: string[]
  capabilities: string[]
  industries: string[]
  customerSegments: string[]
  locations: string[]
  services: string[]
  technologies: string[]
  vendorPartnerships: string[]
  certifications: string[]
  evidence: PartnerEvidenceSource[]
  fitScore: number
  qualificationReasons: string[]
  concerns: string[]
  verificationStatus: 'mock' | 'preliminary' | 'verified'
  researchStatus: 'unresearched' | 'researched' | 'partial' | 'failed'
  researchSources: PartnerEvidenceSource[]
  researchedAt?: string
  researchConfidence?: number
}

export type PartnerDiscoveryResult = {
  request: PartnerDiscoveryRequest
  candidates: PartnerCandidate[]
  generatedAt: string
  source: 'mock' | 'provider' | 'web-search'
  searchQueries: string[]
  searchResultsProcessed: number
  skippedResults: string[]
}

export type PartnerCandidateSource = {
  discover(request: PartnerDiscoveryRequest): Promise<PartnerCandidate[]>
}

export type PartnerDiscoveryLanguageModel = {
  generate(input: {
    systemPrompt: string
    userPrompt: string
  }): Promise<string>
}

export type WebSearchProvider = {
  search(request: WebSearchRequest): Promise<WebSearchResult[]>
}

export type PartnerDiscoveryWebSearch = WebSearchProvider

export type CompanyResearchRequest = {
  companyName: string
  website: string
  country?: string
  companySize?: string
  sourceEvidence?: PartnerEvidenceSource[]
}

export type CompanyResearchResult = {
  companyName?: string
  website?: string
  description?: string
  country?: string
  companySize?: string
  locations?: string[]
  partnerTypes?: string[]
  industries?: string[]
  customerSegments?: string[]
  services?: string[]
  technologies?: string[]
  vendorPartnerships?: string[]
  certifications?: string[]
  evidence: PartnerEvidenceSource[]
  confidence: number
  researchStatus: 'researched' | 'partial' | 'failed'
  pagesFetched?: number
  failedUrls?: string[]
}

export type CompanyResearchProvider = {
  research(request: CompanyResearchRequest): Promise<CompanyResearchResult>
}

export type PartnerCompanyResearch = CompanyResearchProvider

export type QualificationStatus = 'qualified' | 'needs_review' | 'not_qualified'

export type QualificationCriterion = {
  key:
    | 'country'
    | 'partnerType'
    | 'technology'
    | 'industry'
    | 'customerSegment'
    | 'serviceOrCapability'
    | 'vendorPartnership'
    | 'certification'
    | 'companySize'
  label: string
  requestedValue: string
  weight: number
  evidence: PartnerEvidenceSource[]
}

export type QualificationResult = {
  status: QualificationStatus
  score: number
  reasons: string[]
  concerns: string[]
  matchedCriteria: QualificationCriterion[]
  unmetCriteria: QualificationCriterion[]
  unknownCriteria: QualificationCriterion[]
  evidence: PartnerEvidenceSource[]
  confidence: number
}

export type PartnerDiscoveryPersistence = {
  save(result: PartnerDiscoveryResult): Promise<void>
}

export type PartnerDiscoveryOutreach = {
  createDraft(input: {
    candidate: PartnerCandidate
    request: PartnerDiscoveryRequest
  }): Promise<unknown>
}

export type PartnerDiscoveryDependencies = {
  candidateSource?: PartnerCandidateSource
  languageModel?: PartnerDiscoveryLanguageModel
  webSearch?: PartnerDiscoveryWebSearch
  companyResearch?: CompanyResearchProvider
  persistence?: PartnerDiscoveryPersistence
  outreach?: PartnerDiscoveryOutreach
}

export type PartnerDiscoveryAgent = {
  discover(request: PartnerDiscoveryRequest): Promise<PartnerDiscoveryResult>
  discoverFromWeb(
    request: PartnerDiscoveryRequest,
    provider?: WebSearchProvider
  ): Promise<PartnerDiscoveryResult>
  researchCandidate(
    candidate: PartnerCandidate,
    provider?: CompanyResearchProvider
  ): Promise<PartnerCandidate>
  qualifyCandidate(
    candidate: PartnerCandidate,
    request: PartnerDiscoveryRequest
  ): QualificationResult
}
