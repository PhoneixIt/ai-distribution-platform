import type { SupabaseClient } from '@supabase/supabase-js'

export type WorkforceObjective = {
  objective: string
  model?: string
  metadata?: Record<string, unknown>
}

export type WorkforceRun = {
  id: string
  orgId: string
  userId: string
  objective: string
  status: string
  provider: string
  model: string | null
  sessionId: string | null
}

export type WorkforceTaskDefinition = {
  assignedAgent: string
  taskType: string
  title: string
  instructions: string
  priority?: number
  input?: Record<string, unknown>
  requiresApproval?: boolean
  dependsOnTaskIds?: string[]
}

const DEFAULT_AGENT_MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-6-astra'

function assertObjective(objective: string) {
  const value = objective.trim()
  if (!value) throw new Error('A workforce objective is required.')
  if (value.length > 4000) throw new Error('Workforce objective must be 4000 characters or fewer.')
  return value
}

export async function createWorkforceRun(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  input: WorkforceObjective,
  rootTask: WorkforceTaskDefinition
): Promise<{ run: WorkforceRun; rootTaskId: string }> {
  const objective = assertObjective(input.objective)
  const model = input.model?.trim() || DEFAULT_AGENT_MODEL

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      org_id: orgId,
      initiated_by: userId,
      objective,
      status: 'queued',
      provider: 'openai_agents',
      model,
      metadata: input.metadata || {},
    })
    .select('id, org_id, initiated_by, objective, status, provider, model, session_id')
    .single()

  if (runError || !run) throw runError || new Error('Could not create workforce run.')

  const { data: task, error: taskError } = await supabase
    .from('agent_tasks')
    .insert({
      run_id: run.id,
      org_id: orgId,
      assigned_agent: rootTask.assignedAgent,
      task_type: rootTask.taskType,
      title: rootTask.title,
      instructions: rootTask.instructions,
      status: 'queued',
      priority: rootTask.priority ?? 100,
      input: rootTask.input || {},
      requires_approval: rootTask.requiresApproval ?? false,
      approval_status: rootTask.requiresApproval ? 'pending' : 'not_required',
      depends_on_task_ids: rootTask.dependsOnTaskIds || [],
    })
    .select('id')
    .single()

  if (taskError || !task) {
    await supabase.from('agent_runs').delete().eq('id', run.id)
    throw taskError || new Error('Could not create workforce root task.')
  }

  const { error: rootLinkError } = await supabase
    .from('agent_runs')
    .update({ root_task_id: task.id, status: 'running', started_at: new Date().toISOString() })
    .eq('id', run.id)

  if (rootLinkError) throw rootLinkError

  const { error: taskStartError } = await supabase
    .from('agent_tasks')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', task.id)

  if (taskStartError) throw taskStartError

  return {
    run: {
      id: run.id,
      orgId: run.org_id,
      userId: run.initiated_by,
      objective: run.objective,
      status: 'running',
      provider: run.provider,
      model: run.model,
      sessionId: null,
    },
    rootTaskId: task.id,
  }
}

export async function startOpenAIAgentSession(
  supabase: SupabaseClient,
  runId: string,
  objective: string,
  model = DEFAULT_AGENT_MODEL
) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.')

  const response = await fetch('https://api.openai.com/v1/agents/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent: {
        model,
        multi_agent: {
          enabled: true,
          max_concurrent_subagents: 3,
        },
      },
      environment: {
        type: 'none',
      },
      input: objective,
    }),
  })

  const rawBody = await response.text()
  let payload: Record<string, unknown> = {}
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    payload = { raw: rawBody }
  }

  if (!response.ok) {
    const message = typeof payload.error === 'object' && payload.error && 'message' in payload.error
      ? String(payload.error.message)
      : `OpenAI Agents API returned HTTP ${response.status}.`

    await supabase
      .from('agent_runs')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', runId)

    throw new Error(message)
  }

  const sessionId = typeof payload.id === 'string' ? payload.id : null

  await supabase
    .from('agent_runs')
    .update({ session_id: sessionId })
    .eq('id', runId)

  return { sessionId, payload }
}

export async function getWorkforceRun(supabase: SupabaseClient, runId: string) {
  const [{ data: run, error: runError }, { data: tasks, error: taskError }] = await Promise.all([
    supabase.from('agent_runs').select('*').eq('id', runId).maybeSingle(),
    supabase.from('agent_tasks').select('*').eq('run_id', runId).order('created_at', { ascending: true }),
  ])

  if (runError) throw runError
  if (taskError) throw taskError
  if (!run) return null

  return { run, tasks: tasks || [] }
}
