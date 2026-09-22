import { scorePartnerCandidate } from './scoring'
import { buildPartnerDiscoveryQueries } from './web-search'
import type { PartnerCandidate, PartnerDiscoveryRequest, PartnerDiscoveryResult, WebSearchProvider, WebSearchResult } from './types'

const SEARCH_CONCURRENCY = 8
const SEARCH_MAX_RESULTS = 15

function titleCase(value: string) { return value.replace(/\b\w/g, letter => letter.toUpperCase()) }
function companyNameFromDomain(result: WebSearchResult) { const hostname = new URL(result.url).hostname.replace(/^www\./, ''); return titleCase(hostname.split('.')[0].replace(/[-_]+/g, ' ')) }
function companyNameFromResult(result: WebSearchResult) { const title = result.title.trim(), domainName = companyNameFromDomain(result); const genericTitle = /^(?:home page|homepage|cybersecurity|cyber security|managed detection & response|managed detection and response|soc as a service|cybersecurity managed services|cybersecurity consulting|leading it security company in germany|the state of it security|measures for more cybersecurity|cybersicherheit)$/i; const articleLike = /\b(?:study|studie|report|bericht|news|article|obligations|deadlines|measures|workforce|lagebild|state of)\b/i; const partnershipTitle = title.match(/^([A-Z][A-Za-z0-9&.\s-]{2,50})\s+(?:partnership|partners?)\b/i); if (partnershipTitle?.[1]?.trim()) return partnershipTitle[1].trim(); if (genericTitle.test(title) || articleLike.test(title)) return domainName; const titleName = title.split(/\s+[|:-]\s+/)[0].trim(); const wordCount = titleName.split(/\s+/).filter(Boolean).length; const looksLikeSentence = /\b(?:für|for|and|with|services|beratung|consulting|selection|security workforce)\b/i.test(titleName); return titleName.length > 2 && wordCount <= 7 && !looksLikeSentence ? titleName : domainName }
function websiteFromResult(result: WebSearchResult) { return new URL(result.url).origin }
function isHttpUrl(value: string) { try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' } catch { return false } }
function candidateKey(candidate: PartnerCandidate) { return candidate.website || candidate.companyName.trim().toLowerCase() }
function extractPreliminaryCandidate(result: WebSearchResult): PartnerCandidate { const description = result.snippet?.trim() || ''; return { companyName: companyNameFromResult(result), website: websiteFromResult(result), country: '', description, partnerTypes: [], capabilities: [], industries: [], customerSegments: [], locations: [], services: [], technologies: [], vendorPartnerships: [], certifications: [], evidence: [{ title: result.title, url: result.url, sourceType: 'search-result', ...(description ? { excerpt: description } : {}) }], fitScore: 0, qualificationReasons: ['Discovered from a web search result; requires verification.'], concerns: ['Preliminary candidate. Company details and fit have not been independently verified.', 'Partner types, capabilities, industries, and customer segments were not inferred without supporting evidence.'], verificationStatus: 'preliminary', researchStatus: 'unresearched', researchSources: [] } }

export async function discoverPartnersFromWeb(request: PartnerDiscoveryRequest, provider: WebSearchProvider): Promise<PartnerDiscoveryResult> {
  const searchQueries = buildPartnerDiscoveryQueries(request), candidates = new Map<string, PartnerCandidate>(), skippedResults: string[] = []
  let searchResultsProcessed = 0
  for (let offset = 0; offset < searchQueries.length; offset += SEARCH_CONCURRENCY) {
    const batch = searchQueries.slice(offset, offset + SEARCH_CONCURRENCY)
    const batchResults = await Promise.all(batch.map(async (query) => { try { return { query, results: await provider.search({ query, maxResults: SEARCH_MAX_RESULTS }) } } catch (error) { return { query, results: [] as WebSearchResult[], error: error instanceof Error ? error.message : 'Unknown search error.' } } }))
    for (const batchResult of batchResults) {
      if ('error' in batchResult) skippedResults.push(`Query failed: ${batchResult.query} (${batchResult.error})`)
      searchResultsProcessed += batchResult.results.length
      for (const result of batchResult.results) {
        if (!result.title.trim() || !isHttpUrl(result.url)) { skippedResults.push(`Invalid result skipped: ${result.url || result.title}`); continue }
        try { const candidate = extractPreliminaryCandidate(result), key = candidateKey(candidate); if (!candidate.companyName || !candidate.website || !key) { skippedResults.push(`Invalid result skipped: ${result.url || result.title}`); continue } if (candidates.has(key)) { skippedResults.push(`Duplicate result skipped: ${result.url}`); continue } candidates.set(key, scorePartnerCandidate(candidate, request)) } catch { skippedResults.push(`Unusable result skipped: ${result.url || result.title}`) }
      }
    }
  }
  return { request, candidates: [...candidates.values()].sort((left, right) => right.fitScore - left.fitScore), generatedAt: new Date().toISOString(), source: 'web-search', searchQueries, searchResultsProcessed, skippedResults }
}

const MOCK_SEARCH_RESULTS: WebSearchResult[] = [{ title: 'Northstar Cyber Systems | Managed Security Services', url: 'https://northstar.example.com/services', snippet: 'Managed security services and incident response for enterprise teams.' }, { title: 'Alpine Digital Partners - Cloud and Security Integration', url: 'https://alpine.example.com/security', snippet: 'Cloud transformation and security integration services for businesses.' }, { title: 'Northstar Cyber Systems | Company Profile', url: 'https://northstar.example.com/about', snippet: 'A duplicate company result used to demonstrate deduplication.' }]
export function createMockWebSearchProvider(): WebSearchProvider { return { async search(request) { return MOCK_SEARCH_RESULTS.slice(0, request.maxResults ?? MOCK_SEARCH_RESULTS.length) } } }
export function runMockWebDiscoveryDemo(request: PartnerDiscoveryRequest) { return discoverPartnersFromWeb(request, createMockWebSearchProvider()) }