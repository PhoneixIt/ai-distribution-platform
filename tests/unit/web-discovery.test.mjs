import assert from 'node:assert/strict'
import test from 'node:test'
import { discoverPartnersFromWeb } from '../../src/agents/partner-discovery/web-discovery.ts'
import type {
  PartnerDiscoveryRequest,
  WebSearchProvider,
  WebSearchResult,
} from '../../src/agents/partner-discovery/types.ts'

const request: PartnerDiscoveryRequest = {
  country: 'Germany',
  partnerTypes: ['MSP', 'MSSP'],
  technologyFocus: 'Cybersecurity',
  customerSegment: 'Mid-market',
  desiredCandidateCount: 10,
}

test('discovery rejects directory, social, article, and generic homepage results', async () => {
  const results: WebSearchResult[] = [
    {
      title: 'Top 50 Managed Service Providers Germany 2026',
      url: 'https://www.cloudtango.net/top-msps',
      snippet: 'Directory of managed service providers.',
    },
    {
      title: 'Company Profile',
      url: 'https://www.linkedin.com/company/example',
      snippet: 'Professional profile.',
    },
    {
      title: 'Home',
      url: 'https://example-msp.de/',
      snippet: 'Managed security services for German businesses.',
    },
    {
      title: 'Cybersecurity report and measures',
      url: 'https://example-report.de/report',
      snippet: 'Security report.',
    },
    {
      title: 'Acme Secure | Managed Security Services',
      url: 'https://www.acme-secure.de/services',
      snippet: 'Managed security services for mid-market companies in Germany.',
    },
  ]

  const provider: WebSearchProvider = {
    async search() {
      return results
    },
  }

  const result = await discoverPartnersFromWeb(request, provider)

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.website),
    ['https://www.acme-secure.de']
  )
  assert.equal(result.candidates[0].companyName, 'Acme Secure')
  assert.equal(result.candidates[0].researchStatus, 'unresearched')
  assert.equal(result.skippedResults.length, 4)
})

test('discovery keeps canonical company results and deduplicates by origin', async () => {
  const results: WebSearchResult[] = [
    {
      title: 'Acme Secure | Cybersecurity',
      url: 'https://www.acme-secure.de/security',
      snippet: 'Cybersecurity services.',
    },
    {
      title: 'Acme Secure | Managed Services',
      url: 'https://www.acme-secure.de/about',
      snippet: 'Managed services.',
    },
  ]

  const provider: WebSearchProvider = {
    async search() {
      return results
    },
  }

  const result = await discoverPartnersFromWeb(request, provider)

  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].website, 'https://www.acme-secure.de')
})
