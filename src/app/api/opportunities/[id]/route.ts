import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

async function getOrgId(supabase: Awaited<ReturnType<typeof getAuthenticatedServerClient>>['supabase'], userId: string) {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No active workspace found.')
  return data.org_id
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  void request
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    const orgId = await getOrgId(supabase, user.id)
    const { id } = await params
    const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).eq('org_id', orgId).maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ success: false, error: 'Opportunity not found.' }, { status: 404 })
    return Response.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    const orgId = await getOrgId(supabase, user.id)
    const { id } = await params
    const body = await request.json()
    const allowed = ['title', 'description', 'status', 'stage', 'estimated_value', 'probability', 'preferred_region', 'requirements', 'technology_categories', 'notes', 'lost_reason']
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
    if (!Object.keys(updates).length) return Response.json({ success: false, error: 'No supported fields to update.' }, { status: 400 })

    const { data, error } = await supabase.from('opportunities').update(updates).eq('id', id).eq('org_id', orgId).select('*').single()
    if (error) throw error
    return Response.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  void request
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    const orgId = await getOrgId(supabase, user.id)
    const { id } = await params
    const { error } = await supabase.from('opportunities').delete().eq('id', id).eq('org_id', orgId)
    if (error) throw error
    return Response.json({ success: true, message: 'Opportunity deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
