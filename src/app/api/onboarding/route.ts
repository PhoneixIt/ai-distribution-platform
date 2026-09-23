import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { parseOrganizationSelection } from '@/lib/organization-roles'

type WorkspaceRecord = {
  id: string
  name: string
  slug: string
  plan: string
  organization_type: string | null
  organization_roles: string[] | null
  onboarding_status: string | null
}

type MembershipRecord = {
  org_id: string
  role: string
  organizations: WorkspaceRecord | WorkspaceRecord[] | null
}

async function getMembership(supabase: Awaited<ReturnType<typeof getAuthenticatedServerClient>>['supabase'], userId: string) {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id,role,organizations(id,name,slug,plan,organization_type,organization_roles,onboarding_status)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const membership = data as unknown as MembershipRecord | null
  const related = membership?.organizations
  const workspace = Array.isArray(related) ? related[0] : related

  return { membership, workspace: workspace ?? null }
}

function responseForWorkspace(workspace: WorkspaceRecord | null) {
  if (!workspace) return { status: 'new' as const, workspace: null }
  if (!workspace.organization_type) return { status: 'needs_setup' as const, workspace }
  return { status: 'configured' as const, workspace }
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedServerClient()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  try {
    const { workspace } = await getMembership(supabase, user.id)
    return NextResponse.json(responseForWorkspace(workspace), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load workspace setup.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedServerClient()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Choose a valid organization type.' }, { status: 400 })
  }

  const selection = parseOrganizationSelection(body)
  if (!selection) return NextResponse.json({ error: 'Choose a valid organization type and partner subtypes.' }, { status: 400 })

  try {
    const { membership, workspace } = await getMembership(supabase, user.id)

    if (membership && !workspace) {
      return NextResponse.json({ error: 'Your workspace membership could not be loaded.' }, { status: 409 })
    }

    if (workspace?.organization_type) {
      return NextResponse.json(responseForWorkspace(workspace))
    }

    if (workspace) {
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Ask a workspace owner or admin to complete organization setup.' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('organizations')
        .update({
          organization_type: selection.organizationType,
          organization_roles: selection.organizationRoles,
          onboarding_status: 'completed',
        })
        .eq('id', workspace.id)
        .select('id,name,slug,plan,organization_type,organization_roles,onboarding_status')
        .single()

      if (error || !data) throw error ?? new Error('Could not update your workspace.')
      return NextResponse.json(responseForWorkspace(data as WorkspaceRecord))
    }

    const metadata = user.user_metadata ?? {}
    const preferredName = typeof metadata.full_name === 'string' ? metadata.full_name.trim().slice(0, 160) : ''
    const emailName = user.email?.split('@')[0]?.trim()
    const name = preferredName || emailName || 'My Workspace'
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'workspace'
    const slug = `${slugBase}-${user.id.slice(0, 8)}`

    const { data: created, error: createError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        owner_id: user.id,
        plan: 'starter',
        organization_type: selection.organizationType,
        organization_roles: selection.organizationRoles,
        onboarding_status: 'completed',
        ai_autonomy_level: 'balanced',
      })
      .select('id,name,slug,plan,organization_type,organization_roles,onboarding_status')
      .single()

    if (createError || !created) throw createError ?? new Error('Could not create your workspace.')

    const { error: membershipError } = await supabase.from('org_members').insert({
      org_id: created.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    })

    if (membershipError) throw membershipError
    return NextResponse.json(responseForWorkspace(created as WorkspaceRecord), { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save organization setup.' }, { status: 500 })
  }
}
