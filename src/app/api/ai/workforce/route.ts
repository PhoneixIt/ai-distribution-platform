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
    const objective = typeof body.objective === 'string' ? body.objective.trim() : ''
    const membership = await supabase.from('org_members').select('org_id').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
    if (membership.error) throw membership.error
    if (!membership.data?.org_id) throw new Error('No active workspace is available for this account.')

    const result = await runOperatingLayer(supabase, membership.data.org_id, user.id, objective)
    return Response.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI operating layer failed.'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
