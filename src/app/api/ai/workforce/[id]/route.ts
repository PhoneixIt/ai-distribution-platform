import { createWorkforceRun, getWorkforceRun } from '@/lib/agents/workforce'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()

  if (authError || !user) {
    return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const run = await getWorkforceRun(supabase, id)

    if (!run) {
      return Response.json({ success: false, error: 'Workforce run not found.' }, { status: 404 })
    }

    return Response.json({ success: true, data: run })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown workforce error.'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
