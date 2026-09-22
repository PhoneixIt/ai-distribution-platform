import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { ensureWorkspace } from '@/lib/supabase/workspace'
import {
  deleteEcosystemRelationship,
  getEcosystemRelationship,
  updateEcosystemRelationship,
} from '@/lib/supabase/services'
import type { NextRequest } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const { orgId } = await ensureWorkspace()
    const { id } = await context.params
    const relationship = await getEcosystemRelationship(supabase, orgId, id)

    return Response.json({ success: true, data: relationship })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: message === 'Relationship not found.' ? 404 : 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const { orgId } = await ensureWorkspace()
    const { id } = await context.params
    const body = await request.json()
    const relationship = await updateEcosystemRelationship(supabase, orgId, id, body)

    return Response.json({ success: true, data: relationship })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Relationship not found.' ? 404 : (message.includes('Invalid') || message.includes('cannot') ? 400 : 500)
    return Response.json({ success: false, error: message }, { status })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const { orgId } = await ensureWorkspace()
    const { id } = await context.params
    await deleteEcosystemRelationship(supabase, orgId, id)

    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
