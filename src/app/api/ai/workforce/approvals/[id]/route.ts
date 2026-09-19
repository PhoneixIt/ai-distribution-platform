import { NextRequest } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })

  try {
    const { id } = await context.params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ success: false, error: 'Invalid approval ID.' }, { status: 400 })

    const body = await request.json()
    const action = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : null
    if (!action) return Response.json({ success: false, error: 'Action must be approve or reject.' }, { status: 400 })
    if (typeof body.notes === 'string' && body.notes.length > 2000) return Response.json({ success: false, error: 'Approval notes are too long.' }, { status: 400 })

    const membership = await supabase.from('org_members').select('org_id,role').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
    if (membership.error) throw membership.error
    if (!membership.data?.org_id || !['owner','admin'].includes(String(membership.data.role))) {
      return Response.json({ success: false, error: 'Workspace admin approval is required.' }, { status: 403 })
    }

    const pending = await supabase
      .from('agent_approvals')
      .select('*')
      .eq('id', id)
      .eq('org_id', membership.data.org_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (pending.error) throw pending.error
    if (!pending.data) return Response.json({ success: false, error: 'Pending approval not found.' }, { status: 404 })

    const result = await supabase
      .from('agent_approvals')
      .update({
        status: action,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        notes: typeof body.notes === 'string' ? body.notes.trim() : null
      })
      .eq('id', id)
      .eq('org_id', membership.data.org_id)
      .eq('status', 'pending')
      .select('*')
      .single()

    if (result.error) throw result.error

    if (action === 'approved') {
      const payload = pending.data.payload && typeof pending.data.payload === 'object' ? pending.data.payload : {}
      const queueResult = await supabase.from('agent_action_queue').insert({
        org_id: membership.data.org_id,
        approval_id: id,
        run_id: pending.data.run_id,
        task_id: pending.data.task_id || null,
        action_type: pending.data.action_type,
        payload,
        provider: 'unconfigured',
        status: 'queued',
        idempotency_key: 'approval:' + id,
      }).select('id,status,provider').single()

      if (queueResult.error && queueResult.error.code !== '23505') throw queueResult.error
    }

    if (pending.data.task_id) {
      const taskUpdate = await supabase
        .from('agent_tasks')
        .update({
          approval_status: action,
          status: action === 'rejected' ? 'completed' : 'waiting',
          completed_at: action === 'rejected' ? new Date().toISOString() : null,
          error_message: action === 'rejected' ? 'Human approval rejected.' : null
        })
        .eq('id', pending.data.task_id)
        .eq('org_id', membership.data.org_id)
      if (taskUpdate.error) throw taskUpdate.error
    }

    const { data: remaining } = await supabase
      .from('agent_approvals')
      .select('id')
      .eq('run_id', pending.data.run_id)
      .eq('org_id', membership.data.org_id)
      .eq('status', 'pending')

    if (!remaining?.length) {
      await supabase
        .from('agent_runs')
        .update({ status: action === 'approved' ? 'partial' : 'completed' })
        .eq('id', pending.data.run_id)
        .eq('org_id', membership.data.org_id)
    }

    return new Response(JSON.stringify({
      success: true,
      data: result.data,
      execution: action === 'approved'
        ? { status: 'awaiting_execution', message: 'Approval recorded. The approved action remains pending execution by a connected external action provider.' }
        : { status: 'rejected' }
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval update failed.'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
