export type OpportunityMatchingInput = {
  requirements?: unknown
  technologyCategories?: unknown
  description?: string | null
  preferredRegion?: string | null
  customerIndustry?: unknown
  customerCompanySize?: unknown
}

export type PartnerMatchingInput = {
  id: string
  name: string
  website?: string | null
  description?: string | null
  partnerTypes?: unknown
  country?: string | null
  regions?: unknown
  industries?: unknown
  companySize?: string | null
  employeeRange?: string | null
  specializations?: unknown
  certifications?: unknown
  technologies?: unknown
  services?: unknown
  customerSegments?: unknown
  deploymentCapabilities?: unknown
  salesRegions?: unknown
  isVerified?: boolean | null
  verificationStatus?: string | null
}

export type OpportunityPartnerMatch = {
  partner: PartnerMatchingInput
  matchScore: number
  capabilityFit: number
  geographyFit: number
  industryFit: number
  companySizeFit: number
  verificationFit: number
  strengths: string[]
  risks: string[]
  missingCapabilities: string[]
  reason: string
  recommendedAction: string
}

export function normalizeMatchValues(values: unknown): string[] {
  if (Array.isArray(values)) return values.flatMap((value) => normalizeMatchValues(value))
  if (typeof values === 'string') {
    return values
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  }
  return []
}

export function overlapScore(needles: string[], haystack: string[]) {
  if (!needles.length || !haystack.length) return 0

  const matches = needles.filter((needle) =>
    haystack.some((value) => value.includes(needle) || needle.includes(value)),
  )

  return Math.min(100, Math.round((matches.length / needles.length) * 100))
}

export function calculateOpportunityPartnerMatch(
  opportunity: OpportunityMatchingInput,
  partner: PartnerMatchingInput,
): OpportunityPartnerMatch {
  const requirementTerms = normalizeMatchValues(opportunity.requirements)
  const technologyTerms = normalizeMatchValues(opportunity.technologyCategories)
  const descriptionTerms = String(opportunity.description || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((value) => value.length > 3)
    .slice(0, 20)

  const capabilityNeeds = [...new Set([...technologyTerms, ...requirementTerms])]
  const industryNeeds = normalizeMatchValues(opportunity.customerIndustry)
  const companySizeNeeds = normalizeMatchValues(opportunity.customerCompanySize)
  const geographyNeed = String(opportunity.preferredRegion || '').trim().toLowerCase()

  const capabilities = normalizeMatchValues([
    ...normalizeMatchValues(partner.specializations),
    ...normalizeMatchValues(partner.technologies),
    ...normalizeMatchValues(partner.services),
    ...normalizeMatchValues(partner.deploymentCapabilities),
    ...normalizeMatchValues(partner.partnerTypes),
    ...normalizeMatchValues(partner.certifications),
  ])

  const geography = normalizeMatchValues([
    partner.country,
    ...normalizeMatchValues(partner.regions),
    ...normalizeMatchValues(partner.salesRegions),
  ])

  const industries = normalizeMatchValues(partner.industries)

  const capabilityFit = overlapScore(capabilityNeeds, capabilities)
  const geographyFit = geographyNeed ? overlapScore([geographyNeed], geography) : 50
  const industryFit = industryNeeds.length ? overlapScore(industryNeeds, industries) : 50
  const partnerSizes = normalizeMatchValues([partner.companySize, partner.employeeRange])
  const companySizeFit = companySizeNeeds.length ? overlapScore(companySizeNeeds, partnerSizes) : 50
  const verificationFit =
    partner.isVerified || partner.verificationStatus === 'verified' ? 100 : 50

  const matchScore = Math.round(
    capabilityFit * 0.40 +
      geographyFit * 0.25 +
      industryFit * 0.20 +
      companySizeFit * 0.05 +
      verificationFit * 0.10,
  )

  const strengths: string[] = []
  const risks: string[] = []

  if (capabilityFit >= 70) strengths.push('Strong technology and capability alignment')
  else if (capabilityFit > 0) strengths.push('Partial capability alignment')
  else risks.push('No direct capability overlap found')

  if (geographyFit >= 70) strengths.push('Good geographic coverage')
  else if (geographyNeed) risks.push('Geographic coverage needs verification')

  if (industryFit >= 70) strengths.push('Relevant industry experience')
  if (companySizeFit >= 70) strengths.push('Customer-size alignment')
  if (partner.isVerified) strengths.push('Verified partner profile')
  else risks.push('Partner profile is not verified')

  const missingCapabilities = capabilityNeeds.filter(
    (need) => !capabilities.some((value) => value.includes(need) || need.includes(value)),
  )

  if (
    descriptionTerms.some((term) =>
      capabilities.some((value) => value.includes(term)),
    )
  ) {
    strengths.push('Opportunity description contains relevant capability terms')
  }

  const reason = strengths.length
    ? strengths.slice(0, 3).join('; ')
    : 'Limited structured data match; review the evidence before engagement.'

  const recommendedAction =
    matchScore >= 75
      ? 'Review and contact this partner.'
      : matchScore >= 55
        ? 'Verify capabilities before outreach.'
        : 'Keep as a lower-priority candidate.'

  return {
    partner,
    matchScore,
    capabilityFit,
    geographyFit,
    industryFit,
    companySizeFit,
    verificationFit,
    strengths,
    risks,
    missingCapabilities,
    reason,
    recommendedAction,
  }
}
