import type { SupabaseClient } from '@supabase/supabase-js'

export type EcosystemOrganization = {
  id: string
  canonical_name: string
  display_name: string
  normalized_name: string
  website: string | null
  country: string | null
  organization_roles: string[]
  description: string | null
  source_type: string
  source_reference: string | null
  verified: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function listEcosystemOrganizations(
  supabase: SupabaseClient,
  search = '',
  limit = 100,
): Promise<EcosystemOrganization[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200)
  let query = supabase.from('ecosystem_organizations').select('*').order('display_name').limit(safeLimit)
  if (search.trim()) {
    const term = search.trim().replace(/[%_]/g, '')
    query = query.ilike('display_name', `%${term}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as EcosystemOrganization[]
}

export async function ensureEcosystemOrganization(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  input: { display_name: string; website?: string | null; country?: string | null; organization_roles?: string[] },
): Promise<EcosystemOrganization> {
  const normalized_name = normalizeName(input.display_name)
  if (!normalized_name) throw new Error('Organization name is required.')

  const existing = await supabase.from('ecosystem_organizations').select('*').eq('normalized_name', normalized_name).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data as EcosystemOrganization

  const { data, error } = await supabase.from('ecosystem_organizations').insert({
    canonical_name: input.display_name.trim(),
    display_name: input.display_name.trim(),
    normalized_name,
    website: input.website?.trim() || null,
    country: input.country?.trim() || null,
    organization_roles: input.organization_roles || [],
    source_type: 'manual',
    verified: false,
    created_by: userId,
    created_in_org_id: orgId,
  }).select('*').single()
  if (error) throw error
  return data as EcosystemOrganization
}
