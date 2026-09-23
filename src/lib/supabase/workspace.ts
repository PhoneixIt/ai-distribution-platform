import { PRIMARY_ORGANIZATION_TYPES, PARTNER_SUBTYPES } from '@/lib/organization-roles'
import { createClient } from './client'

export const ORGANIZATION_TYPES = [
  ...PRIMARY_ORGANIZATION_TYPES,
  ...PARTNER_SUBTYPES.map(({ value, label }) => ({ value, label })),
  { value: 'other', label: 'Other' },
] as const

export const ORGANIZATION_ROLES = ORGANIZATION_TYPES.filter(({ value }) => value !== 'other')
export type OrganizationType = typeof ORGANIZATION_TYPES[number]['value']

export class WorkspaceSetupRequired extends Error {
  constructor() {
    super('Organization onboarding is required before using this workspace.')
    this.name = 'WorkspaceSetupRequired'
  }
}

export async function ensureWorkspace() {
  const supabase = createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  const user = auth.user

  if (authError || !user || user.is_anonymous) throw authError || new Error('Please sign in.')

  const { data, error } = await supabase
    .from('org_members')
    .select('org_id,organizations(id,name,slug,plan,brand_color,logo_url,organization_type,organization_roles,onboarding_status,ai_autonomy_level)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data?.org_id) throw new WorkspaceSetupRequired()

  const related = data.organizations
  const organization = Array.isArray(related) ? related[0] : related
  if (!organization || !organization.organization_type) throw new WorkspaceSetupRequired()

  return { supabase, user, organization, orgId: data.org_id }
}
