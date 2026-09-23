import type { SupabaseClient } from '@supabase/supabase-js'

export type EcosystemOrganizationAlias = {
  id: string
  ecosystem_organization_id: string
  alias: string
  alias_type: string
  source_type: string
  source_reference: string | null
  source_org_id: string | null
  verified: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export async function listEcosystemOrganizationAliases(supabase: SupabaseClient, ecosystemOrganizationId: string) {
  const { data, error } = await supabase.from('ecosystem_organization_aliases').select('*').eq('ecosystem_organization_id', ecosystemOrganizationId).order('alias')
  if (error) throw error
  return (data ?? []) as EcosystemOrganizationAlias[]
}

export async function createEcosystemOrganizationAlias(supabase: SupabaseClient, userId: string, sourceOrgId: string, input: { ecosystem_organization_id: string; alias: string; alias_type?: string; source_type?: string; source_reference?: string | null; verified?: boolean }) {
  const { data, error } = await supabase.from('ecosystem_organization_aliases').insert({ ...input, alias: input.alias.trim(), alias_type: input.alias_type || 'alternate_name', source_type: input.source_type || 'manual', source_org_id: sourceOrgId, created_by: userId, verified: input.verified || false }).select('*').single()
  if (error) throw error
  return data as EcosystemOrganizationAlias
}