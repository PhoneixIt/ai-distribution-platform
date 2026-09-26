'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'

const steps = [
  { number: '01', label: 'Discover', title: 'Find companies that fit your channel objective', description: 'Search vendors, distributors, resellers, MSPs and MSSPs using evidence-backed market research.', href: '/discovery', action: 'Start discovery' },
  { number: '02', label: 'Review evidence', title: 'Turn research into reusable intelligence', description: 'Review company capabilities, technologies, customer segments, relationships and source evidence before saving.', href: '/partners', action: 'Open partners' },
  { number: '03', label: 'Understand demand', title: 'Turn a requirement into an ecosystem objective', description: 'Capture the customer need, market signal, technology requirement, geography and commercial context.', href: '/opportunities', action: 'Open opportunities' },
  { number: '04', label: 'Match', title: 'Find the right channel relationship', description: 'Run deterministic matching against your partner intelligence and review the fit, strengths, risks and missing capabilities.', href: '/opportunities', action: 'Review matches' },
  { number: '05', label: 'Engage', title: 'Move the relationship forward', description: 'Select a partner, record the relationship and keep the next action visible instead of losing it in email or notes.', href: '/opportunities', action: 'Open pipeline' },
  { number: '06', label: 'Operate', title: 'Let the AI workforce coordinate the work', description: 'Research, qualification, matching, outreach and meeting agents share the same workspace data and human approval stays in control.', href: '/workforce', action: 'Open AI workforce' },
]

type Mission = { id: string; objective: string; current_stage: string; status: string; candidate_count: number; result_summary: Record<string, unknown> }

export default function WorkflowPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  useEffect(() => { void fetch('/api/missions').then((r) => r.json()).then((data) => setMissions(data.missions || [])).catch(() => {}) }, [])

  return (
    <AppShell title="Missions" subtitle="Tell PortAi what you want to accomplish. It turns your objective into evidence-backed discovery, matching and approved action.">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 p-6 lg:p-8">
        <div className="mb-5 rounded-2xl border border-blue-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Outcome first</p>
          <p className="mt-1 text-sm text-slate-700">You do not need to understand PortAi&apos;s internal agents or stages. Describe the business result; PortAi handles the workflow underneath.</p>
        </div>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">The operating loop</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">Discover → Research → Qualify → Review → Match → Engage → Learn</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Every stage contributes context to the same mission. PortAi keeps evidence, relationships, recommendations and approved actions connected so the work can improve over time.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link href="/missions/new" className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Start with an objective →</Link><Link href="/discovery" className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-blue-500">Explore ecosystem search →</Link></div>
        </div>
      </section>

      {missions.length ? <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Active missions</p><h2 className="mt-1 text-lg font-semibold">Execution state</h2></div><span className="text-xs text-slate-500">{missions.length} recent</span></div>
        <div className="mt-4 space-y-2">{missions.map((mission) => <Link key={mission.id} href={'/missions/' + mission.id} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-900"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium text-slate-800">{mission.objective}</p><span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">{mission.current_stage.replaceAll('_',' ')}</span></div><p className="mt-1 text-xs text-slate-500">Selected: {mission.candidate_count} · Contacts: {String(mission.result_summary.contacts_found ?? 0)} · Drafts: {String(mission.result_summary.drafts_generated ?? 0)} · Credits: {String(mission.result_summary.hunter_credits_consumed ?? 0)}</p></Link>)}</div>
      </section> : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {steps.map((step) => (
          <article key={step.number} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600/15 text-xs font-bold text-blue-700">{step.number}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{step.label}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
                <Link href={step.href} className="mt-5 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-blue-500 hover:text-slate-900">{step.action} →</Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">External data cost</p>
        <h2 className="mt-1 text-lg font-semibold">Apollo usage is mission-visible</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">PortAi records estimated and consumed external credits per mission. The first test is configured without phone or waterfall enrichment, so the planned maximum is 20 Apollo credits for 10 selected companies.</p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ['Ecosystem graph', 'Shared business context', 'Vendors, distributors, partners, customers, products, opportunities and relationships stay connected.'],
          ['Intelligence layer', 'Evidence + matching', 'Research is retained with sources and confidence; matching explains fit, gaps and next actions.'],
          ['AI workforce', 'Human-controlled execution', 'Specialists coordinate research and internal work while external actions remain behind approval.'],
        ].map(([label, title, copy]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><h3 className="mt-2 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></div>)}
      </section>
    </AppShell>
  )
}
