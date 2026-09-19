import { NextRequest } from 'next/server'
import { runOperatingLayer } from '@/lib/agents/operating-layer'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const objective = typeof body?.objective === 'string' ? body.objective.trim() : ''
    if (!objective) return Response.json({ success: false, error: 'An AI operating objective is required.' }, { status: 400 })
    if (objective.length > 4000) return Response.json({ success: false, error: 'Objective is too long. Keep it under 4,000 characters.' }, { status: 400 })

    const membership = await supabase.from('org_members').select('org_id').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
    if (membership.error) throw membership.error
    if (!membership.data?.org_id) throw new Error('No active workspace is available for this account.')

    const recent = await supabase
      .from('agent_runs')
      .select('id,status,created_at')
      .eq('org_id', membership.data.org_id)
      .eq('initiated_by', user.id)
      .gte('created_at', new Date(Date.now() - 5 * 60_000).toISOString())
      .in('status', ['running', 'waiting_approval', 'partial'])
      .limit(3)

    if (recent.error) throw recent.error
    if ((recent.data?.length ?? 0) >= 2) {
      return Response.json({ success: false, error: 'Please finish or review your active AI workforce runs before starting another.' }, { status: 429 })
    }

    const result = await runOperatingLayer(supabase, membership.data.org_id, user.id, objective)
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI operating layer failed.'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
}
