import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

async function getMembership(supabase: Awaited<ReturnType<typeof getAuthenticatedServerClient>>['supabase'], userId: string) {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id,user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No active workspace found.')
  return data
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })

    const membership = await getMembership(supabase, user.id)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '100', 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100

    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('org_id', membership.org_id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return Response.json({ success: true, data: data ?? [], count: data?.length ?? 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedServerClient()
    if (authError || !user) return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })

    const body = await request.json()
    if (!body.title) return Response.json({ success: false, error: 'Title is required' }, { status: 400 })
    if (!body.customer_id) return Response.json({ success: false, error: 'Customer is required' }, { status: 400 })
    if (!body.country && !body.region) return Response.json({ success: false, error: 'Country or region is required' }, { status: 400 })

    const membership = await getMembership(supabase, user.id)
    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .insert({
        org_id: membership.org_id,
        customer_id: body.customer_id,
        created_by: user.id,
        title: String(body.title).trim(),
        description: body.description ? String(body.description).trim() : null,
        estimated_value: body.opportunity_value == null || body.opportunity_value === '' ? null : Number(body.opportunity_value),
        currency: body.currency || 'USD',
        requirements: Array.isArray(body.required_capabilities) ? body.required_capabilities : [],
        technology_categories: Array.isArray(body.technologies) ? body.technologies : [],
        preferred_region: body.region || body.country || null,
        status: body.status || 'open',
        stage: body.stage === 'lead' ? 'new' : body.stage || 'new',
      })
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ success: true, data: opportunity }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
