'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { createClient } from '@/lib/supabase/client'

const agents = [
  ['Research Agent', 'Find and verify company intelligence from approved sources.', 'research'],
  ['Qualification Agent', 'Assess whether a company satisfies the current channel objective.', 'qualification'],
  ['Matching Agent', 'Explain the strongest partner-to-opportunity relationships.', 'matching'],
  ['Outreach Agent', 'Prepare human-reviewable email, LinkedIn and call follow-up drafts.', 'outreach'],
  ['Meeting Agent', 'Prepare briefs, questions, notes and follow-up actions around meetings.', 'meeting'],
  ['Opportunity Agent', 'Keep opportunity stages, partner selection and next actions moving.', 'opportunity'],
]

type Stats = { runs: number; tasks: number; pending: number }

export default function WorkforcePage() {
  const [stats, setStats] = useState<Stats>({ runs: 0, tasks: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      const supabase = createClient()
      const [{ count: runs }, { count: tasks }, { count: pending }] = await Promise.all([
        supabase.from('agent_runs').select('*', { count: 'exact', head: true }),
        supabase.from('agent_tasks').select('*', { count: 'exact', head: true }),
        supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'queued', 'running']),
      ])
      if (active) { setStats({ runs: runs || 0, tasks: tasks || 0, pending: pending || 0 }); setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [])

  return (
    <AppShell title="AI workforce" subtitle="A coordinated team of agents working from the same channel operating system, with approval gates for external actions.">
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Agent runs" value={loading ? '—' : stats.runs} />
        <Metric label="Tasks" value={loading ? '—' : stats.tasks} />
        <Metric label="Pending work" value={loading ? '—' : stats.pending} />
      </section>

      <section className="mt-6 rounded-2xl border border-blue-900/50 bg-blue-950/15 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Control principle</p><h2 className="mt-2 text-lg font-semibold">AI prepares and coordinates. You approve external action.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Research and internal analysis can be automated. Outreach, partner introductions and other external communication should remain reviewable until the approval workflow is mature.</p></div>
          <Link href="/workflow" className="shrink-0 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-blue-500">View workflow</Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map(([name, description, key], index) => <article key={key} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-bold text-blue-300">0{index + 1}</span><span className="rounded-full border border-slate-800 px-2.5 py-1 text-[11px] text-slate-500">Ready for orchestration</span></div><h3 className="mt-5 font-semibold">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>)}
      </section>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div> }
