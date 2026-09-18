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

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { supabase, orgId } = await ensureWorkspace()
        const [{ count: runs }, { count: tasks }, { count: approvals }] = await Promise.all([
          supabase.from('agent_runs').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
          supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
          supabase.from('agent_approvals').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending'),
        ])
        if (active) setStats({ runs: runs || 0, tasks: tasks || 0, approvals: approvals || 0 })
      } catch {
        // The protected shell still renders if the metrics query is unavailable.
      }
    }
    void load()
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!objective.trim()) return
    setRunning(true)
    setError('')
    setRun(null)
    try {
      const response = await fetch('/api/ai/workforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'AI operating run failed.')
      setRun(payload.data)
      setStats((current) => ({ ...current, runs: current.runs + 1 }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI operating run failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <AppShell title="AI operating workspace" subtitle="Give the AI workforce a real business objective. It researches the workspace, coordinates specialist work and returns recommendations your team can review.">
      <section className="rounded-2xl border border-blue-900/50 bg-blue-950/15 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI workforce</p>
        <h2 className="mt-2 text-xl font-semibold">What do you want the AI workforce to work on?</h2>
        <form onSubmit={submit} className="mt-5">
          <textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={4} placeholder="Example: Which partners should I reactivate this week?" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500" />
          <div className="mt-3 flex flex-wrap gap-2">
            {prompts.map((prompt) => <button key={prompt} type="button" onClick={() => setObjective(prompt)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500 hover:text-white">{prompt}</button>)}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button disabled={running || !objective.trim()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">{running ? 'Running agents…' : 'Run operating analysis'}</button>
            <span className="text-xs text-slate-500">The workforce can create internal tasks and recommendations. External actions require the appropriate approval.</span>
          </div>
        </form>
      </section>

      {error ? <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div> : null}

      {run ? <RunResult run={run} /> : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Agent runs" value={stats.runs} />
        <Metric label="Agent tasks" value={stats.tasks} />
        <Metric label="Pending approvals" value={stats.approvals} />
      </section>

      <section className="mt-8">
        <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Agent team</p><h2 className="mt-1 text-xl font-semibold">Smallest useful operating team</h2></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map(([name, key, description], index) => (
            <article key={key} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-bold text-blue-300">0{index + 1}</span><span className="rounded-full border border-slate-800 px-2.5 py-1 text-[11px] text-slate-500">{key}</span></div>
              <h3 className="mt-5 font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}

function RunResult({ run }: { run: Run }) {
  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-500">Run {run.runId.slice(0, 8)}</p><h2 className="mt-1 text-lg font-semibold">{run.final.summary}</h2></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{formatProvider(run.provider)}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><Mini label="Confidence" value={Math.round(run.final.confidence * 100) + '%'} /><Mini label="Agents selected" value={String(run.plan.selected_agents.length)} /><Mini label="Approval items" value={String(run.final.approvals.length)} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Evidence title="FACT" items={run.final.facts.map((item) => item.statement)} />
        <Evidence title="INFERENCE" items={run.final.inferences.map((item) => item.statement)} />
        <Evidence title="RECOMMENDATION" items={run.final.recommendations.map((item) => item.title + ': ' + item.next_action)} />
        <Evidence title="ACTION" items={run.final.actions.map((item) => item.title)} />
      </div>

      {run.final.gaps.length ? <Evidence title="Information gaps" items={run.final.gaps} /> : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-xs uppercase tracking-wider text-slate-500">Delegation trace</p>
        <div className="mt-3 space-y-2">{run.results.map((item) => <div key={item.agentKey} className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-medium">{agentLabel(item.agentKey)}</span><span className="text-xs text-slate-500">{item.error || (item.output ? Math.round(item.output.confidence * 100) + '% confidence' : 'completed')}</span></div>)}</div>
      </div>
    </section>
  )
}

function Evidence({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">{title}</p>{items.length ? <ul className="mt-3 space-y-2">{items.slice(0, 8).map((item, index) => <li key={index} className="text-sm leading-6 text-slate-300">{item}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">None recorded.</p>}</div>
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div> }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-950 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-200">{value}</p></div> }


function formatProvider(provider: string) {
  if (provider.startsWith('openai')) return 'OpenAI'
  if (provider === 'rules_fallback') return 'Built-in operating rules'
  return 'Configured AI provider'
}

function agentLabel(key: string) {
  const match = agents.find(([, agentKey]) => agentKey === key)
  return match?.[0] || key.replaceAll('_', ' ')
}
