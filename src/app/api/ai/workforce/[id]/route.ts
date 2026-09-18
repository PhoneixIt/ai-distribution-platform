import { getOperatingRun } from '@/lib/agents/operating-layer'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const membership = await supabase.from('org_members').select('org_id').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
    if (membership.error) throw membership.error
    if (!membership.data?.org_id) throw new Error('No active workspace is available for this account.')

    const run = await getOperatingRun(supabase, id)
    if (!run || run.run.org_id !== membership.data.org_id) {
      return Response.json({ success: false, error: 'Workforce run not found.' }, { status: 404 })
    }

    return Response.json({ success: true, data: run })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown workforce error.'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
