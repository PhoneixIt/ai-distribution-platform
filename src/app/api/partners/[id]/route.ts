import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

async function getMembershipRole(
  supabase: Awaited<ReturnType<typeof getAuthenticatedServerClient>>['supabase'],
  userId: string,
) {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id,role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  void request
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const { id } = await params
    const { data, error } = await supabase.from('partners').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ success: false, error: 'Partner not found.' }, { status: 404 })

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
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const membership = await getMembershipRole(supabase, user.id)
    if (!membership || !['owner', 'admin'].includes(String(membership.role))) {
      return Response.json({ success: false, error: 'Workspace admin access is required to edit shared partner data.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const allowed = [
      'name', 'website', 'logo_url', 'description', 'partner_types', 'country', 'regions',
      'industries', 'company_size', 'employee_range', 'specializations', 'certifications',
      'technologies', 'services', 'customer_segments', 'deployment_capabilities',
      'sales_regions', 'is_active',
    ]
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
    if (!Object.keys(updates).length) {
      return Response.json({ success: false, error: 'No supported fields to update.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (!data) return Response.json({ success: false, error: 'Partner not found or not editable.' }, { status: 404 })
    return Response.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Partner update failed.'
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
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const membership = await getMembershipRole(supabase, user.id)
    if (!membership || !['owner', 'admin'].includes(String(membership.role))) {
      return Response.json({ success: false, error: 'Workspace admin access is required to delete shared partner data.' }, { status: 403 })
    }

    const { id } = await params
    const { error } = await supabase.from('partners').delete().eq('id', id)
    if (error) throw error
    return Response.json({ success: true, message: 'Partner deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
