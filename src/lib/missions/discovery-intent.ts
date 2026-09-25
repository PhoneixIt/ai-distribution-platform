export type ParsedDiscoveryIntent = {
  country?: string
  technologyFocus?: string
  partnerTypes: string[]
  customerSegment?: string
  desiredCandidateCount?: number
}

const partnerTypePatterns: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\b(?:managed security service providers?|mssps?)\b/gi, value: 'MSSP' },
  { pattern: /\b(?:managed service providers?|msps?)\b/gi, value: 'MSP' },
  { pattern: /\b(?:value[- ]added resellers?|vars?)\b/gi, value: 'Value-added Reseller' },
  { pattern: /\b(?:systems? integrators?|integrators?)\b/gi, value: 'System Integrator' },
  { pattern: /\b(?:cloud service providers?|csps?)\b/gi, value: 'CSP' },
  { pattern: /\b(?:consulting partners?)\b/gi, value: 'Consulting Partner' },
  { pattern: /\b(?:technology partners?)\b/gi, value: 'Technology Partner' },
  { pattern: /\b(?:service partners?)\b/gi, value: 'Service Partner' },
  { pattern: /\bdistributors?\b/gi, value: 'Distributor' },
  { pattern: /\bresellers?\b/gi, value: 'Reseller' },
]

const knownTechnologyPatterns: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bcyber ?security\b/i, value: 'Cybersecurity' },
  { pattern: /\bcloud security\b/i, value: 'Cloud security' },
  { pattern: /\bidentity(?: and| &) access management\b/i, value: 'Identity and access management' },
  { pattern: /\bendpoint security\b/i, value: 'Endpoint security' },
  { pattern: /\bnetwork security\b/i, value: 'Network security' },
  { pattern: /\bbackup\b/i, value: 'Backup' },
  { pattern: /\bnetworking\b/i, value: 'Networking' },
  { pattern: /\bcloud\b/i, value: 'Cloud' },
  { pattern: /\bdata cent(?:er|re)\b/i, value: 'Data center' },
  { pattern: /\binfrastructure\b/i, value: 'Infrastructure' },
  { pattern: /\b(?:artificial intelligence|machine learning|AI|ML)\b/i, value: 'AI / machine learning' },
  { pattern: /\bCRM\b/i, value: 'CRM' },
  { pattern: /\bERP\b/i, value: 'ERP' },
]

function cleanCountry(value: string) {
  const stopWords = new Set([
    'that', 'who', 'which', 'serving', 'with', 'where', 'as', 'could',
    'would', 'can', 'should', 'and', 'to', 'for', 'selling', 'targeting',
    'employees', 'employee', 'countries', 'country', 'regions', 'region', 'markets',
  ])
  const tokens = value.trim().split(/\s+/)
  const kept: string[] = []

  for (const token of tokens) {
    const normalized = token.replace(/[.,!?;:]$/g, '').toLowerCase()
    if (stopWords.has(normalized)) break
    kept.push(token)
  }

  return kept.join(' ').replace(/[.,!?;:]$/g, '').trim()
}

function parsePartnerTypes(objective: string) {
  const matches: Array<{ index: number; length: number; value: string }> = []

  for (const item of partnerTypePatterns) {
    for (const match of objective.matchAll(item.pattern)) {
      matches.push({ index: match.index ?? 0, length: match[0].length, value: item.value })
    }
  }

  const selected: string[] = []
  let coveredUntil = -1
  for (const match of matches.sort((left, right) => left.index - right.index || right.length - left.length)) {
    if (match.index < coveredUntil || selected.includes(match.value)) continue
    selected.push(match.value)
    coveredUntil = match.index + match.length
  }
  return selected
}

function parseTechnologyFocus(objective: string, partnerTypes: string[]) {
  const lower = objective.toLowerCase()
  const markers = [
    'specializing in ',
    'specialising in ',
    'focused on ',
    'focus on ',
    'expertise in ',
    'experienced in ',
    'proficient in ',
  ]

  for (const marker of markers) {
    const index = lower.indexOf(marker)
    if (index === -1) continue

    const tail = objective.slice(index + marker.length)
    const cutPoints = [
      tail.toLowerCase().indexOf(' in '),
      tail.toLowerCase().indexOf(' across '),
      tail.toLowerCase().indexOf(' throughout '),
      tail.toLowerCase().indexOf(' within '),
      tail.toLowerCase().indexOf(' for '),
      tail.toLowerCase().indexOf(' that '),
      tail.toLowerCase().indexOf(' who '),
      tail.toLowerCase().indexOf(' which '),
      tail.search(/[,.!?;:]/),
    ].filter((point) => point >= 0)
    const end = cutPoints.length ? Math.min(...cutPoints) : tail.length
    const phrase = tail.slice(0, end).trim()
    if (phrase && phrase.length <= 100) return phrase
  }

  const firstPartnerMatch = partnerTypePatterns
    .flatMap(({ pattern }) => [...objective.matchAll(pattern)].map((match) => match.index ?? objective.length))
    .sort((left, right) => left - right)[0]

  if (firstPartnerMatch !== undefined) {
    const phrase = objective.slice(0, firstPartnerMatch)
      .replace(/^\s*(?:please\s+)?(?:help me\s+)?(?:find|discover|identify|source|search for|look for|recommend|show me)\b/i, '')
      .replace(/^\s*(?:up to\s+)?\d+\s*/, '')
      .replace(/\b(?:qualified|relevant|suitable|potential|prospective|top|best|target)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(?:channel|technology|service)\s*$/i, '')
      .replace(/[\s,.;:!?-]+$/g, '')
      .trim()

    if (phrase && phrase.length <= 80 && !/^(?:partners?|companies|vendors?)$/i.test(phrase)) return phrase
  }

  for (const item of knownTechnologyPatterns) {
    const match = objective.match(item.pattern)
    if (match) return match[0].replace(/\s+/g, ' ').trim() || item.value
  }

  const needMarkers = [
    /\b(?:i|we)\s+(?:need|require|want|am looking for|are looking for)\s+(?:a|an|the)?\s*/i,
    /\b(?:find|source|identify|recommend)\s+(?:a|an|the)?\s*/i,
  ]
  for (const marker of needMarkers) {
    const match = objective.match(marker)
    if (!match || match.index === undefined) continue
    const tail = objective.slice(match.index + match[0].length)
    const cutPoints = [
      tail.toLowerCase().indexOf(' across '),
      tail.toLowerCase().indexOf(' throughout '),
      tail.toLowerCase().indexOf(' within '),
      tail.toLowerCase().indexOf(' in '),
      tail.toLowerCase().indexOf(' for '),
      tail.toLowerCase().indexOf(' that '),
      tail.search(/[,.!?;:]/),
    ].filter((point) => point >= 0)
    const end = cutPoints.length ? Math.min(...cutPoints) : tail.length
    const phrase = tail.slice(0, end).trim()
    if (phrase && phrase.length <= 100) return phrase
  }

  return undefined
}

function parseCustomerSegment(objective: string) {
  if (/\bmid[- ]market\b|\bmittelstand\b/i.test(objective)) return 'Mid-market'
  if (/\b(?:SMB|SME|small and medium[- ]sized businesses?)\b/i.test(objective)) return 'SMB'
  if (/\b(?:enterprise|large businesses?)\b/i.test(objective)) return 'Enterprise'
  return undefined
}

export function parseDiscoveryIntent(objective: string): ParsedDiscoveryIntent {
  const text = objective.trim()
  const countryMatch = text.match(/\b(?:in|across|throughout|within)\s+(?:the\s+)?([\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*){0,2})/iu)
  const country = countryMatch ? cleanCountry(countryMatch[1]) : ''
  const broadMarkets = new Set(['africa', 'apac', 'asia', 'dach', 'emea', 'europe', 'latin america', 'latam', 'middle east'])
  const countMatch = text.match(/\b(?:find|discover|identify|source|up to)\s+(?:up to\s+)?(\d{1,3})\b/i)
    || text.match(/\b(\d{1,3})\s+(?:qualified\s+)?(?:channel\s+)?(?:partners?|companies|vendors|distributors|resellers|msps?|mssps?|vars?)\b/i)
  const partnerTypes = parsePartnerTypes(text)
  const desiredCandidateCount = countMatch ? Number(countMatch[1]) : undefined

  return {
    country: country && !broadMarkets.has(country.toLowerCase()) ? country : undefined,
    technologyFocus: parseTechnologyFocus(text, partnerTypes),
    partnerTypes,
    customerSegment: parseCustomerSegment(text),
    desiredCandidateCount: desiredCandidateCount && desiredCandidateCount > 0
      ? Math.min(desiredCandidateCount, 100)
      : undefined,
  }
}
