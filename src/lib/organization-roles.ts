export const PRIMARY_ORGANIZATION_TYPES = [
  { value: 'vendor', label: 'Vendor', description: 'Bring technology products and solutions to the channel.' },
  { value: 'distributor', label: 'Distributor', description: 'Connect vendors, partners, and markets.' },
  { value: 'partner', label: 'Partner', description: 'Deliver, resell, integrate, or manage technology solutions.' },
  { value: 'customer', label: 'Customer', description: 'Find solutions and channel support for your organization.' },
] as const

export const PARTNER_SUBTYPES = [
  { value: 'reseller', label: 'Reseller' },
  { value: 'var', label: 'VAR / solution provider' },
  { value: 'msp', label: 'Managed service provider (MSP)' },
  { value: 'mssp', label: 'Managed security service provider (MSSP)' },
  { value: 'system_integrator', label: 'System integrator (SI)' },
  { value: 'technology_partner', label: 'Technology partner' },
  { value: 'service_provider', label: 'Service provider' },
] as const

export type PrimaryOrganizationType = typeof PRIMARY_ORGANIZATION_TYPES[number]['value']
export type PartnerSubtype = typeof PARTNER_SUBTYPES[number]['value']
export type WorkspaceRole = PrimaryOrganizationType | 'other' | 'unconfigured'

export type OrganizationSelection = {
  organizationType: PrimaryOrganizationType
  organizationRoles: PartnerSubtype[]
}

const primaryValues = new Set<string>(PRIMARY_ORGANIZATION_TYPES.map(({ value }) => value))
const subtypeValues = new Set<string>(PARTNER_SUBTYPES.map(({ value }) => value))

const legacyPartnerTypes: Record<string, PartnerSubtype> = {
  reseller: 'reseller',
  var: 'var',
  msp: 'msp',
  mssp: 'mssp',
  system_integrator: 'system_integrator',
  technology_partner: 'technology_partner',
  service_provider: 'service_provider',
}

export function parseOrganizationSelection(value: unknown): OrganizationSelection | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const organizationType = record.organization_type
  const rawRoles = record.organization_roles

  if (typeof organizationType !== 'string' || !primaryValues.has(organizationType)) return null
  if (rawRoles !== undefined && !Array.isArray(rawRoles)) return null

  const roles = (rawRoles ?? []) as unknown[]
  if (roles.some((role) => typeof role !== 'string' || !subtypeValues.has(role))) return null
  if (organizationType !== 'partner' && roles.length > 0) return null

  return {
    organizationType: organizationType as PrimaryOrganizationType,
    organizationRoles: Array.from(new Set(roles as PartnerSubtype[])),
  }
}

export function getOrganizationProfile(organizationType: string | null | undefined, roles: unknown = []) {
  const storedType = typeof organizationType === 'string' ? organizationType.trim() : ''
  const legacySubtype = legacyPartnerTypes[storedType]
  const primaryType: WorkspaceRole = storedType
    ? legacySubtype ? 'partner' : primaryValues.has(storedType) ? storedType as PrimaryOrganizationType : 'other'
    : 'unconfigured'
  const validRoles = Array.isArray(roles)
    ? roles.filter((role): role is PartnerSubtype => typeof role === 'string' && subtypeValues.has(role))
    : []
  const partnerRoles = primaryType === 'partner'
    ? Array.from(new Set([...(legacySubtype ? [legacySubtype] : []), ...validRoles]))
    : []
  const label = PRIMARY_ORGANIZATION_TYPES.find(({ value }) => value === primaryType)?.label
    ?? (primaryType === 'other' ? 'Organization' : 'Role setup needed')

  return {
    primaryType,
    label,
    partnerRoles,
    isConfigured: Boolean(storedType),
  }
}

export function getPartnerSubtypeLabel(value: string) {
  return PARTNER_SUBTYPES.find((subtype) => subtype.value === value)?.label ?? value
}

export const OAUTH_ONBOARDING_STORAGE_KEY = 'portai.pending-onboarding-role'
export const OAUTH_ONBOARDING_TTL_MS = 15 * 60 * 1000

export function createPendingOrganizationState(selection: OrganizationSelection) {
  return JSON.stringify({
    organizationType: selection.organizationType,
    organizationRoles: selection.organizationRoles,
    createdAt: Date.now(),
  })
}

export function parsePendingOrganizationSelection(raw: string | null, now = Date.now()): OrganizationSelection | null {
  if (!raw) return null

  try {
    const pending = JSON.parse(raw) as Record<string, unknown>
    const createdAt = pending.createdAt
    if (typeof createdAt !== 'number' || now - createdAt < 0 || now - createdAt > OAUTH_ONBOARDING_TTL_MS) return null
    return parseOrganizationSelection({
      organization_type: pending.organizationType,
      organization_roles: pending.organizationRoles,
    })
  } catch {
    return null
  }
}
