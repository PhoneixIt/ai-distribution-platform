import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { ensureWorkspace } from '@/lib/supabase/workspace'
import {
  createEcosystemRelationship,
  listEcosystemRelationships,
} from '@/lib/supabase/services'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const { orgId } = await ensureWorkspace()
    const { searchParams } = new URL(request.url)
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '100', 10)

    const relationships = await listEcosystemRelationships(supabase, orgId, {
      fromEntityType: searchParams.get('from_entity_type') || undefined,
      fromEntityId: searchParams.get('from_entity_id') || undefined,
      toEntityType: searchParams.get('to_entity_type') || undefined,
      toEntityId: searchParams.get('to_entity_id') || undefined,
      relationshipType: searchParams.get('relationship_type') || undefined,
      status: searchParams.get('status') || undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 100,
    })

    return Response.json({ success: true, data: relationships, count: relationships.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user || user.is_anonymous) {
      return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
    }

    const { orgId } = await ensureWorkspace()
    const body = await request.json()

    if (!body.from_entity_type || !body.from_entity_id || !body.to_entity_type || !body.to_entity_id || !body.relationship_type) {
      return Response.json({
        success: false,
        error: 'from_entity_type, from_entity_id, to_entity_type, to_entity_id, and relationship_type are required.',
      }, { status: 400 })
    }

    const relationship = await createEcosystemRelationship(supabase, orgId, user.id, body)
    return Response.json({ success: true, data: relationship }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('required') || message.includes('Invalid') || message.includes('cannot') ? 400 : 500
    return Response.json({ success: false, error: message }, { status })
  }
}
