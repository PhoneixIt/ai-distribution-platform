import type {
  CompanyResearchProvider,
  CompanyResearchRequest,
  CompanyResearchResult,
  PartnerEvidenceSource,
  WebSearchProvider,
  WebSearchRequest,
} from './types'

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2'
const FIRECRAWL_TIMEOUT_MS = 20_000
const FIRECRAWL_RESEARCH_PAGES = 5

function apiKey() {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error('Firecrawl requires FIRECRAWL_API_KEY in the server environment.')
  return key
}

async function firecrawlRequest<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS)

  try {
    const response = await fetch(`${FIRECRAWL_API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
      },
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

type FirecrawlSearchResponse = {
  web?: Array<{
    title?: string
    url?: string
    description?: string
    markdown?: string
  }>
}

export function createFirecrawlWebSearchProvider(): WebSearchProvider {
  return {
    async search(request: WebSearchRequest) {
      const query = request.query.trim()
      if (!query) throw new Error('Web search requires a query.')

      const result = await firecrawlRequest<FirecrawlSearchResponse>('/search', {
        query,
        limit: Math.min(Math.max(request.maxResults ?? 10, 1), 100),
        sources: ['web'],
        scrapeOptions: { formats: ['markdown'] },
      })

      return (result.web || [])
        .filter((item) => item.url)
        .map((item) => ({
          title: item.title || item.url || 'Untitled',
          url: item.url as string,
          ...(item.description || item.markdown
            ? { snippet: item.description || item.markdown?.slice(0, 500) }
            : {}),
        }))
    },
  }
}

export function createResilientWebSearchProvider(
  primary: WebSearchProvider,
  fallback: WebSearchProvider
): WebSearchProvider {
  return {
    async search(request) {
      try {
        return await primary.search(request)
      } catch (primaryError) {
        try {
          return await fallback.search(request)
        } catch (fallbackError) {
          const primaryMessage = primaryError instanceof Error ? primaryError.message : 'Primary search failed.'
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Fallback search failed.'
          throw new Error(`${primaryMessage} Fallback: ${fallbackMessage}`)
        }
      }
    },
  }
}

type FirecrawlScrapeResponse = {
  markdown?: string
  links?: string[]
  metadata?: { title?: string; sourceURL?: string; url?: string }
}

type ResearchPage = { url: string; title: string; text: string }

function cleanText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerpt(text: string, term: string) {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index === -1) return text.slice(0, 260)
  return text.slice(Math.max(0, index - 110), Math.min(text.length, index + term.length + 150)).trim()
}

function evidence(page: ResearchPage, term: string): PartnerEvidenceSource {
  return {
    title: page.title || page.url,
    url: page.url,
    sourceType: 'company-website',
    excerpt: excerpt(page.text, term),
  }
}

function factsFor(
  pages: ResearchPage[],
  patterns: Array<{ pattern: RegExp; value: string }>,
  context?: RegExp
) {
  const facts: Array<{ value: string; evidence: PartnerEvidenceSource }> = []
  for (const page of pages) {
    for (const item of patterns) {
      const match = page.text.match(item.pattern)
      if (!match) continue
      const source = evidence(page, match[0])
      if (!context || context.test(source.excerpt || '')) facts.push({ value: item.value, evidence: source })
      if (context) context.lastIndex = 0
    }
  }
  return [...new Map(facts.map((fact) => [fact.value.toLowerCase(), fact])).values()]
}

function isUsefulInternalLink(value: string, root: URL) {
  try {
    const url = new URL(value, root)
    if (url.origin !== root.origin) return false
    const path = `${url.pathname} ${url.search}`.toLowerCase()
    return ['about', 'service', 'solution', 'industry', 'partner', 'company', 'security', 'contact', 'impressum'].some(
      (term) => path.includes(term)
    )
  } catch {
    return false
  }
}

async function scrapePage(url: string) {
  const result = await firecrawlRequest<FirecrawlScrapeResponse>('/scrape', {
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

function failedResult(request: CompanyResearchRequest, error: unknown): CompanyResearchResult {
  return {
    companyName: request.companyName,
    website: request.website,
    evidence: [],
    confidence: 0,
    researchStatus: 'failed',
    pagesFetched: 0,
    failedUrls: [error instanceof Error ? error.message : request.website],
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
        const candidateLinks = [...new Set(first.links)]
          .filter((url) => isUsefulInternalLink(url, root))
          .sort((left, right) => {
            const score = (value: string) =>
              ['about', 'service', 'solution', 'industry', 'partner', 'security', 'impressum'].reduce(
                (total, term) => total + (value.toLowerCase().includes(term) ? 1 : 0),
                0
              )
            return score(right) - score(left)
          })
          .slice(0, FIRECRAWL_RESEARCH_PAGES - 1)

        const secondary = await Promise.allSettled(candidateLinks.map((url) => scrapePage(url)))
        for (let index = 0; index < secondary.length; index += 1) {
          const result = secondary[index]
          if (result.status === 'fulfilled' && result.value.page.text) pages.push(result.value.page)
          else failedUrls.push(candidateLinks[index])
        }

        const countryPatterns = request.country
          ? [{ pattern: new RegExp(`\\b${request.country.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i'), value: request.country }]
          : [{ pattern: /\bGermany\b|\bDeutschland\b/i, value: 'Germany' }]
        const countryFacts = factsFor(pages, countryPatterns)
        const partnerTypeFacts = factsFor(pages, [
          { pattern: /\bmanaged security service provider\b/i, value: 'MSSP' },
          { pattern: /\bmanaged service provider\b/i, value: 'MSP' },
          { pattern: /\bMSSP\b/i, value: 'MSSP' },
          { pattern: /\bMSP\b/i, value: 'MSP' },
          { pattern: /\bsystem integrator\b/i, value: 'System Integrator' },
          { pattern: /\bvalue[- ]added reseller\b/i, value: 'Value-added Reseller' },
          { pattern: /\breseller\b/i, value: 'Reseller' },
          { pattern: /\bdistributor\b/i, value: 'Distributor' },
        ])
        const technologyFacts = factsFor(pages, [
          { pattern: /\bcybersecurity\b|\bcyber security\b/i, value: 'Cybersecurity' },
          { pattern: /\bcloud security\b/i, value: 'Cloud security' },
          { pattern: /\bMicrosoft Azure\b/i, value: 'Microsoft Azure' },
          { pattern: /\bAmazon Web Services\b|\bAWS\b/i, value: 'AWS' },
          { pattern: /\bCisco\b/i, value: 'Cisco' },
        ])
        const partnershipFacts = factsFor(pages, [
          { pattern: /\bMicrosoft(?:\s+(?:Gold|Silver|Solutions?))?\s+Partner\b/i, value: 'Microsoft Partner' },
          { pattern: /\b(?:AWS|Amazon Web Services)\s+Partner\b/i, value: 'AWS Partner' },
          { pattern: /\bCisco\s+Partner\b/i, value: 'Cisco Partner' },
          { pattern: /\bGoogle Cloud\s+Partner\b/i, value: 'Google Cloud Partner' },
        ])
        const certificationFacts = factsFor(pages, [
          { pattern: /\bISO\s*27001\b/i, value: 'ISO 27001' },
          { pattern: /\bSOC\s*2\b/i, value: 'SOC 2' },
          { pattern: /\bCISSP\b/i, value: 'CISSP' },
          { pattern: /\bCISM\b/i, value: 'CISM' },
          { pattern: /\bPCI\s+DSS\b/i, value: 'PCI DSS' },
        ])
        const industryFacts = factsFor(
          pages,
          ['Financial services', 'Healthcare', 'Manufacturing', 'Retail', 'Public sector'].map((term) => ({
            pattern: new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i'),
            value: term,
          })),
          /industr|sector|vertical|serve/i
        )
        const customerFacts = factsFor(
          pages,
          [
            { pattern: /\bmid[- ]market\b|\bmittelstand\b|\bmittelständ\w*/i, value: 'Mid-market' },
            { pattern: /\bSMB\b|\bSME\b|\bSMEs\b|\bKMU\b|\bsmall and medium-sized enterprises?\b/i, value: 'SMB' },
            { pattern: /\benterprise\b|\blarge enterprises?\b|\bcorporate clients?\b/i, value: 'Enterprise' },
          ],
          /customer|client|business|serve/i
        )
        const serviceFacts = factsFor(pages, [
          { pattern: /\bmanaged security services?\b/i, value: 'Managed security services' },
          { pattern: /\bsecurity operations center\b|\bSOC services?\b/i, value: 'Security operations' },
          { pattern: /\bincident response\b/i, value: 'Incident response' },
          { pattern: /\bpenetration testing\b|\bpen testing\b/i, value: 'Penetration testing' },
          { pattern: /\bcloud security\b/i, value: 'Cloud security' },
          { pattern: /\bconsulting\b/i, value: 'Consulting' },
        ])

        const allFacts = [
          ...countryFacts,
          ...partnerTypeFacts,
          ...technologyFacts,
          ...partnershipFacts,
          ...certificationFacts,
          ...industryFacts,
          ...customerFacts,
          ...serviceFacts,
        ]
        const evidence = [...new Map(allFacts.map((fact) => [`${fact.evidence.url}:${fact.value}`, fact.evidence])).values()]
        const description = first.page.text.slice(0, 280).trim()
        if (description) evidence.push(evidenceFor(first.page, description))
        const inferredCountry = countryFacts[0]?.value
        const confidence = Math.min(0.95, Math.max(0.35, 0.4 + allFacts.length * 0.04 - (failedUrls.length ? 0.08 : 0)))

        return {
          companyName: request.companyName,
          website: request.website,
          ...(description ? { description } : {}),
          ...(inferredCountry ? { country: inferredCountry, locations: [inferredCountry] } : {}),
          partnerTypes: partnerTypeFacts.map((fact) => fact.value),
          industries: industryFacts.map((fact) => fact.value),
          customerSegments: customerFacts.map((fact) => fact.value),
          services: serviceFacts.map((fact) => fact.value),
          technologies: technologyFacts.map((fact) => fact.value),
          vendorPartnerships: partnershipFacts.map((fact) => fact.value),
          certifications: certificationFacts.map((fact) => fact.value),
          evidence: [...new Map(evidence.map((item) => [`${item.url}:${item.excerpt}`, item])).values()],
          confidence,
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
