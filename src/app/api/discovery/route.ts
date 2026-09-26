import { NextResponse } from 'next/server'
import type { PartnerDiscoveryRequest } from '@/agents/partner-discovery/types'
import { parseDiscoveryIntent } from '@/lib/missions/discovery-intent'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

const MAX_CANDIDATES = 200

/**
 * Request normalization keeps the intent-first behaviour from the recovery branch:
 * when the caller does not supply structured filters, they are inferred from the
 * mission objective. Explicit filters always win over inferred values.
 */
function normalizeRequest(input: Partial<PartnerDiscoveryRequest>): PartnerDiscoveryRequest {
  const objective = String(input.objective || '').trim()
  const inferred = parseDiscoveryIntent(objective)
  const partnerTypes = Array.isArray(input.partnerTypes)
    ? input.partnerTypes.map((value) => String(value).trim()).filter(Boolean)
    : []

  return {
    objective: objective || undefined,
    country: String(input.country || '').trim() || inferred.country || '',
    market: input.market ? String(input.market).trim() : undefined,
    partnerTypes: partnerTypes.length ? partnerTypes : inferred.partnerTypes,
    technologyFocus: String(input.technologyFocus || '').trim() || inferred.technologyFocus || '',
    industry: input.industry ? String(input.industry).trim() : undefined,
    customerSegment: input.customerSegment ? String(input.customerSegment).trim() : inferred.customerSegment,
    serviceOrCapability: input.serviceOrCapability ? String(input.serviceOrCapability).trim() : undefined,
    vendorPartnership: input.vendorPartnership ? String(input.vendorPartnership).trim() : undefined,
    certification: input.certification ? String(input.certification).trim() : undefined,
    companySize: input.companySize ? String(input.companySize).trim() : undefined,
    desiredCandidateCount: Math.min(
      MAX_CANDIDATES,
      Math.max(1, Number(input.desiredCandidateCount) || inferred.desiredCandidateCount || 10)
    ),
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

  let input: Partial<PartnerDiscoveryRequest>
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const missionId = typeof (input as Record<string, unknown>).missionId === 'string' ? String((input as Record<string, unknown>).missionId).trim() : ''
  if (!missionId) {
    return NextResponse.json({ error: 'missionId is required to enqueue a discovery workflow.' }, { status: 400 })
  }

  const discoveryRequest = normalizeRequest(input)
  if (!discoveryRequest.country || !discoveryRequest.technologyFocus || !discoveryRequest.partnerTypes.length) {
    return NextResponse.json(
      {
        error: 'Discovery needs a target country, technology focus, and at least one partner type. Add them to the objective or enter them in the filters.',
      },
      { status: 400 }
    )
  }

  const missionResult = await supabase
    .from('missions')
    .select('id,org_id,status,current_stage')
    .eq('id', missionId)
    .maybeSingle()
  if (missionResult.error) return NextResponse.json({ error: missionResult.error.message }, { status: 500 })
  if (!missionResult.data) return NextResponse.json({ error: 'Mission was not found in this workspace.' }, { status: 404 })
  const mission = { id: missionResult.data.id, org_id: missionResult.data.org_id }

  const { data: recentRun } = await supabase
    .from('discovery_runs')
    .select('id,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentRun && Date.now() - new Date(recentRun.created_at).getTime() < 60_000) {
    return NextResponse.json({ error: 'Please wait about one minute before starting another discovery run.' }, { status: 429 })
  }

  const missionUpdate = await supabase
    .from('missions')
    .update({ status: 'running', current_stage: 'discovering', error_message: null })
    .eq('id', mission.id)
  if (missionUpdate.error) return NextResponse.json({ error: missionUpdate.error.message }, { status: 500 })

  // The run is persisted BEFORE the event is emitted, with the production-compatible
  // status `running`. The durable workflow owns all subsequent state transitions.
  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .insert({ user_id: user.id, request: discoveryRequest, provider: 'multi-search', status: 'running' })
    .select('id')
    .single()

  if (runError || !run) {
    const failureUpdate = await supabase.from('missions').update({ status: 'failed', current_stage: 'failed', error_message: runError?.message || 'Could not create discovery run.' }).eq('id', mission.id)
    if (failureUpdate.error) console.error('Failed to mark mission after discovery run creation error.', { missionId: mission.id, error: failureUpdate.error })
    return NextResponse.json({ error: runError?.message || 'Could not create discovery run.' }, { status: 500 })
  }

  // Link the mission to the run immediately, before the workflow starts. Without this
  // the mission only learns its run id on success, so a running, stalled or failed run
  // is untraceable from the mission and per-run candidate counts cannot be resolved.
  // The column already exists in production; no schema change is involved.
  const linkUpdate = await supabase
    .from('missions')
    .update({ discovery_run_id: run.id })
    .eq('id', mission.id)

  if (linkUpdate.error) {
    // Keep mission and run coherent: fail the run rather than emit an event for a
    // mission that cannot be linked back to it.
    const failUpdate = await supabase
      .from('discovery_runs')
      .update({ status: 'failed', error_message: 'Could not link discovery run to mission.', completed_at: new Date().toISOString() })
      .eq('id', run.id)
    if (failUpdate.error) console.error('Failed to mark discovery run as failed after mission link error.', { runId: run.id, error: failUpdate.error })
    const missionFailUpdate = await supabase
      .from('missions')
      .update({ status: 'failed', current_stage: 'failed', error_message: 'Could not link discovery run to mission.' })
      .eq('id', mission.id)
    if (missionFailUpdate.error) console.error('Failed to mark mission as failed after mission link error.', { missionId: mission.id, error: missionFailUpdate.error })
    return NextResponse.json({ error: 'Could not link discovery run to mission.' }, { status: 500 })
  }

  try {
    await inngest.send({
      name: 'portai/mission.workflow.started',
      data: { missionId: mission.id, discoveryRunId: run.id, userId: user.id },
    })
  } catch {
    const failUpdate = await supabase.from('discovery_runs').update({ status: 'failed', error_message: 'Failed to queue Inngest event.', completed_at: new Date().toISOString() }).eq('id', run.id)
    if (failUpdate.error) console.error('Failed to mark discovery run as failed after Inngest error.', { runId: run.id, error: failUpdate.error })
    const missionFailUpdate = await supabase.from('missions').update({ status: 'failed', current_stage: 'failed', error_message: 'Failed to queue Inngest event.' }).eq('id', mission.id)
    if (missionFailUpdate.error) console.error('Failed to mark mission as failed after Inngest error.', { missionId: mission.id, error: missionFailUpdate.error })
    return NextResponse.json({ error: 'Failed to queue discovery workflow.' }, { status: 500 })
  }

  // Enqueue accepted. This is NOT completion: the workflow has not run yet.
  return NextResponse.json({ missionId: mission.id, runId: run.id, status: 'running' })
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
