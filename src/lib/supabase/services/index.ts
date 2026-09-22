import type { SupabaseClient } from '@supabase/supabase-js'

export type PartnerRecord = {
  id: string
  name: string
  slug: string
  website: string | null
  logo_url: string | null
  description: string | null
  partner_types: string[]
  country: string | null
  regions: string[]
  industries: string[]
  company_size: string | null
  employee_range: string | null
  specializations: string[]
  certifications: string[]
  technologies: string[]
  services: string[]
  customer_segments: string[]
  deployment_capabilities: string[]
  sales_regions: string[]
  vendor_count: number
  is_verified: boolean
  verification_status: string
  source_reference: string | null
  source_type: string
  last_verified: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type OpportunityRecord = {
  id: string
  org_id: string
  customer_id: string
  created_by: string
  title: string
  description: string | null
  source: string
  status: string
  stage: string
  estimated_value: number | null
  currency: string
  probability: number
  expected_close_date: string | null
  budget_range: string | null
  timeline: string | null
  requirements: string[]
  technology_categories: string[]
  preferred_region: string | null
  decision_role: string | null
  competitor_products: string[]
  notes: string | null
  won_at: string | null
  lost_at: string | null
  lost_reason: string | null
  created_at: string
  updated_at: string
}

type PartnerInput = Partial<Omit<PartnerRecord, 'id' | 'created_at' | 'updated_at' | 'slug' | 'vendor_count' | 'is_verified' | 'verification_status' | 'source_type' | 'is_active'>> & {
  name: string
  slug?: string
}

type LegacyOpportunityInput = {
  vendor_id?: string
  title: string
  description?: string | null
  country?: string
  region?: string
  industry?: string
  customer_segment?: string
  opportunity_value?: number | null
  currency?: string
  technologies?: string[]
  required_capabilities?: string[]
  required_certifications?: string[]
  status?: string
  stage?: string
}

export async function getPartners(
  supabase: SupabaseClient,
  filters: { country?: string; partnerType?: string; limit?: number } = {},
): Promise<PartnerRecord[]> {
  let query = supabase.from('partners').select('*').order('name').limit(Math.min(Math.max(filters.limit ?? 100, 1), 500))
  if (filters.country) query = query.eq('country', filters.country)
  if (filters.partnerType) query = query.contains('partner_types', [filters.partnerType])
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PartnerRecord[]
}

export async function getPartnerById(supabase: SupabaseClient, id: string): Promise<PartnerRecord> {
  const { data, error } = await supabase.from('partners').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Partner not found')
  return data as PartnerRecord
}

export async function createPartner(supabase: SupabaseClient, input: PartnerInput): Promise<PartnerRecord> {
  const slug = input.slug || input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data, error } = await supabase.from('partners').insert({ ...input, slug, source_type: 'manual', is_verified: false, verification_status: 'pending' }).select('*').single()
  if (error) throw error
  return data as PartnerRecord
}

export async function updatePartner(supabase: SupabaseClient, id: string, updates: Partial<PartnerInput>): Promise<PartnerRecord> {
  const { data, error } = await supabase.from('partners').update(updates).eq('id', id).select('*').single()
  if (error) throw error
  return data as PartnerRecord
}

export async function deletePartner(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('partners').delete().eq('id', id)
  if (error) throw error
}

export async function getOpportunities(
  supabase: SupabaseClient,
  vendorId: string,
  filters: { status?: string; limit?: number } = {},
): Promise<OpportunityRecord[]> {
  void vendorId
  let query = supabase.from('opportunities').select('*').order('created_at', { ascending: false }).limit(Math.min(Math.max(filters.limit ?? 100, 1), 500))
  if (filters.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as OpportunityRecord[]
}

export async function getOpportunityById(supabase: SupabaseClient, id: string): Promise<OpportunityRecord> {
  const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Opportunity not found')
  return data as OpportunityRecord
}

export async function createOpportunity(supabase: SupabaseClient, input: LegacyOpportunityInput): Promise<OpportunityRecord> {
  const { data: membership, error: membershipError } = await supabase.from('org_members').select('org_id,user_id').limit(1).maybeSingle()
  if (membershipError) throw membershipError
  if (!membership) throw new Error('No active workspace found')
  const { data, error } = await supabase.from('opportunities').insert({
    org_id: membership.org_id,
    customer_id: membership.user_id,
    created_by: membership.user_id,
    title: input.title,
    description: input.description ?? null,
    currency: input.currency || 'USD',
    estimated_value: input.opportunity_value ?? null,
    requirements: [...(input.required_capabilities || []), ...(input.required_certifications || [])],
    technology_categories: input.technologies || [],
    preferred_region: input.region || input.country || null,
    status: input.status || 'open',
    stage: input.stage === 'lead' ? 'new' : input.stage || 'new',
  }).select('*').single()
  if (error) throw error
  return data as OpportunityRecord
}

export async function updateOpportunity(supabase: SupabaseClient, id: string, updates: Partial<OpportunityRecord>): Promise<OpportunityRecord> {
  const { data, error } = await supabase.from('opportunities').update(updates).eq('id', id).select('*').single()
  if (error) throw error
  return data as OpportunityRecord
}

export async function deleteOpportunity(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw error
}


export { listEcosystemOrganizations, ensureEcosystemOrganization, updateEcosystemOrganizationRoles, normalizeOrganizationName, normalizeDomain } from './ecosystem-organizations'
export type { EcosystemOrganization, EcosystemOrganizationInput } from './ecosystem-organizations'
export { listEcosystemConnections, createEcosystemConnection, updateEcosystemConnection } from './ecosystem-connections'
export type { EcosystemConnection } from './ecosystem-connections'
export { listExternalIdentities, findExternalIdentity, upsertExternalIdentity } from './ecosystem-identities'
export type { EcosystemExternalIdentity } from './ecosystem-identities'
export { listEcosystemOrganizationAliases, createEcosystemOrganizationAlias } from './ecosystem-aliases'
export type { EcosystemOrganizationAlias } from './ecosystem-aliases'
