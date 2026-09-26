import { createPartnerDiscoveryAgent } from './agent'
import {
  createLocalCompanyResearchProvider,
  createResearchDemoCandidate,
} from './research'
import {
  createFirecrawlCompanyResearchProvider,
  createFirecrawlWebSearchProvider,
  createResilientWebSearchProvider,

} from './firecrawl'
import { createBraveWebSearchProvider, createExaWebSearchProvider } from './web-search'
import type {
  CompanyResearchProvider,
  PartnerCandidate,
  PartnerDiscoveryRequest,
  QualificationResult,
  WebSearchProvider,
} from './types'

export type PartnerDiscoveryReportCandidate = {
  candidate: PartnerCandidate
  qualification: QualificationResult
  evidenceUrls: string[]
}

export type PartnerDiscoveryReport = {
  request: PartnerDiscoveryRequest
  searchQueries: string[]
  candidatesDiscovered: number
  candidatesResearched: number
  candidatesResearchFailed: number
  candidatesQualified: PartnerDiscoveryReportCandidate[]
  candidatesNeedingReview: PartnerDiscoveryReportCandidate[]
  candidatesNotQualified: PartnerDiscoveryReportCandidate[]
  finalRankedCandidates: PartnerDiscoveryReportCandidate[]
  skippedResults: string[]
}

export type PartnerDiscoveryRunnerDependencies = {
  webSearch?: WebSearchProvider
  companyResearch?: CompanyResearchProvider
}

const RESEARCH_CONCURRENCY = 2

function rankCandidates(left: PartnerDiscoveryReportCandidate, right: PartnerDiscoveryReportCandidate) {
  const statusRank = {
    qualified: 3,
    needs_review: 2,
    not_qualified: 1,
  }

  return (
    statusRank[right.qualification.status] - statusRank[left.qualification.status] ||
    right.qualification.score - left.qualification.score ||
    right.candidate.fitScore - left.candidate.fitScore ||
    left.candidate.companyName.localeCompare(right.candidate.companyName)
  )
}

function reportCandidate(
  candidate: PartnerCandidate,
  qualification: QualificationResult
): PartnerDiscoveryReportCandidate {
  return {
    candidate,
    qualification,
    evidenceUrls: [...new Set(candidate.evidence.map((source) => source.url))],
  }
}

function markResearchFailure(candidate: PartnerCandidate, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown research error.'

  return {
    ...candidate,
    researchStatus: 'failed' as const,
    researchSources: [],
    concerns: [...candidate.concerns, `Website research failed: ${message}`],
  }
}

async function researchCandidatesInParallel(
  candidates: PartnerCandidate[],
  agent: ReturnType<typeof createPartnerDiscoveryAgent>,
  request: PartnerDiscoveryRequest
) {
  const results: PartnerDiscoveryReportCandidate[] = new Array(candidates.length)
  let nextIndex = 0

  async function worker() {
    while (true) {
      const index = nextIndex++
      if (index >= candidates.length) return

      const preliminaryCandidate = candidates[index]
      let researchedCandidate: PartnerCandidate

      try {
        researchedCandidate = await agent.researchCandidate(preliminaryCandidate)
      } catch (error) {
        researchedCandidate = markResearchFailure(preliminaryCandidate, error)
      }

      const qualification = agent.qualifyCandidate(researchedCandidate, request)
      results[index] = reportCandidate(
        researchedCandidate,
        researchedCandidate.researchStatus === 'researched' || qualification.status !== 'qualified'
          ? qualification
          : {
              ...qualification,
              status: 'needs_review',
              concerns: [
                ...qualification.concerns,
                `Qualification is provisional because website research status is ${researchedCandidate.researchStatus}.`,
              ],
            }
      )
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(RESEARCH_CONCURRENCY, Math.max(candidates.length, 1)) },
      () => worker()
    )
  )

  return results
}

export async function runPartnerDiscovery(
  request: PartnerDiscoveryRequest,
  dependencies: PartnerDiscoveryRunnerDependencies = {}
): Promise<PartnerDiscoveryReport> {
  const webSearch =
    dependencies.webSearch ||
    createResilientWebSearchProvider(
      createExaWebSearchProvider(),
      process.env.BRAVE_SEARCH_API_KEY
        ? createResilientWebSearchProvider(
            createBraveWebSearchProvider(),
            createFirecrawlWebSearchProvider()
          )
        : createFirecrawlWebSearchProvider()
    )

  const companyResearch =
    dependencies.companyResearch ||
    (process.env.FIRECRAWL_API_KEY
      ? {
          async research(request: Parameters<CompanyResearchProvider['research']>[0]) {
            const primary = await createFirecrawlCompanyResearchProvider().research(request)
            if (primary.researchStatus !== 'failed') return primary
            return createLocalCompanyResearchProvider().research(request)
          },
        }
      : createLocalCompanyResearchProvider())

  const agent = createPartnerDiscoveryAgent({ webSearch, companyResearch })
  const discovery = await agent.discoverFromWeb(request)
  const reportCandidates = await researchCandidatesInParallel(discovery.candidates, agent, request)

  const finalRankedCandidates = reportCandidates
    .sort(rankCandidates)
    .slice(0, request.desiredCandidateCount)

  return {
    request,
    searchQueries: discovery.searchQueries,
    candidatesDiscovered: discovery.candidates.length,
    candidatesResearched: reportCandidates.filter(
      (item) => item.candidate.researchStatus === 'researched' || item.candidate.researchStatus === 'partial'
    ).length,
    candidatesResearchFailed: reportCandidates.filter(
      (item) => item.candidate.researchStatus === 'failed'
    ).length,
    candidatesQualified: finalRankedCandidates.filter(
      (item) => item.qualification.status === 'qualified'
    ),
    candidatesNeedingReview: finalRankedCandidates.filter(
      (item) => item.qualification.status === 'needs_review'
    ),
    candidatesNotQualified: finalRankedCandidates.filter(
      (item) => item.qualification.status === 'not_qualified'
    ),
    finalRankedCandidates,
    skippedResults: discovery.skippedResults,
  }
}

export async function runMockPartnerDiscoveryDemo(
  request: PartnerDiscoveryRequest
): Promise<PartnerDiscoveryReport> {
  const mockCandidate = createResearchDemoCandidate()
  const mockSearch: WebSearchProvider = {
    async search(searchRequest) {
      return [
        {
          title: `${mockCandidate.companyName} | ${searchRequest.query}`,
          url: mockCandidate.website,
          snippet: mockCandidate.description,
        }
      ]
    },
  }
  const mockResearch: CompanyResearchProvider = {
    async research() {
      return {
        companyName: mockCandidate.companyName,
        website: mockCandidate.website,
        country: 'Germany',
        partnerTypes: ['MSSP'],
        customerSegments: ['Mid-market'],
        services: ['Managed security services'],
        technologies: ['Cybersecurity'],
        industries: [],
        vendorPartnerships: [],
        certifications: [],
        locations: ['Germany'],
        description: mockCandidate.description,
        evidence: [
          {
            title: 'Mock security services page',
            url: `${mockCandidate.website}/services`,
            sourceType: 'company-website' as const,
            excerpt: 'Managed security service provider serving mid-market customers.',
          },
        ],
        confidence: 0.9,
        researchStatus: 'researched' as const,
        pagesFetched: 2,
        failedUrls: [],
      }
    },
  }

  return runPartnerDiscovery(request, {
    webSearch: mockSearch,
    companyResearch: mockResearch,
  })
}

function listOrUnknown(values: string[]) {
  return values.length ? values.join(', ') : 'Unknown'
}

function statusLabel(status: QualificationResult['status']) {
  return status.replace('_', ' ').toUpperCase()
}

export function formatPartnerDiscoveryReport(report: PartnerDiscoveryReport) {
  const requestSummary = [
    report.request.technologyFocus,
    report.request.partnerTypes.join(', '),
    report.request.country,
    report.request.customerSegment
      ? `serving ${report.request.customerSegment}`
      : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  const lines = [
    'PARTNER DISCOVERY',
    `Request: ${requestSummary}`,
    `Search queries: ${report.searchQueries.join(' | ') || 'None'}`,
    `Discovered: ${report.candidatesDiscovered} | Researched: ${report.candidatesResearched} | Research failed: ${report.candidatesResearchFailed}`,
    '',
  ]

  report.finalRankedCandidates.forEach((item, index) => {
    const { candidate, qualification } = item
    lines.push(
      `${index + 1}. ${candidate.companyName}`,
      `   Qualification: ${statusLabel(qualification.status)}`,
      `   Qualification score: ${qualification.score}`,
      `   Fit score: ${candidate.fitScore}`,
      `   Partner type: ${listOrUnknown(candidate.partnerTypes)}`,
      `   Country: ${candidate.country || listOrUnknown(candidate.locations)}`,
      `   Customer segment: ${listOrUnknown(candidate.customerSegments)}`,
      `   Research: ${candidate.researchStatus.toUpperCase()}`,
      '',
      '   Reasons:',
      ...(qualification.reasons.length
        ? qualification.reasons.map((reason) => `   - ${reason}`)
        : ['   - None recorded']),
      '',
      '   Concerns:',
      ...(qualification.concerns.length
        ? qualification.concerns.map((concern) => `   - ${concern}`)
        : ['   - None recorded']),
      '',
      '   Evidence:',
      ...(item.evidenceUrls.length
        ? item.evidenceUrls.map((url) => `   - ${url}`)
        : ['   - None recorded']),
      ''
    )
  })

  if (report.skippedResults.length) {
    lines.push('Skipped / failed results:')
    lines.push(...report.skippedResults.map((result) => `- ${result}`))
  }

  return lines.join('\n')
}

export const DEFAULT_DEVELOPMENT_REQUEST: PartnerDiscoveryRequest = {
  country: 'Germany',
  partnerTypes: ['MSSP'],
  technologyFocus: 'Cybersecurity',
  customerSegment: 'Mid-market',
  desiredCandidateCount: 5,
}

if (process.argv[1]?.endsWith('runner.ts')) {
  runPartnerDiscovery(DEFAULT_DEVELOPMENT_REQUEST)
    .then((report) => console.log(formatPartnerDiscoveryReport(report)))
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
}
