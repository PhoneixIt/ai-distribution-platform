import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import {
  createBusinessRecord,
  deleteBusinessRecord,
  isBusinessEntity,
  listBusinessRecords,
  updateBusinessRecord,
} from '@/lib/supabase/services/business'
import type { NextRequest } from 'next/server'

type RouteContext = {
  params: Promise<{ entity: string }>
}

async function getWorkspaceId(
  supabase: Awaited<ReturnType<typeof getAuthenticatedServerClient>>['supabase'],
  userId: string,
) {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data?.org_id) throw new Error('No active workspace found')
  return data.org_id as string
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) {
      return Response.json(
        { success: false, error: authError?.message || 'Authentication required.' },
        { status: 401 },
      )
    }

    const { entity } = await context.params
    if (!isBusinessEntity(entity)) {
      return Response.json({ success: false, error: 'Unsupported business entity.' }, { status: 404 })
    }

    const id = new URL(request.url).searchParams.get('id') || undefined
    const data = await listBusinessRecords(supabase, entity, id)
    return Response.json({ success: true, data, count: data.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) {
      return Response.json(
        { success: false, error: authError?.message || 'Authentication required.' },
        { status: 401 },
      )
    }

    const { entity } = await context.params
    if (!isBusinessEntity(entity)) {
      return Response.json({ success: false, error: 'Unsupported business entity.' }, { status: 404 })
    }

    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ success: false, error: 'A JSON object is required.' }, { status: 400 })
    }

    const orgId = await getWorkspaceId(supabase, user.id)
    const record = await createBusinessRecord(supabase, entity, {
      ...(body as Record<string, unknown>),
      org_id: orgId,
    })

    return Response.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) {
      return Response.json(
        { success: false, error: authError?.message || 'Authentication required.' },
        { status: 401 },
      )
    }

    const { entity } = await context.params
    if (!isBusinessEntity(entity)) {
      return Response.json({ success: false, error: 'Unsupported business entity.' }, { status: 404 })
    }

    const id = new URL(request.url).searchParams.get('id')
    if (!id) return Response.json({ success: false, error: 'id is required.' }, { status: 400 })

    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ success: false, error: 'A JSON object is required.' }, { status: 400 })
    }

    const record = await updateBusinessRecord(supabase, entity, id, body as Record<string, unknown>)
    return Response.json({ success: true, data: record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) {
      return Response.json(
        { success: false, error: authError?.message || 'Authentication required.' },
        { status: 401 },
      )
    }

    const { entity } = await context.params
    if (!isBusinessEntity(entity)) {
      return Response.json({ success: false, error: 'Unsupported business entity.' }, { status: 404 })
    }

    const id = new URL(request.url).searchParams.get('id')
    if (!id) return Response.json({ success: false, error: 'id is required.' }, { status: 400 })

    await deleteBusinessRecord(supabase, entity, id)
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
