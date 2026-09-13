import { createClient } from './client'

export async function ensureWorkspace() {
  const supabase = createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  const user = auth.user
  if (authError || !user || user.is_anonymous) throw authError || new Error('Please sign in.')

  const { data: existing, error: memberError } = await supabase
    .from('org_members')
    .select('org_id, organizations(id,name,slug,plan,brand_color,logo_url)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (memberError) throw memberError
  if (existing?.org_id) return { supabase, user, organization: Array.isArray(existing.organizations) ? existing.organizations[0] : existing.organizations, orgId: existing.org_id }

  const baseName = (user.user_metadata?.full_name as string | undefined)?.trim() || user.email?.split('@')[0] || 'My Workspace'
  const slugBase = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'workspace'
  const slug = `${slugBase}-${user.id.slice(0, 8)}`

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: `${baseName} Workspace`, slug, owner_id: user.id, plan: 'starter' })
    .select('id,name,slug,plan,brand_color,logo_url')
    .single()
  if (orgError || !organization) throw orgError || new Error('Could not create workspace.')

  const { error: insertMemberError } = await supabase.from('org_members').insert({ org_id: organization.id, user_id: user.id, role: 'owner', status: 'active' })
  if (insertMemberError) throw insertMemberError

  return { supabase, user, organization, orgId: organization.id }
}
