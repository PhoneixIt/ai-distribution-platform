export const SCORING_MODEL = {
  country: 30,
  partnerType: 25,
  technology: 25,
  industry: 10,
  customerSegment: 10,
  serviceOrCapability: 10,
  vendorPartnership: 10,
  certification: 5,
  companySize: 5,
} as const

export const QUALIFICATION_THRESHOLDS = {
  qualified: 0.8,
} as const

export function calculateMatchPercentage(matchedWeight: number, totalWeight: number): number {
  if (totalWeight <= 0) return 0
  return Math.round((matchedWeight / totalWeight) * 100)
}
