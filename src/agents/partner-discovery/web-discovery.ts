import { scorePartnerCandidate } from './scoring'
import { buildPartnerDiscoveryQueries } from './web-search'
import type { PartnerCandidate, PartnerDiscoveryRequest, PartnerDiscoveryResult, WebSearchProvider, WebSearchResult } from './types'

const DISCOVERY_POOL_MINIMUM = 30
const DISCOVERY_POOL_MULTIPLIER = 3
const DISCOVERY_POOL_MAXIMUM = 100

const NON_COMPANY_RESULT_HOSTS = new Set([
  'clutch.co',
  'themanifest.com',
  'ensun.io',
  'goodfirms.co',
  'designrush.com',
  'g2.com',
  'capterra.com',
  'crunchbase.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'youtube.com',
  'x.com',
  'wikipedia.org',
  'glassdoor.com',
])

const NON_COMPANY_PATH_PATTERNS = [
  /\/(?:directory|directories|companies|company|providers|provider|profiles|profile|search|category|categories|rankings|ranking|lists|list)(?:\/|$)/i,
  /\/top[-_ ]\d+/i,
  /\/best[-_ ]/i,
]

const GENERIC_RESULT_TITLES = [
  /^home(?:\s*[-|:]\s*page)?$/i,
  /^start(?:seite)?$/i,
  /^offering$/i,
  /^services?$/i,
  /^security$/i,
  /^cybersecurity$/i,
  /^cyber security$/i,
  /^managed detection (?:&|and) response$/i,
  /^soc as a service$/i,
  /^cybersecurity managed services$/i,
  /^cybersecurity consulting$/i,
  /^security systems integrators?(?: in germany)?$/i,
  /^global system integrators?(?: in germany)?$/i,
  /^industrial automation companies in germany$/i,
  /^managed service providers? in germany$/i,
  /^top \d+ managed service providers?\b/i,
  /^top .* managed service providers?\b/i,
  /^.* companies? in germany$/i,
  /^.* providers? in germany$/i,
]

const ARTICLE_LIKE_TITLE =
  /\b(?:study|studie|report|bericht|news|article|obligations|deadlines|measures|workforce|lagebild|state of|press release|job|jobs|career|careers)\b/i

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function companyNameFromDomain(result: WebSearchResult) {
  const hostname = new URL(result.url).hostname.replace(/^www\./, '')
  return titleCase(hostname.split('.')[0].replace(/[-_]+/g, ' '))
}

function companyNameFromResult(result: WebSearchResult) {
  const title = result.title.trim()
  const domainName = companyNameFromDomain(result)

  if (GENERIC_RESULT_TITLES.some((pattern) => pattern.test(title)) || ARTICLE_LIKE_TITLE.test(title)) {
    return domainName
  }

  const partnershipTitle = title.match(/^([A-Z][A-Za-z0-9&.\s-]{2,50})\s+(?:partnership|partners?)\b/i)
  if (partnershipTitle?.[1]?.trim()) return partnershipTitle[1].trim()

  const titleName = title.split(/\s+[|:-]\s+/)[0].trim()
  const wordCount = titleName.split(/\s+/).filter(Boolean).length
  const looksLikeSentence =
    /\b(?:für|for|and|with|services|beratung|consulting|selection|security workforce)\b/i.test(
      titleName
    )

  return titleName.length > 2 && wordCount <= 7 && !looksLikeSentence ? titleName : domainName
}

function websiteFromResult(result: WebSearchResult) {
  return new URL(result.url).origin
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isLikelyCompanyResult(result: WebSearchResult) {
  try {
    const url = new URL(result.url)
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase()
    const isDirectoryHost = [...NON_COMPANY_RESULT_HOSTS].some(
      (host) => hostname === host || hostname.endsWith('.' + host)
    )
    if (isDirectoryHost) return false

    if (NON_COMPANY_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
      return false
    }

    const title = result.title.trim()
    if (!title) return false
    if (GENERIC_RESULT_TITLES.some((pattern) => pattern.test(title))) return false
    if (ARTICLE_LIKE_TITLE.test(title)) return false

    return true
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
  const discoveryPoolSize = Math.min(
    Math.max(request.desiredCandidateCount * DISCOVERY_POOL_MULTIPLIER, DISCOVERY_POOL_MINIMUM),
    DISCOVERY_POOL_MAXIMUM
  )
  const candidates = new Map<string, PartnerCandidate>()
  const skippedResults = new Set<string>()
  let searchResultsProcessed = 0

  for (const query of searchQueries) {
    let results: WebSearchResult[]

    try {
      results = await provider.search({ query, maxResults: 10 })
    } catch (error) {
      skippedResults.add(
        `Query failed: ${query} (${error instanceof Error ? error.message : 'Unknown search error.'})`
      )
      continue
    }

    searchResultsProcessed += results.length

    for (const result of results) {
      if (!result.title.trim() || !isHttpUrl(result.url)) {
        skippedResults.add(`Invalid result skipped: ${result.url || result.title}`)
        continue
      }

      try {
        if (!isLikelyCompanyResult(result)) {
          skippedResults.add(`Non-company or non-canonical result skipped: ${result.url}`)
          continue
        }

        const candidate = extractPreliminaryCandidate(result)
        const key = candidateKey(candidate)

        if (!candidate.companyName || !candidate.website || !key) {
          skippedResults.add(`Invalid result skipped: ${result.url || result.title}`)
          continue
        }

        if (candidates.has(key)) {
          skippedResults.add(`Duplicate result skipped: ${result.url}`)
          continue
        }

        candidates.set(key, scorePartnerCandidate(candidate, request))
      } catch {
        skippedResults.add(`Unusable result skipped: ${result.url || result.title}`)
      }
    }
  }

  return {
    request,
    candidates: [...candidates.values()]
      .sort((left, right) => right.fitScore - left.fitScore)
      .slice(0, discoveryPoolSize),
    generatedAt: new Date().toISOString(),
    source: 'web-search',
    searchQueries,
    searchResultsProcessed,
    skippedResults: [...skippedResults],
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
