import { NextRequest } from 'next/server'
import { createWorkforceRun, startOpenAIAgentSession } from '@/lib/agents/workforce'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()

  if (authError || !user) {
    return Response.json({ success: false, error: authError?.message || 'Authentication required.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const objective = typeof body.objective === 'string' ? body.objective : ''
    const model = typeof body.model === 'string' ? body.model : undefined

    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (membershipError) throw membershipError
    if (!membership?.org_id) throw new Error('No active workspace is available for this account.')

    const { run, rootTaskId } = await createWorkforceRun(
      supabase,
      membership.org_id,
      user.id,
      {
        objective,
        model,
        metadata: {
          workflow: 'partner_recruitment_v1',
          source: 'api',
        },
      },
      {
        assignedAgent: 'ceo',
        taskType: 'orchestrate_partner_recruitment',
        title: 'Coordinate partner recruitment objective',
        instructions:
          'Coordinate research, verification, channel-fit analysis, contact research, and approved outreach. Use evidence, preserve uncertainty, and return structured findings suitable for Supabase persistence.',
        priority: 100,
        requiresApproval: true,
      }
    )

    const session = await startOpenAIAgentSession(
      supabase,
      run.id,
      [
        'You are the CEO agent for an AI-powered B2B channel distribution platform.',
        'Operate as an orchestrator. Break the objective into focused specialist work.',
        'Specialist areas: partner discovery, company verification, channel-fit analysis, contact research, and outreach preparation.',
        'Use only evidence that can be traced to a source. Clearly mark uncertainty.',
        'Do not send external outreach without an explicit approval gate.',
        `Objective: ${objective.trim()}`,
      ].join('\n\n'),
      run.model || undefined
    )

    return Response.json({
      success: true,
      data: {
        runId: run.id,
        rootTaskId,
        sessionId: session.sessionId,
        status: 'running',
        provider: run.provider,
        model: run.model,
      },
    }, { status: 202 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown workforce error.'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
