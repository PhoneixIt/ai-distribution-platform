export type PartnerDiscoveryRequest = {
  country: string
  market?: string
  partnerTypes: string[]
  technologyFocus: string
  industry?: string
  customerSegment?: string
  desiredCandidateCount: number
}

export type PartnerEvidenceSource = {
  title: string
  url: string
  sourceType: 'company-website' | 'directory' | 'search-result' | 'other'
  excerpt?: string
}

export type PartnerCandidate = {
  companyName: string
  website: string
  country: string
  description: string
  partnerTypes: string[]
  capabilities: string[]
  industries: string[]
  customerSegments: string[]
  evidence: PartnerEvidenceSource[]
  fitScore: number
  qualificationReasons: string[]
  concerns: string[]
}

export type PartnerDiscoveryResult = {
  request: PartnerDiscoveryRequest
  candidates: PartnerCandidate[]
  generatedAt: string
  source: 'mock' | 'provider'
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

export type PartnerDiscoveryWebSearch = {
  search(query: string): Promise<PartnerEvidenceSource[]>
}

export type PartnerCompanyResearch = {
  research(input: {
    companyName: string
    website?: string
  }): Promise<Partial<PartnerCandidate>>
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
  companyResearch?: PartnerCompanyResearch
  persistence?: PartnerDiscoveryPersistence
  outreach?: PartnerDiscoveryOutreach
}

export type PartnerDiscoveryAgent = {
  discover(request: PartnerDiscoveryRequest): Promise<PartnerDiscoveryResult>
}