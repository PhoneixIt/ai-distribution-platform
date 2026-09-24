'use client'

import { FormEvent, useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { ensureWorkspace } from '@/lib/supabase/workspace'

const agents = [
  ['Distributor CEO / Orchestrator','ceo_orchestrator','Delegates work, combines results and controls approval boundaries.'],
  ['Vendor Manager Agent','vendor_manager','Researches vendors/products and identifies onboarding opportunities.'],
  ['Partner Manager Agent','partner_manager','Finds dormant partners, activation opportunities and partner-health signals.'],
  ['Sales Agent','sales_agent','Analyzes opportunities, next actions and follow-up priorities.'],
  ['Market Intelligence Agent','market_intelligence','Researches competitors, products, markets and external signals.'],
  ['Commercial Agent','commercial_agent','Analyzes pricing, margin and discount signals without committing terms.'],
  ['Operations Agent','operations_agent','Finds overdue work, missing information and workflow bottlenecks.'],
]

const prompts = [
  'Which partners should I reactivate this week?',
  'Which vendors should we approach?',
  'Where is revenue at risk?',
  'Which opportunities need immediate attention?',
  'Build a partner activation plan.',
]

type Approval = {
  id: string
  action_type: string
  summary: string
  status: string
  requested_at: string
}

type RunHistoryItem = {
  id: string
  objective: string
  status: string
  provider: string
  model: string | null
  confidence: number | null
  created_at: string
  completed_at: string | null
  summary: Run['final'] | null
}

type Run = {
  runId: string
  status: string
  provider: string
  model: string | null
  plan: { selected_agents: { agent_key: string; objective: string; priority: number }[]; rationale: string }
  results: { agentKey: string; output?: { summary: string; confidence: number }; error?: string }[]
  final: {
    summary: string
    confidence: number
    facts: { statement: string; source_type: string; source_ref: string }[]
    inferences: { statement: string; confidence: number }[]
    recommendations: { title: string; rationale: string; priority: number; entity_type: string | null; entity_id: string | null; next_action: string; requires_approval: boolean }[]
    actions: { title: string; description: string }[]
    approvals: { action_type: string; summary: string }[]
    gaps: string[]
  }
}

export default function WorkforcePage() {
  const [objective, setObjective] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [run, setRun] = useState<Run | null>(null)
  const [stats, setStats] = useState({ runs: 0, tasks: 0, approvals: 0 })
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([])
  const [approvalError, setApprovalError] = useState('')
  const [approvalNotice, setApprovalNotice] = useState('')
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([])
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<RunHistoryItem | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { supabase, orgId } = await ensureWorkspace()
        const [{ count: runs }, { count: tasks }, { count: approvals, data: approvalRows }, { data: recentRuns }] = await Promise.all([
          supabase.from('agent_runs').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
          supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
          supabase.from('agent_approvals').select('id,action_type,summary,status,requested_at', { count: 'exact' }).eq('org_id', orgId).eq('status', 'pending').order('requested_at', { ascending: false }).limit(20),
          supabase.from('agent_runs').select('id,objective,status,provider,model,confidence,created_at,completed_at,summary').eq('org_id', orgId).order('created_at', { ascending: false }).limit(12),
        ])
        if (active) {
          setStats({ runs: runs || 0, tasks: tasks || 0, approvals: approvals || 0 })
          setPendingApprovals((approvalRows || []) as Approval[])
          setRunHistory((recentRuns || []) as RunHistoryItem[])
        }
      } catch {
        // The protected shell still renders if the metrics query is unavailable.
      }
    }
    void load()
    return () => { active = false }
  }, [])

  async function refreshWorkspaceMetrics() {
    const { supabase, orgId } = await ensureWorkspace()
    const [{ count: runs }, { count: tasks }, { count: approvals, data: approvalRows }, { data: recentRuns }] = await Promise.all([
      supabase.from('agent_runs').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('agent_approvals').select('id,action_type,summary,status,requested_at', { count: 'exact' }).eq('org_id', orgId).eq('status', 'pending').order('requested_at', { ascending: false }).limit(20),
      supabase.from('agent_runs').select('id,objective,status,provider,model,confidence,created_at,completed_at,summary').eq('org_id', orgId).order('created_at', { ascending: false }).limit(12),
    ])
    setStats({ runs: runs || 0, tasks: tasks || 0, approvals: approvals || 0 })
    setPendingApprovals((approvalRows || []) as Approval[])
    setRunHistory((recentRuns || []) as RunHistoryItem[])
  }

  async function handleApproval(id: string, action: 'approve' | 'reject') {
    setApprovalError('')
    setApprovalNotice('')
    try {
      const response = await fetch(`/api/ai/workforce/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Approval update failed.')
      if (payload.execution?.message) setApprovalNotice(payload.execution.message)
      await refreshWorkspaceMetrics()
    } catch (cause) {
      setApprovalError(cause instanceof Error ? cause.message : 'Approval update failed.')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const cleanObjective = objective.trim()
    if (!cleanObjective || cleanObjective.length > 1000) return
    setRunning(true)
    setError('')
    setRun(null)
    try {
      const response = await fetch('/api/ai/workforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: cleanObjective }),
        signal: AbortSignal.timeout(120000),
      })
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) throw new Error(`AI workforce returned an unexpected response (${response.status}).`)
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'AI operating run failed.')
      setRun(payload.data)
      await refreshWorkspaceMetrics()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI operating run failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <AppShell title="AI operating workspace" subtitle="Give the AI workforce a real business objective. It researches the workspace, coordinates specialist work and returns recommendations your team can review.">
      <section className="rounded-2xl border border-blue-200 bg-blue-950/15 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">AI workforce</p>
        <h2 className="mt-2 text-xl font-semibold">What do you want the AI workforce to work on?</h2>
        <form onSubmit={submit} className="mt-5">
          <textarea maxLength={1000} value={objective} onChange={(event) => setObjective(event.target.value)} rows={4} placeholder="Example: Which partners should I reactivate this week?" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500" />
          <div className="mt-2 flex justify-end text-[11px] text-slate-500">{objective.length}/1000</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {prompts.map((prompt) => <button key={prompt} type="button" onClick={() => setObjective(prompt)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-blue-500 hover:text-slate-900">{prompt}</button>)}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button disabled={running || !objective.trim()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">{running ? 'Working…' : 'Run workforce'}</button>
            <span className="text-xs text-slate-500">The workforce can create internal tasks and recommendations. External actions require the appropriate approval.</span>
          </div>
        </form>
      </section>

      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {run ? <RunResult run={run} /> : null}

      {pendingApprovals.length ? <ApprovalQueue approvals={pendingApprovals} error={approvalError} notice={approvalNotice} onDecision={handleApproval} /> : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Workforce runs" value={stats.runs} />
        <Metric label="Internal tasks" value={stats.tasks} />
        <Metric label="Pending approvals" value={stats.approvals} />
      </section>

      {runHistory.length ? <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Run history</p><h2 className="mt-1 text-xl font-semibold">Recent workforce objectives</h2></div>
          <span className="text-xs text-slate-500">Last {runHistory.length}</span>
        </div>
        <div className="mt-4 space-y-2">
          {runHistory.map((item) => {
            const active = selectedHistoryRun?.id === item.id
            const summary = item.summary?.summary || item.objective
            return <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <button type="button" onClick={() => setSelectedHistoryRun(active ? null : item)} className="w-full text-left">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{item.objective}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} · {formatProvider(item.provider)}</p></div>
                  <div className="flex items-center gap-3"><span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">{item.status.replaceAll('_', ' ')}</span><span className="text-xs text-slate-500">{item.confidence == null ? '—' : Math.round(Number(item.confidence) * 100) + '%'}</span></div>
                </div>
              </button>
              {active ? <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="text-sm leading-6 text-slate-700">{summary}</p>
                {item.summary?.gaps?.length ? <p className="mt-3 text-xs text-slate-500">Gaps: {item.summary.gaps.slice(0, 3).join(' · ')}</p> : null}
              </div> : null}
            </div>
          })}
        </div>
      </section> : null}

      <section className="mt-8">
        <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Specialist team</p><h2 className="mt-1 text-xl font-semibold">Specialists available to the workforce</h2></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map(([name, key, description], index) => (
            <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-xs font-bold text-blue-700">0{index + 1}</span><span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">Available</span></div>
              <h3 className="mt-5 font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}

function ApprovalQueue({ approvals, error, notice, onDecision }: { approvals: Approval[]; error: string; notice: string; onDecision: (id: string, action: 'approve' | 'reject') => void }) {
  return <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Human approval</p><h2 className="mt-1 text-lg font-semibold">Actions waiting for a workspace admin</h2></div><span className="rounded-full border border-amber-200 px-2.5 py-1 text-xs text-amber-800">{approvals.length} pending</span></div>
    <div className="mt-4 space-y-3">{approvals.map((approval) => <div key={approval.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-wider text-slate-500">{approval.action_type.replaceAll('_', ' ')}</p><p className="mt-1 text-sm text-slate-800">{approval.summary}</p><p className="mt-1 text-xs text-slate-500">Requested {new Date(approval.requested_at).toLocaleString()}</p></div><div className="flex gap-2"><button type="button" onClick={() => onDecision(approval.id, 'reject')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:border-red-700">Reject</button><button type="button" onClick={() => onDecision(approval.id, 'approve')} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold">Approve</button></div></div></div>)}</div>
    {notice ? <p className="mt-3 text-xs text-amber-800">{notice}</p> : null}
    {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
  </section>
}

function RunResult({ run }: { run: Run }) {
  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-500">Run {run.runId.slice(0, 8)}</p><h2 className="mt-1 text-lg font-semibold">{run.final.summary}</h2></div><span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">{formatProvider(run.provider)}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><Mini label="Confidence" value={Math.round(run.final.confidence * 100) + '%'} /><Mini label="Agents selected" value={String(run.plan.selected_agents.length)} /><Mini label="Approval items" value={String(run.final.approvals.length)} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Evidence title="FACT" items={run.final.facts.map((item) => item.statement)} />
        <Evidence title="INFERENCE" items={run.final.inferences.map((item) => item.statement)} />
        <Evidence title="RECOMMENDATION" items={run.final.recommendations.map((item) => item.title + ': ' + item.next_action)} />
        <Evidence title="ACTION" items={run.final.actions.map((item) => item.title)} />
      </div>

      {run.final.gaps.length ? <Evidence title="Information gaps" items={run.final.gaps} /> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wider text-slate-500">Work coordination</p>
        <div className="mt-3 space-y-2">{run.results.map((item) => <div key={item.agentKey} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-medium">{agentLabel(item.agentKey)}</span><span className="text-xs text-slate-500">{item.error || (item.output ? Math.round(item.output.confidence * 100) + '% confidence' : 'completed')}</span></div>)}</div>
      </div>
    </section>
  )
}

function Evidence({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{title}</p>{items.length ? <ul className="mt-3 space-y-2">{items.slice(0, 8).map((item, index) => <li key={index} className="text-sm leading-6 text-slate-700">{item}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">None recorded.</p>}</div>
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div> }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div> }


function formatProvider(provider: string) {
  if (provider.startsWith('openai')) return 'OpenAI'
  if (provider === 'rules_fallback') return 'Built-in operating rules'
  return 'Configured AI provider'
}

function agentLabel(key: string) {
  const match = agents.find(([, agentKey]) => agentKey === key)
  return match?.[0] || key.replaceAll('_', ' ')
}
