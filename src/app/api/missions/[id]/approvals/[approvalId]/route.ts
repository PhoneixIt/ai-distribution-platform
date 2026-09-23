import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type Context = { params: Promise<{ id: string; approvalId: string }> }

export async function POST(request: Request, context: Context) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  const { id, approvalId } = await context.params
  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : ''
  if (!action) return NextResponse.json({ error: 'Action must be approve or reject.' }, { status: 400 })

  const check = await supabase.from('mission_approvals').select('id,mission_id,draft_id,status').eq('id', approvalId).eq('mission_id', id).maybeSingle()
  if (check.error) return NextResponse.json({ error: check.error.message }, { status: 500 })
  if (!check.data) return NextResponse.json({ error: 'Approval not found for this mission.' }, { status: 404 })
  if (check.data.status !== 'pending') return NextResponse.json({ error: 'This approval is no longer pending.' }, { status: 409 })

  const result = await supabase.rpc('decide_mission_approval', {
    p_approval_id: approvalId,
    p_action: action,
    p_notes: typeof body.notes === 'string' ? body.notes : null,
  })
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 403 })

  const updated = await supabase.from('mission_approvals').select('id,mission_id,draft_id,status').eq('id', approvalId).eq('mission_id', id).maybeSingle()
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 })

  return NextResponse.json({ success: true, approval: updated.data })
}