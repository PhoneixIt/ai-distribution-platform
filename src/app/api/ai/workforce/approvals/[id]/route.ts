import { NextRequest } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return new Response(JSON.stringify({ success: false, error: authError?.message || 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  try {
    const { id } = await context.params
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid approval ID.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Request body must be valid JSON.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null
    if (!action) {
      return new Response(JSON.stringify({ success: false, error: 'Action must be approve or reject.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    const notes = typeof body.notes === 'string' ? body.notes.trim() : null
    if (notes && notes.length > 2000) {
      return new Response(JSON.stringify({ success: false, error: 'Approval notes are too long.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    const result = await supabase.rpc('decide_agent_approval', {
      p_approval_id: id,
      p_action: action,
      p_notes: notes,
    })

    if (result.error) {
      const status = /Authentication required/i.test(result.error.message)
        ? 401
        : /admin approval|not found/i.test(result.error.message)
          ? 403
          : 500

      return new Response(JSON.stringify({ success: false, error: result.error.message }), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    const data = result.data as {
      approval?: unknown
      queue?: { id?: string; status?: string; provider?: string } | null
      remaining_pending?: number
      execution_status?: string
    }

    return new Response(JSON.stringify({
      success: true,
      data: data.approval || null,
      execution: data.execution_status === 'awaiting_execution'
        ? {
            status: 'awaiting_execution',
            queue_id: data.queue?.id || null,
            provider: data.queue?.provider || 'unconfigured',
            message: 'Approval recorded atomically and queued. The approved action remains pending execution by a connected external action provider.',
          }
        : { status: 'rejected' },
      remaining_pending: data.remaining_pending ?? 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval update failed.'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
}
