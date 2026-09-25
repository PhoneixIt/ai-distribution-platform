import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const objective = clean(body?.objective)

    if (!objective) return NextResponse.json({ error: 'Mission objective is required.' }, { status: 400 })
    if (objective.length > 4000) return NextResponse.json({ error: 'Mission objective is too long.' }, { status: 400 })

    const membership = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (membership.error) throw membership.error
    if (!membership.data?.org_id) return NextResponse.json({ error: 'No active workspace is available for this account.' }, { status: 403 })

    const { data, error } = await supabase
      .from('missions')
      .insert({
        org_id: membership.data.org_id,
        created_by: user.id,
        objective,
        vendor_name: clean(body?.vendorName) || null,
        product_name: clean(body?.productName) || null,
        market: clean(body?.market) || null,
        country: clean(body?.country) || null,
        partner_types: Array.isArray(body?.partnerTypes)
          ? body.partnerTypes.map(clean).filter(Boolean).slice(0, 10)
          : [],
        technology_focus: clean(body?.technologyFocus) || null,
        customer_segment: clean(body?.customerSegment) || null,
        status: 'draft',
        current_stage: 'defined',
      })
      .select('id,objective,status,current_stage,created_at')
      .single()

    if (error || !data) throw error || new Error('Could not create mission.')

    return NextResponse.json({ mission: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create mission.' },
      { status: 500 },
    )
  }
}

export async function GET() {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('missions')
    .select('id,objective,vendor_name,product_name,market,country,partner_types,technology_focus,customer_segment,status,current_stage,candidate_count,discovery_run_id,ai_run_id,result_summary,error_message,created_at,updated_at,completed_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ missions: data || [] })
}
