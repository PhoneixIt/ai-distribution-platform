import type {
  CompanyResearchProvider,
  CompanyResearchRequest,
  CompanyResearchResult,
  PartnerCandidate,
  PartnerEvidenceSource,
} from './types'

export const LOCAL_RESEARCH_PAGE_LIMIT = 5
export const LOCAL_RESEARCH_TIMEOUT_MS = 5000

type PageDocument = {
  url: string
  title: string
  text: string
  html: string
}

type Fact = {
  value: string
  evidence: PartnerEvidenceSource
}

type EvidenceTerm = {
  pattern: RegExp
  value: string
  evidenceTerm?: string
}

const COUNTRY_SIGNALS: Record<string, EvidenceTerm[]> = {
  germany: [
    { pattern: /\bGermany\b|\bDeutschland\b/i, value: 'Germany' },
    {
      pattern: /\b(?:Berlin|Bremen|Cologne|Dresden|Düsseldorf|Frankfurt|Hamburg|Hannover|Leipzig|Munich|München|Nuremberg|Nürnberg|Stuttgart)\b/i,
      value: 'Germany',
    },
    {
      pattern: /\b(?:D-)?\d{5}\s+[A-ZÄÖÜ][\p{L}-]+\b/iu,
      value: 'Germany',
    },
    {
      pattern: /\b(?:Impressum|straße|strasse|str\.|platz|allee)\b/i,
      value: 'Germany',
    },
  ],
}

const COUNTRY_DOMAIN_SUFFIXES: Record<string, string> = {
  de: 'Germany',
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function readableText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function canonicalCompanyName(title: string, fallback: string) {
  const cleaned = title.split(/\\s+[|:-]\\s+/)[0].trim()
  if (!cleaned || /^(home|start|offering|services?|security|cybersecurity)$/i.test(cleaned)) return fallback
  return cleaned.replace(/\\s+/g, ' ')
}

function pageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? readableText(match[1]) : ''
}

function descriptionMeta(html: string) {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
  )
  return match?.[1] ? decodeHtml(match[1]).trim() : ''
}

function normalizeUrl(value: string) {
  const url = new URL(value)
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function sameOrigin(left: URL, right: URL) {
  return left.origin === right.origin
}

function createExcerpt(text: string, term: string) {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index === -1) return text.slice(0, 240)

  const start = Math.max(0, index - 100)
  return text.slice(start, Math.min(text.length, index + term.length + 140)).trim()
}

function evidenceFor(document: PageDocument, term: string): PartnerEvidenceSource {
  return {
    title: document.title || document.url,
    url: document.url,
    sourceType: 'company-website',
    excerpt: createExcerpt(document.text, term),
  }
}

function uniqueFacts(facts: Fact[]) {
  const seen = new Set<string>()
  return facts.filter((fact) => {
    const key = fact.value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function matchedTerms(
  documents: PageDocument[],
  terms: EvidenceTerm[]
) {
  const facts: Fact[] = []

  for (const document of documents) {
    for (const term of terms) {
      const match = term.pattern.exec(document.text)
      if (match) {
        facts.push({
          value: term.value,
          evidence: evidenceFor(document, term.evidenceTerm || match[0]),
        })
      }
      term.pattern.lastIndex = 0
    }
  }

  return uniqueFacts(facts)
}

function matchingContextTerms(
  documents: PageDocument[],
  terms: EvidenceTerm[],
  contextPattern: RegExp
) {
  const facts: Fact[] = []

  for (const document of documents) {
    for (const term of terms) {
      const match = term.pattern.exec(document.text)

      if (match) {
        const evidence = evidenceFor(document, term.evidenceTerm || match[0])
        if (contextPattern.test(evidence.excerpt || '')) {
          facts.push({ value: term.value, evidence })
        }
      }

      term.pattern.lastIndex = 0
      contextPattern.lastIndex = 0
    }
  }

  return uniqueFacts(facts)
}

function exactCountryFact(documents: PageDocument[], country: string) {
  const escapedCountry = country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return matchedTerms(documents, [
    { pattern: new RegExp(`\\b${escapedCountry}\\b`, 'i'), value: country },
  ])[0]
}

function countryFactFor(
  documents: PageDocument[],
  homepage: PageDocument,
  root: URL,
  requestedCountry?: string
) {
  const exactFact = requestedCountry
    ? exactCountryFact(documents, requestedCountry)
    : undefined
  if (exactFact) return { fact: exactFact, inferredFromDomain: false }

  const requestedKey = requestedCountry?.trim().toLowerCase()
  const signalEntries = requestedKey
    ? [[requestedKey, COUNTRY_SIGNALS[requestedKey]] as const]
    : Object.entries(COUNTRY_SIGNALS)
  const signalEntry = signalEntries.find(([, signals]) =>
    signals && matchedTerms(documents, signals).length > 0
  )
  const signalFact = signalEntry
    ? matchedTerms(documents, signalEntry[1])[0]
    : undefined
  if (signalFact) return { fact: signalFact, inferredFromDomain: false }

  const domainSuffix = root.hostname.toLowerCase().split('.').pop() || ''
  const domainCountry = COUNTRY_DOMAIN_SUFFIXES[domainSuffix]
  if (domainCountry && (!requestedCountry || requestedKey === domainCountry.toLowerCase())) {
    return {
      fact: {
        value: domainCountry,
        evidence: {
          ...evidenceFor(homepage, root.hostname),
          excerpt: `Country inferred from the .de domain. ${homepage.text.slice(0, 200)}`,
        },
      },
      inferredFromDomain: true,
    }
  }

  return undefined
}

function extractServices(documents: PageDocument[]) {
  const facts: Fact[] = []
  const servicePattern = /(?:our\s+services|services\s+(?:include|are)|we\s+(?:provide|offer))[^.!?]{0,220}/gi

  for (const document of documents) {
    for (const match of document.text.matchAll(servicePattern)) {
      const value = match[0].trim()
      if (value.length > 12) facts.push({ value, evidence: evidenceFor(document, value) })
    }
  }

  return uniqueFacts(facts)
}

function extractDescription(homepage: PageDocument) {
  const meta = descriptionMeta(homepage.html)
  if (meta) return { value: meta, evidence: evidenceFor(homepage, meta) }

  const firstSentence = homepage.text.match(/^.{40,280}?[.!?](?:\s|$)/)?.[0].trim()
  return firstSentence
    ? { value: firstSentence, evidence: evidenceFor(homepage, firstSentence) }
    : undefined
}

function discoverInternalPages(homepage: PageDocument, root: URL) {
  const links: Array<{ url: string; priority: number }> = []
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const pageKeywords = ['about', 'service', 'solution', 'industry', 'partner', 'company']
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(homepage.html))) {
    try {
      const url = new URL(match[1], root)
      const text = readableText(match[2]).toLowerCase()
      const path = `${url.pathname} ${text}`.toLowerCase()
      const priority = pageKeywords.findIndex((keyword) => path.includes(keyword))

      if (priority === -1 || !sameOrigin(url, root)) continue

      links.push({ url: normalizeUrl(url.toString()), priority })
    } catch {
      continue
    }
  }

  return [...new Map(links.map((link) => [link.url, link])).values()]
    .sort((left, right) => left.priority - right.priority)
    .slice(0, LOCAL_RESEARCH_PAGE_LIMIT - 1)
    .map((link) => link.url)
}

async function fetchTextPage(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'PortAi local development research',
    },
    signal,
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const contentType = response.headers.get('content-type') || ''
  if (contentType && !contentType.includes('html') && !contentType.includes('text/')) {
    throw new Error('Response was not readable HTML or text.')
  }

  const html = await response.text()
  return { html, text: readableText(html), title: pageTitle(html) }
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LOCAL_RESEARCH_TIMEOUT_MS)

  try {
    return await fetchTextPage(url, controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

async function disallowedPaths(root: URL) {
  try {
    const robots = await fetchWithTimeout(new URL('/robots.txt', root).toString())
    const blocked = robots.text
      .split(/\r?
/)
      .filter((line) => /^\s*disallow\s*:/i.test(line))
      .map((line) => line.replace(/^\s*disallow\s*:/i, '').trim())
      .filter(Boolean)

    return blocked
  } catch {
    return []
  }
}

function allowedByRobots(url: string, blockedPaths: string[]) {
  const path = new URL(url).pathname
  return !blockedPaths.some((blockedPath) => path.startsWith(blockedPath))
}

function createFailedResult(request: CompanyResearchRequest, failedUrls: string[]): CompanyResearchResult {
  return {
    companyName: canonicalCompanyName(homepage.title, request.companyName),
    website: request.website,
    evidence: [],
    confidence: 0,
    researchStatus: 'failed',
    pagesFetched: 0,
    failedUrls,
  }
}

export function createLocalCompanyResearchProvider(): CompanyResearchProvider {
  return {
    async research(request) {
      if (!isHttpUrl(request.website)) {
        return createFailedResult(request, [request.website])
      }

      const root = new URL(request.website)
      const homepageUrl = normalizeUrl(root.toString())
      const blockedPaths = await disallowedPaths(root)
      const documents: PageDocument[] = []
      const failedUrls: string[] = []
      const pendingUrls = [homepageUrl]

      while (pendingUrls.length && documents.length + failedUrls.length < LOCAL_RESEARCH_PAGE_LIMIT) {
        const url = pendingUrls.shift() as string

        if (!allowedByRobots(url, blockedPaths)) {
          failedUrls.push(url)
          continue
        }

        try {
          const page = await fetchWithTimeout(url)
          documents.push({ url, ...page })

          if (url === homepageUrl) {
            pendingUrls.push(...discoverInternalPages(documents[0], root))
          }
        } catch {
          failedUrls.push(url)
        }
      }

      if (documents.length === 0) return createFailedResult(request, failedUrls)

      const homepage = documents[0]
      const partnerTypeFacts = matchedTerms(documents, [
        { pattern: /\bmanaged service provider\b/i, value: 'MSP' },
        { pattern: /\bmanaged security service provider\b/i, value: 'MSSP' },
        { pattern: /\bMSSP\b/i, value: 'MSSP' },
        { pattern: /\bMSP\b/i, value: 'MSP' },
        { pattern: /\bsystem integrator\b/i, value: 'System Integrator' },
        { pattern: /\bvalue[- ]added reseller\b/i, value: 'Value-added Reseller' },
        { pattern: /\breseller\b/i, value: 'Reseller' },
        { pattern: /\bdistributor\b/i, value: 'Distributor' },
      ])
      const technologyFacts = matchedTerms(documents, [
        { pattern: /\bcybersecurity\b|\bcyber security\b/i, value: 'Cybersecurity' },
        { pattern: /\bcloud security\b/i, value: 'Cloud security' },
        { pattern: /\bMicrosoft Azure\b/i, value: 'Microsoft Azure' },
        { pattern: /\bAmazon Web Services\b|\bAWS\b/i, value: 'AWS' },
        { pattern: /\bCisco\b/i, value: 'Cisco' },
      ])
      const partnershipFacts = matchedTerms(documents, [
        { pattern: /\bMicrosoft(?:\s+(?:Gold|Silver|Solutions?))?\s+Partner\b/i, value: 'Microsoft Partner' },
        { pattern: /\b(?:AWS|Amazon Web Services)\s+Partner\b/i, value: 'AWS Partner' },
        { pattern: /\bCisco\s+Partner\b/i, value: 'Cisco Partner' },
        { pattern: /\bGoogle Cloud\s+Partner\b/i, value: 'Google Cloud Partner' },
      ])
      const certificationFacts = matchedTerms(documents, [
        { pattern: /\bISO\s*27001\b/i, value: 'ISO 27001' },
        { pattern: /\bSOC\s*2\b/i, value: 'SOC 2' },
        { pattern: /\bCISSP\b/i, value: 'CISSP' },
        { pattern: /\bCISM\b/i, value: 'CISM' },
        { pattern: /\bPCI\s+DSS\b/i, value: 'PCI DSS' },
      ])
      const industryFacts = matchingContextTerms(
        documents,
        [
          'Financial services',
          'Healthcare',
          'Manufacturing',
          'Retail',
          'Public sector',
        ].map((term) => ({
          pattern: new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i'),
          value: term,
        })),
        /industr|sector|vertical|serve/i
      )
      const customerFacts = matchingContextTerms(
        documents,
        [
          { pattern: /\bmid[- ]market\b/i, value: 'Mid-market' },
          { pattern: /\bmittelstand\b|\bmittelständ\w*/i, value: 'Mid-market' },
          { pattern: /\bSMB\b|\bSME\b|\bSMEs\b|\bKMU\b/i, value: 'SMB' },
          {
            pattern: /\bsmall and medium-sized enterprises?\b/i,
            value: 'SMB',
          },
          { pattern: /\benterprise\b|\blarge enterprises?\b/i, value: 'Enterprise' },
          { pattern: /\bcorporate clients?\b/i, value: 'Enterprise' },
        ],
        /customer|client|business|serve/i
      )
      const serviceFacts = extractServices(documents)
      const countryDetection = request.country
        ? countryFactFor(documents, homepage, root, request.country)
        : countryFactFor(documents, homepage, root)
      const countryFact = countryDetection ? [countryDetection.fact] : []
      const descriptionFact = extractDescription(homepage)
      const allFacts = [
        ...partnerTypeFacts,
        ...technologyFacts,
        ...partnershipFacts,
        ...certificationFacts,
        ...industryFacts,
        ...customerFacts,
        ...serviceFacts,
        ...countryFact,
        ...(descriptionFact ? [descriptionFact] : []),
      ]
      const evidence = [...new Map(allFacts.map((fact) => [
        `${fact.evidence.url}:${fact.value}`,
        fact.evidence,
      ])).values()]
      const status = failedUrls.length ? 'partial' : 'researched'
      const confidenceBase = countryDetection?.inferredFromDomain ? 0.2 : 0.3
      const confidence = Math.min(0.95, Math.max(0.2, confidenceBase + allFacts.length * 0.05))

      return {
        companyName: request.companyName,
        website: request.website,
        ...(descriptionFact ? { description: descriptionFact.value } : {}),
        ...(countryFact.length ? { country: request.country } : {}),
        locations: countryFact.map((fact) => fact.value),
        partnerTypes: partnerTypeFacts.map((fact) => fact.value),
        industries: industryFacts.map((fact) => fact.value),
        customerSegments: customerFacts.map((fact) => fact.value),
        services: serviceFacts.map((fact) => fact.value),
        technologies: technologyFacts.map((fact) => fact.value),
        vendorPartnerships: partnershipFacts.map((fact) => fact.value),
        certifications: certificationFacts.map((fact) => fact.value),
        evidence,
        confidence,
        researchStatus: status,
        pagesFetched: documents.length,
        failedUrls,
      }
    },
  }
}

export function enrichPartnerCandidate(
  candidate: PartnerCandidate,
  research: CompanyResearchResult
): PartnerCandidate {
  const researchSources = research.evidence
  const evidence = [...candidate.evidence, ...researchSources].filter(
    (source, index, sources) =>
      sources.findIndex((other) => other.url === source.url && other.excerpt === source.excerpt) === index
  )
  const concerns = [...candidate.concerns]

  if (research.researchStatus !== 'researched') {
    concerns.push('Website research was incomplete; verify all extracted information.')
  } else {
    concerns.push('Website facts were extracted automatically and still require human verification.')
  }

  return {
    ...candidate,
    companyName: research.companyName || candidate.companyName,
    website: research.website || candidate.website,
    country: research.country || candidate.country,
    companySize: research.companySize || candidate.companySize,
    description: research.description || candidate.description,
    locations: research.locations?.length ? research.locations : candidate.locations,
    partnerTypes: research.partnerTypes?.length ? research.partnerTypes : candidate.partnerTypes,
    industries: research.industries?.length ? research.industries : candidate.industries,
    customerSegments: research.customerSegments?.length
      ? research.customerSegments
      : candidate.customerSegments,
    services: research.services?.length ? research.services : candidate.services,
    technologies: research.technologies?.length ? research.technologies : candidate.technologies,
    vendorPartnerships: research.vendorPartnerships?.length
      ? research.vendorPartnerships
      : candidate.vendorPartnerships,
    certifications: research.certifications?.length
      ? research.certifications
      : candidate.certifications,
    evidence,
    researchStatus: research.researchStatus,
    researchSources,
    researchedAt: new Date().toISOString(),
    researchConfidence: research.confidence,
    concerns: [...new Set(concerns)],
  }
}

const MOCK_RESEARCH_RESULT: CompanyResearchResult = {
  companyName: 'Northstar Cyber Systems',
  website: 'https://northstar.example.com',
  description: 'Managed security services and incident response for enterprise teams.',
  country: 'Germany',
  locations: ['Germany'],
  partnerTypes: ['MSSP'],
  industries: [],
  customerSegments: ['Enterprise'],
  services: ['Managed security services'],
  technologies: ['Cybersecurity'],
  vendorPartnerships: [],
  certifications: ['ISO 27001'],
  evidence: [
    {
      title: 'Northstar Cyber Systems security services',
      url: 'https://northstar.example.com/services',
      sourceType: 'company-website',
      excerpt: 'Northstar is a managed security service provider for enterprise teams.',
    },
  ],
  confidence: 0.8,
  researchStatus: 'researched',
  pagesFetched: 2,
  failedUrls: [],
}

export function createMockCompanyResearchProvider(): CompanyResearchProvider {
  return {
    async research() {
      return { ...MOCK_RESEARCH_RESULT, evidence: [...MOCK_RESEARCH_RESULT.evidence] }
    },
  }
}

export function createResearchDemoCandidate(): PartnerCandidate {
  return {
    companyName: 'Northstar Cyber Systems',
    website: 'https://northstar.example.com',
    country: 'Germany',
    description: 'Managed security services and incident response for enterprise teams.',
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
        title: 'Northstar Cyber Systems search result',
        url: 'https://northstar.example.com',
        sourceType: 'search-result',
      },
    ],
    fitScore: 0,
    qualificationReasons: ['Preliminary candidate from web discovery.'],
    concerns: ['Candidate has not been researched or verified yet.'],
    verificationStatus: 'preliminary',
    researchStatus: 'unresearched',
    researchSources: [],
  }
}

export async function runMockCompanyResearchDemo(
  candidate = createResearchDemoCandidate()
) {
  const result = await createMockCompanyResearchProvider().research({
    companyName: candidate.companyName,
    website: candidate.website,
    country: candidate.country || undefined,
    sourceEvidence: candidate.evidence,
  })

  return enrichPartnerCandidate(candidate, result)
}