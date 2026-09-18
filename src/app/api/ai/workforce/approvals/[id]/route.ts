import { NextRequest } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })

  try {
    const { id } = await context.params
    const body = await request.json()
    const action = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : null
    if (!action) return Response.json({ success: false, error: 'Action must be approve or reject.' }, { status: 400 })

    const membership = await supabase.from('org_members').select('org_id,role').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
    if (membership.error) throw membership.error
    if (!membership.data?.org_id || !['owner','admin'].includes(String(membership.data.role))) {
      return Response.json({ success: false, error: 'Workspace admin approval is required.' }, { status: 403 })
    }

    const result = await supabase.from('agent_approvals').update({
      status: action,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      notes: typeof body.notes === 'string' ? body.notes.trim() : null
    }).eq('id', id).eq('org_id', membership.data.org_id).eq('status', 'pending').select('*').single()

    if (result.error) throw result.error
    return Response.json({ success: true, data: result.data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval update failed.'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
