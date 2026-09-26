import Exa from 'exa-js'
import type {
  PartnerDiscoveryRequest,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
} from './types'

const DUCKDUCKGO_HTML_URL = 'https://html.duckduckgo.com/html/'
const EXA_API_KEY_ENV = 'EXA_API_KEY'
const DEFAULT_MAX_RESULTS = 10
const MAX_RESULTS_LIMIT = 100
const MAX_DISCOVERY_QUERIES = 24

function decodeHtml(value: string) {
  return value
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
}

function resolveResultUrl(value: string) {
  const decodedValue = decodeHtml(value)

  if (!decodedValue.startsWith('/l/?')) return decodedValue

  const redirectUrl = new URL(decodedValue, DUCKDUCKGO_HTML_URL).searchParams.get('uddg')
  return redirectUrl || decodedValue
}

function parseSearchResults(html: string, maxResults: number): WebSearchResult[] {
  const results: WebSearchResult[] = []
  const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while (results.length < maxResults && (match = resultPattern.exec(html))) {
    const resultEnd = html.indexOf('</div>', match.index)
    const resultBlock = html.slice(match.index, resultEnd === -1 ? html.length : resultEnd)
    const snippetMatch = resultBlock.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i
    )
    const url = resolveResultUrl(match[1])

    if (url.startsWith('http')) {
      results.push({
        title: cleanText(match[2]),
        url,
        ...(snippetMatch ? { snippet: cleanText(snippetMatch[1]) } : {}),
      })
    }
  }

  return results
}

function normalizeMaxResults(maxResults?: number) {
  return Math.min(
    Math.max(Math.floor(maxResults ?? DEFAULT_MAX_RESULTS), 1),
    MAX_RESULTS_LIMIT
  )
}

export function createExaWebSearchProvider(): WebSearchProvider {
  return {
    async search(request: WebSearchRequest) {
      const query = request.query.trim()

      if (!query) throw new Error('Web search requires a query.')

      const apiKey = process.env[EXA_API_KEY_ENV]

      if (!apiKey) {
        throw new Error('Exa web search requires EXA_API_KEY in the server environment.')
      }

      const exa = new Exa(apiKey)
      const result = await exa.search(query, {
        ...(request.maxResults === undefined
          ? {}
          : { numResults: normalizeMaxResults(request.maxResults) }),
        contents: { highlights: true },
      })

      return result.results.map((item) => {
        const snippet = item.highlights?.join(' ').trim()

        return {
          title: item.title ?? '',
          url: item.url,
          ...(snippet ? { snippet } : {}),
        }
      })
    },
  }
}



export function createBraveWebSearchProvider(): WebSearchProvider {
  return {
    async search(request: WebSearchRequest) {
      const query = request.query.trim()
      if (!query) throw new Error('Web search requires a query.')
      const apiKey = process.env.BRAVE_SEARCH_API_KEY
      if (!apiKey) throw new Error('Brave web search requires BRAVE_SEARCH_API_KEY in the server environment.')

      const response = await fetch(
        'https://api.search.brave.com/res/v1/web/search?q=' +
          encodeURIComponent(query) +
          '&count=' +
          String(normalizeMaxResults(request.maxResults)),
        {
          headers: {
            Accept: 'application/json',
            'X-Subscription-Token': apiKey,
          },
          cache: 'no-store',
        }
      )

      const raw = await response.text()
      if (!response.ok) throw new Error(`Brave Search HTTP ${response.status}: ${raw.slice(0, 240)}`)

      let payload: { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } } = {}
      try { payload = raw ? JSON.parse(raw) : {} } catch { throw new Error('Brave Search returned invalid JSON.') }

      return (payload.web?.results || []).filter((item) => item.url).map((item) => ({
        title: item.title || item.url || 'Untitled',
        url: item.url as string,
        ...(item.description ? { snippet: item.description } : {}),
      }))
    },
  }
}

/** Development-only provider. It uses DuckDuckGo's public HTML endpoint and needs no API key. */
export function createLocalWebSearchProvider(): WebSearchProvider {
  return {
    async search(request: WebSearchRequest) {
      const query = request.query.trim()

      if (!query) throw new Error('Web search requires a query.')

      const response = await fetch(
        `${DUCKDUCKGO_HTML_URL}?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: 'text/html',
            'User-Agent': 'PortAi local development search',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Local web search failed with HTTP ${response.status}.`)
      }

      return parseSearchResults(await response.text(), normalizeMaxResults(request.maxResults))
    },
  }
}

function addQuery(queries: string[], value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized || queries.includes(normalized) || queries.length >= MAX_DISCOVERY_QUERIES) {
    return
  }

  queries.push(normalized)
}

/** Build complementary discovery queries for recall; detailed verification happens later. */
export function buildPartnerDiscoveryQueries(request: PartnerDiscoveryRequest) {
  const country = request.country.trim()
  const technology = request.technologyFocus.trim()
  const customerSegment = request.customerSegment?.trim()
  const industry = request.industry?.trim()
  const capability = request.serviceOrCapability?.trim()
  const vendorPartnership = request.vendorPartnership?.trim()
  const certification = request.certification?.trim()
  const companySize = request.companySize?.trim()
  const queries: string[] = []

  // Keep the user's original intent in the search context while structured
  // filters continue to drive qualification and scoring.
  addQuery(queries, request.objective?.slice(0, 500) || '')

  for (const partnerType of request.partnerTypes) {
    const type = partnerType.trim()
    if (!type) continue

    addQuery(queries, `${technology} ${type} ${country}`)
    addQuery(queries, `${type} ${technology} services ${country}`)
    addQuery(queries, [technology, type, customerSegment, industry, country].filter(Boolean).join(' '))
    addQuery(queries, `${type} companies ${country}`)
  }

  addQuery(queries, [technology, customerSegment, country, capability].filter(Boolean).join(' '))
  addQuery(queries, [technology, country, industry, 'partners'].filter(Boolean).join(' '))
  addQuery(queries, [technology, country, vendorPartnership, 'partner'].filter(Boolean).join(' '))
  addQuery(queries, [technology, country, certification].filter(Boolean).join(' '))
  addQuery(queries, [technology, country, companySize, 'IT services'].filter(Boolean).join(' '))
  addQuery(queries, `${technology} managed services ${country}`)
  addQuery(queries, `${technology} security services ${country}`)

  return queries
}

export async function searchForPartnerDiscovery(
  request: PartnerDiscoveryRequest,
  provider: WebSearchProvider
) {
  const queries = buildPartnerDiscoveryQueries(request)
  const results = await Promise.all(
    queries.map((query) => provider.search({ query, maxResults: DEFAULT_MAX_RESULTS }))
  )

  return results.flat().filter((result, index, allResults) =>
    allResults.findIndex((candidate) => candidate.url === result.url) === index
  )
}
