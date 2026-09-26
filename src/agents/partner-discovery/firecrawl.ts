import type {
  CompanyResearchProvider,
  CompanyResearchRequest,
  CompanyResearchResult,
  PartnerEvidenceSource,
  WebSearchProvider,
  WebSearchRequest,
} from './types'

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2'
const TIMEOUT_MS = 20_000
const RESEARCH_PAGE_LIMIT = 5
const SECONDARY_RESEARCH_CONCURRENCY = 2

type SearchResponse = {
  web?: Array<{ title?: string; url?: string; description?: string; markdown?: string }>
}

type ScrapeResponse = {
  markdown?: string
  links?: string[]
  metadata?: { title?: string; sourceURL?: string; url?: string }
}

type ResearchPage = { url: string; title: string; text: string }
type Fact = { value: string; evidence: PartnerEvidenceSource }

function getApiKey() {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error('FIRECRAWL_API_KEY is not configured.')
  return key
}

async function firecrawlRequest<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${FIRECRAWL_API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getApiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const payload = (await response.json()) as { data?: T; error?: string }
    if (!response.ok) throw new Error(payload.error || `Firecrawl HTTP ${response.status}`)
    if (payload.data === undefined) throw new Error('Firecrawl returned no data.')
    return payload.data
  } finally {
    clearTimeout(timeout)
  }
}

function canonicalCompanyName(title: string, fallback: string) {
  const cleaned = title.split(/\\s+[|:-]\\s+/)[0].trim()
  if (!cleaned || /^(home|start|offering|services?|security|cybersecurity)$/i.test(cleaned)) return fallback
  return cleaned.replace(/\\s+/g, ' ')
}

function cleanText(value: string) {
  return value.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_>`~-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function excerpt(text: string, term: string) {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index === -1) return text.slice(0, 260)
  return text.slice(Math.max(0, index - 110), Math.min(text.length, index + term.length + 150)).trim()
}

function makeEvidence(page: ResearchPage, term: string): PartnerEvidenceSource {
  return { title: page.title || page.url, url: page.url, sourceType: 'company-website', excerpt: excerpt(page.text, term) }
}

function uniqueFacts(facts: Fact[]) {
  return [...new Map(facts.map((fact) => [fact.value.toLowerCase(), fact])).values()]
}

function findFacts(pages: ResearchPage[], patterns: Array<{ pattern: RegExp; value: string }>, context?: RegExp) {
  const facts: Fact[] = []
  for (const page of pages) {
    for (const item of patterns) {
      const match = page.text.match(item.pattern)
      if (!match) continue
      const source = makeEvidence(page, match[0])
      if (!context || context.test(source.excerpt || '')) facts.push({ value: item.value, evidence: source })
      if (context) context.lastIndex = 0
    }
  }
  return uniqueFacts(facts)
}

async function scrapePage(url: string) {
  const result = await firecrawlRequest<ScrapeResponse>('/scrape', {
    url,
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    blockAds: true,
    storeInCache: true,
  })
  return {
    page: {
      url: result.metadata?.sourceURL || result.metadata?.url || url,
      title: result.metadata?.title || url,
      text: cleanText(result.markdown || ''),
    } as ResearchPage,
    links: result.links || [],
  }
}

function usefulInternalLinks(links: string[], root: URL) {
  const keywords = ['about', 'service', 'solution', 'industry', 'partner', 'company', 'security', 'contact', 'impressum']
  const urls = [...new Set(links)].map((value) => {
    try { return new URL(value, root) } catch { return null }
  }).filter((url): url is URL => !!url && url.origin === root.origin)
  const scored = urls.filter((url) => keywords.some((keyword) => `${url.pathname} ${url.search}`.toLowerCase().includes(keyword)))
    .sort((left, right) => {
      const score = (url: URL) => keywords.reduce((total, keyword) => total + (`${url.pathname} ${url.search}`.toLowerCase().includes(keyword) ? 1 : 0), 0)
      return score(right) - score(left)
    })
  return scored.slice(0, RESEARCH_PAGE_LIMIT - 1).map((url) => url.toString())
}

function failedResult(request: CompanyResearchRequest, error: unknown): CompanyResearchResult {
  return { companyName: canonicalCompanyName(first.page.title, request.companyName), website: request.website, evidence: [], confidence: 0, researchStatus: 'failed', pagesFetched: 0, failedUrls: [error instanceof Error ? error.message : request.website] }
}

export function createFirecrawlWebSearchProvider(): WebSearchProvider {
  return {
    async search(request: WebSearchRequest) {
      const query = request.query.trim()
      if (!query) throw new Error('Web search requires a query.')
      const result = await firecrawlRequest<SearchResponse>('/search', {
        query,
        limit: Math.min(Math.max(request.maxResults ?? 10, 1), 100),
        sources: ['web'],
        scrapeOptions: { formats: ['markdown'] },
      })
      return (result.web || []).filter((item) => item.url).map((item) => ({
        title: item.title || item.url || 'Untitled',
        url: item.url as string,
        ...(item.description || item.markdown ? { snippet: item.description || item.markdown?.slice(0, 500) } : {}),
      }))
    },
  }
}

export function createResilientWebSearchProvider(primary: WebSearchProvider, fallback: WebSearchProvider): WebSearchProvider {
  return {
    async search(request) {
      try {
        return await primary.search(request)
      } catch (primaryError) {
        try {
          return await fallback.search(request)
        } catch (fallbackError) {
          const a = primaryError instanceof Error ? primaryError.message : 'Primary search failed.'
          const b = fallbackError instanceof Error ? fallbackError.message : 'Fallback search failed.'
          throw new Error(`${a} Fallback: ${b}`)
        }
      }
    },
  }
}

export function createFirecrawlCompanyResearchProvider(): CompanyResearchProvider {
  return {
    async research(request) {
      if (!process.env.FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY is not configured.')
      try {
        const root = new URL(request.website)
        const first = await scrapePage(request.website)
        const pages: ResearchPage[] = [first.page]
        const failedUrls: string[] = []
        const secondaryUrls = usefulInternalLinks(first.links, root)
        for (let start = 0; start < secondaryUrls.length; start += SECONDARY_RESEARCH_CONCURRENCY) {
          const batch = secondaryUrls.slice(start, start + SECONDARY_RESEARCH_CONCURRENCY)
          const secondary = await Promise.allSettled(batch.map(scrapePage))
          for (let i = 0; i < secondary.length; i += 1) {
            const result = secondary[i]
            if (result.status === 'fulfilled' && result.value.page.text) pages.push(result.value.page)
            else failedUrls.push(batch[i])
          }
        }

        const countryFacts = findFacts(pages, [{ pattern: /\bGermany\b|\bDeutschland\b/i, value: 'Germany' }, { pattern: /\bMittelstand\b|\bMittelständ\w*/i, value: 'Germany' }])
        const partnerTypeFacts = findFacts(pages, [
          { pattern: /\bmanaged security service provider\b/i, value: 'MSSP' },
          { pattern: /\bmanaged service provider\b/i, value: 'MSP' },
          { pattern: /\bsystem integrator\b/i, value: 'System Integrator' },
          { pattern: /\bvalue[- ]added reseller\b/i, value: 'Value-added Reseller' },
          { pattern: /\breseller\b/i, value: 'Reseller' },
          { pattern: /\bdistributor\b/i, value: 'Distributor' },
        ])
        const technologyFacts = findFacts(pages, [
          { pattern: /\bcybersecurity\b|\bcyber security\b/i, value: 'Cybersecurity' },
          { pattern: /\bcloud security\b/i, value: 'Cloud security' },
          { pattern: /\bMicrosoft Azure\b/i, value: 'Microsoft Azure' },
          { pattern: /\bAmazon Web Services\b|\bAWS\b/i, value: 'AWS' },
          { pattern: /\bCisco\b/i, value: 'Cisco' },
        ])
        const description = first.page.text.slice(0, 280).trim()
        const evidenceItems = [...countryFacts, ...partnerTypeFacts, ...technologyFacts].map((fact) => fact.evidence)
        if (description) evidenceItems.push(makeEvidence(first.page, description))
        return {
          companyName: request.companyName,
          website: request.website,
          ...(description ? { description } : {}),
          ...(countryFacts[0]?.value ? { country: countryFacts[0].value, locations: [countryFacts[0].value] } : {}),
          partnerTypes: partnerTypeFacts.map((fact) => fact.value),
          technologies: technologyFacts.map((fact) => fact.value),
          evidence: [...new Map(evidenceItems.map((item) => [`${item.url}:${item.excerpt}`, item])).values()],
          confidence: Math.min(0.95, Math.max(0.35, 0.4 + (countryFacts.length + partnerTypeFacts.length + technologyFacts.length) * 0.05 - (failedUrls.length ? 0.08 : 0))),
          researchStatus: failedUrls.length ? 'partial' : 'researched',
          pagesFetched: pages.length,
          failedUrls,
        }
      } catch (error) {
        return failedResult(request, error)
      }
    },
  }
}
