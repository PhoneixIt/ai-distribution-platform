import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error Node test runner loads the TypeScript source directly.
import { discoverPartnersFromWeb } from '../../src/agents/partner-discovery/web-discovery.ts'
import type {
  PartnerDiscoveryRequest,
  WebSearchProvider,
  WebSearchResult,
} from '../../src/agents/partner-discovery/types.ts'

/**
 * Regression coverage for the identity filter.
 *
 * A real production mission (mission 86549c16, run 7c0d007a, 2026-09-27) returned
 * three "candidates" that were all search artifacts:
 *
 *   1. "Dutch NCCA: Home"                     -> dutchncca.nl, a certification authority
 *   2. "Infomsp"                              -> infomsp.com/managed/location/Netherlands, a directory
 *   3. "Managed Service Providers in Netherlands" -> a vendor SEO listicle
 *
 * The filter rejected the equivalent titles for Germany but named "germany"
 * literally, so every other market leaked listicles through. These tests pin the
 * country-agnostic behaviour and the page-label name cleanup.
 */

const netherlands: PartnerDiscoveryRequest = {
  country: 'Netherlands',
  partnerTypes: ['MSP'],
  technologyFocus: 'Cybersecurity',
  customerSegment: 'Mid-market',
  desiredCandidateCount: 10,
}

const portugal: PartnerDiscoveryRequest = { ...netherlands, country: 'Portugal' }
const unitedKingdom: PartnerDiscoveryRequest = { ...netherlands, country: 'United Kingdom' }

function providerFor(results: WebSearchResult[]): WebSearchProvider {
  return { async search() { return results } }
}

test('directory and listicle titles are rejected for every market, not only Germany', async () => {
  const listicles: WebSearchResult[] = [
    { title: 'Managed Service Providers in Netherlands', url: 'https://www.bell-integration.com/managed-service-providers-in-netherlands/', snippet: 'Our list.' },
    { title: 'Managed IT Services In Netherlands | Top MSPs in Netherlands - InfoMSP', url: 'https://infomsp.com/managed/location/Netherlands', snippet: 'Top MSPs in Netherlands.' },
    { title: 'Top 15 Cybersecurity MSPs in Portugal', url: 'https://ptmsexcel.pt/top-msps', snippet: 'Directory.' },
    { title: 'Distributors in the United Kingdom', url: 'https://example.co.uk/distributors', snippet: 'List.' },
    { title: 'Top 50 Managed Service Providers Germany 2026', url: 'https://www.cloudtango.net/top-msps', snippet: 'Directory of managed service providers.' },
  ]

  for (const request of [netherlands, portugal, unitedKingdom]) {
    const result = await discoverPartnersFromWeb(request, providerFor(listicles))
    assert.deepEqual(
      result.candidates.map((c) => c.website),
      [],
      `no listicle may become a candidate for ${request.country}`
    )
  }
})

test('a trailing page label is stripped from the company name', async () => {
  const result = await discoverPartnersFromWeb(
    netherlands,
    providerFor([
      { title: 'Dutch NCCA: Home', url: 'https://www.dutchncca.nl/', snippet: 'National Cybersecurity Certification Authority.' },
    ])
  )

  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].companyName, 'Dutch NCCA')
})

test('genuine company results are still admitted and keep their names', async () => {
  const result = await discoverPartnersFromWeb(
    netherlands,
    providerFor([
      { title: 'Acme Secure | Managed Security Services', url: 'https://www.acme-secure.nl/services', snippet: 'Managed security for mid-market.' },
      { title: 'Beta Beveiliging', url: 'https://beta-beveiliging.nl/', snippet: 'Security operations.' },
      { title: 'Gamma Systems: Home', url: 'https://gamma-systems.nl/', snippet: 'Systems integration.' },
    ])
  )

  assert.deepEqual(
    result.candidates.map((c) => c.website),
    ['https://www.acme-secure.nl', 'https://beta-beveiliging.nl', 'https://gamma-systems.nl']
  )
  assert.deepEqual(
    result.candidates.map((c) => c.companyName),
    ['Acme Secure', 'Beta Beveiliging', 'Gamma Systems']
  )
})

test('a listicle headline is rejected even when a real brand follows it in the title', async () => {
  // "Best MSPs in the Netherlands | Acme Secure" only trips the listicle rule on
  // its first delimited segment, so the whole-title check alone is not enough.
  const result = await discoverPartnersFromWeb(
    netherlands,
    providerFor([
      { title: 'Best MSPs in the Netherlands | Acme Secure', url: 'https://bestmsps.nl/acme-secure', snippet: 'Ranked listicle.' },
    ])
  )

  assert.deepEqual(result.candidates.map((c) => c.website), [])
})

test('a company legitimately named with a service word is not mistaken for a listicle', async () => {
  const result = await discoverPartnersFromWeb(
    netherlands,
    providerFor([
      { title: 'Managed Services Netherlands BV', url: 'https://managedservices.nl/', snippet: 'Independent consultancy.' },
      { title: 'Partners Plus', url: 'https://partnersplus.nl/', snippet: 'Channel partner.' },
    ])
  )

  assert.deepEqual(
    result.candidates.map((c) => c.website),
    ['https://managedservices.nl', 'https://partnersplus.nl']
  )
})
