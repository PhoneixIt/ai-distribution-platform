import { NextResponse } from 'next/server'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

  const { id } = await params
  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .select('id,discovery_run_id')
    .eq('id', id)
    .maybeSingle()

  if (missionError) return NextResponse.json({ error: missionError.message }, { status: 500 })
  if (!mission) return NextResponse.json({ error: 'Mission not found.' }, { status: 404 })
  if (!mission.discovery_run_id) return NextResponse.json({ candidates: [] })

  const { data, error } = await supabase
    .from('discovery_candidates')
    .select('id,company_name,website,country,description,partner_types,technologies,customer_segments,industries,services,vendor_partnerships,certifications,fit_score,qualification_status,qualification_score,qualification_reasons,concerns,research_status,research_confidence,evidence,rank')
    .eq('discovery_run_id', mission.discovery_run_id)
    .order('rank', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ candidates: data || [] })
}
