import { scorePartnerCandidate } from './scoring'
import { buildPartnerDiscoveryQueries } from './web-search'
import type {
  PartnerCandidate,
  PartnerDiscoveryRequest,
  PartnerDiscoveryResult,
  WebSearchProvider,
  WebSearchResult,
} from './types'

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function companyNameFromResult(result: WebSearchResult) {
  const title = result.title.trim()
  const titleName = title.split(/\s+[|:-]\s+/)[0].trim()

  if (titleName.length > 2) return titleName

  const hostname = new URL(result.url).hostname.replace(/^www\./, '')
  const domainName = hostname.split('.')[0].replace(/[-_]+/g, ' ')
  return titleCase(domainName)
}

function websiteFromResult(result: WebSearchResult) {
  const url = new URL(result.url)
  return url.origin
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function candidateKey(candidate: PartnerCandidate) {
  return candidate.website || candidate.companyName.trim().toLowerCase()
}

function extractPreliminaryCandidate(result: WebSearchResult): PartnerCandidate {
  const description = result.snippet?.trim() || ''

  return {
    companyName: companyNameFromResult(result),
    website: websiteFromResult(result),
    country: '',
    description,
    partnerTypes: [],
    capabilities: [],
    industries: [],
    customerSegments: [],
    locations: [],
    services: [],
    technologies: [],
    vendorPartnerships: [],
    certifications: [],
    evidence: [
      {
        title: result.title,
        url: result.url,
        sourceType: 'search-result',
        ...(description ? { excerpt: description } : {}),
      },
    ],
    fitScore: 0,
    qualificationReasons: ['Discovered from a web search result; requires verification.'],
    concerns: [
      'Preliminary candidate. Company details and fit have not been independently verified.',
      'Partner types, capabilities, industries, and customer segments were not inferred without supporting evidence.',
    ],
    verificationStatus: 'preliminary',
    researchStatus: 'unresearched',
    researchSources: [],
  }
}

export async function discoverPartnersFromWeb(
  request: PartnerDiscoveryRequest,
  provider: WebSearchProvider
): Promise<PartnerDiscoveryResult> {
  const searchQueries = buildPartnerDiscoveryQueries(request)
  const maxResultsPerQuery = Math.max(
    1,
    Math.ceil(request.desiredCandidateCount / Math.max(searchQueries.length, 1))
  )
  const candidates = new Map<string, PartnerCandidate>()
  const skippedResults: string[] = []
  let searchResultsProcessed = 0

  for (const query of searchQueries) {
    let results: WebSearchResult[]

    try {
      results = await provider.search({ query, maxResults: maxResultsPerQuery })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error.'
      skippedResults.push(`Query failed: ${query} (${message})`)
      continue
    }

    searchResultsProcessed += results.length

    for (const result of results) {
      if (!result.title.trim() || !isHttpUrl(result.url)) {
        skippedResults.push(`Invalid result skipped: ${result.url || result.title}`)
        continue
      }

      try {
        const candidate = extractPreliminaryCandidate(result)
        const key = candidateKey(candidate)

        if (!candidate.companyName || !candidate.website || !key) {
          skippedResults.push(`Invalid result skipped: ${result.url || result.title}`)
          continue
        }

        if (candidates.has(key)) {
          skippedResults.push(`Duplicate result skipped: ${result.url}`)
          continue
        }

        candidates.set(key, scorePartnerCandidate(candidate, request))
      } catch {
        skippedResults.push(`Unusable result skipped: ${result.url || result.title}`)
      }
    }
  }

  return {
    request,
    candidates: [...candidates.values()]
      .sort((left, right) => right.fitScore - left.fitScore)
      .slice(0, request.desiredCandidateCount),
    generatedAt: new Date().toISOString(),
    source: 'web-search',
    searchQueries,
    searchResultsProcessed,
    skippedResults,
  }
}

const MOCK_SEARCH_RESULTS: WebSearchResult[] = [
  {
    title: 'Northstar Cyber Systems | Managed Security Services',
    url: 'https://northstar.example.com/services',
    snippet: 'Managed security services and incident response for enterprise teams.',
  },
  {
    title: 'Alpine Digital Partners - Cloud and Security Integration',
    url: 'https://alpine.example.com/security',
    snippet: 'Cloud transformation and security integration services for businesses.',
  },
  {
    title: 'Northstar Cyber Systems | Company Profile',
    url: 'https://northstar.example.com/about',
    snippet: 'A duplicate company result used to demonstrate deduplication.',
  },
]

export function createMockWebSearchProvider(): WebSearchProvider {
  return {
    async search(request) {
      return MOCK_SEARCH_RESULTS.slice(0, request.maxResults ?? MOCK_SEARCH_RESULTS.length)
    },
  }
}

export function runMockWebDiscoveryDemo(request: PartnerDiscoveryRequest) {
  return discoverPartnersFromWeb(request, createMockWebSearchProvider())
}