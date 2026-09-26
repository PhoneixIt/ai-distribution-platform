import type { PartnerDiscoveryRequest } from './types'

const MAX_DISCOVERY_QUERIES = 6

function addQuery(queries: string[], value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized || queries.includes(normalized) || queries.length >= MAX_DISCOVERY_QUERIES) return
  queries.push(normalized)
}

/** Build complementary discovery queries for recall; verification happens after discovery. */
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
