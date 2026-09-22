import { NextResponse } from 'next/server'
import { runPartnerDiscovery } from '@/agents/partner-discovery/runner'
import type { PartnerDiscoveryRequest } from '@/agents/partner-discovery/types'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { start } from 'workflow/api'
import { missionDiscoveryWorkflow } from '@/workflows/mission-discovery'

export const maxDuration = 300

function normalizeRequest(input: Partial<PartnerDiscoveryRequest>): PartnerDiscoveryRequest {
  const partnerTypes = Array.isArray(input.partnerTypes)
    ? input.partnerTypes.map((value) => String(value).trim()).filter(Boolean)
    : []

  return {
    country: String(input.country || '').trim(),
    market: input.market ? String(input.market).trim() : undefined,
    partnerTypes,
    technologyFocus: String(input.technologyFocus || '').trim(),
    industry: input.industry ? String(input.industry).trim() : undefined,
    customerSegment: input.customerSegment ? String(input.customerSegment).trim() : undefined,
    serviceOrCapability: input.serviceOrCapability ? String(input.serviceOrCapability).trim() : undefined,
    vendorPartnership: input.vendorPartnership ? String(input.vendorPartnership).trim() : undefined,
    certification: input.certification ? String(input.certification).trim() : undefined,
    companySize: input.companySize ? String(input.companySize).trim() : undefined,
    desiredCandidateCount: Math.max(1, Number(input.desiredCandidateCount) || 10),
  }
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: authError?.message || 'Authentication is unavailable.' }, { status: 401 })
  }

  if (!process.env.EXA_API_KEY && !process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json({ error: 'No web discovery provider is configured on the server.' }, { status: 503 })
  }

  let input: Partial<PartnerDiscoveryRequest> & { missionId?: string }
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const missionId = typeof input.missionId === 'string' ? input.missionId.trim() : ''
  const discoveryRequest = normalizeRequest(input)

  if (!missionId) return NextResponse.json({ error: 'Mission ID is required.' }, { status: 400 })
  if (!discoveryRequest.country || !discoveryRequest.technologyFocus) {
    return NextResponse.json({ error: 'Country and technology focus are required.' }, { status: 400 })
  }
  if (!discoveryRequest.partnerTypes.length) {
    return NextResponse.json({ error: 'At least one partner type is required.' }, { status: 400 })
  }

  const missionResult = await supabase
    .from('missions')
    .select('id,status,current_stage')
    .eq('id', missionId)
    .maybeSingle()

  if (missionResult.error) return NextResponse.json({ error: missionResult.error.message }, { status: 500 })
  if (!missionResult.data) return NextResponse.json({ error: 'Mission was not found in this workspace.' }, { status: 404 })

  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .insert({
      user_id: user.id,
      request: discoveryRequest,
      provider: 'exa+firecrawl',
      status: 'running',
    })
    .select('id')
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message || 'Could not create discovery run.' }, { status: 500 })
  }

  const missionUpdate = await supabase
    .from('missions')
    .update({
      status: 'running',
      current_stage: 'discovering',
      error_message: null,
      discovery_run_id: run.id,
    })
    .eq('id', missionId)

  if (missionUpdate.error) {
    await supabase.from('discovery_runs').update({
      status: 'failed',
      error_message: missionUpdate.error.message,
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
    return NextResponse.json({ error: missionUpdate.error.message }, { status: 500 })
  }

  const workflowRun = await start(missionDiscoveryWorkflow, [{
    runId: run.id,
    missionId,
    userId: user.id,
    discoveryRequest,
  }])

  return NextResponse.json({
    missionId,
    runId: run.id,
    workflowRunId: workflowRun.runId,
    status: 'running',
    message: 'PortAi has started durable discovery. The mission will continue even if you leave the page or the deployment changes.',
  }, { status: 202 })
}

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedServerClient()
  if (error || !user) return NextResponse.json({ error: error?.message || 'Authentication is unavailable.' }, { status: 401 })

  const { data, error: queryError } = await supabase
    .from('discovery_runs')
    .select('id,request,status,provider,search_queries,discovered_count,researched_count,returned_count,created_at,completed_at,error_message')
    .order('created_at', { ascending: false })
    .limit(20)

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 })
  return NextResponse.json({ runs: data || [] })
}
