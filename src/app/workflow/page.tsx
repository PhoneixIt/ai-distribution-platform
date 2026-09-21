'use client'

import Link from 'next/link'
import AppShell from '@/components/app-shell'

const steps = [
  { number: '01', label: 'Discover', title: 'Find companies that fit your channel objective', description: 'Search vendors, distributors, resellers, MSPs and MSSPs using evidence-backed market research.', href: '/discovery', action: 'Start discovery' },
  { number: '02', label: 'Verify', title: 'Turn research into reusable intelligence', description: 'Inspect company capabilities, technologies, customer segments, relationships and source evidence before saving.', href: '/partners', action: 'Open partners' },
  { number: '03', label: 'Understand demand', title: 'Turn a requirement into an ecosystem objective', description: 'Capture the customer need, market signal, technology requirement, geography and commercial context.', href: '/opportunities', action: 'Open opportunities' },
  { number: '04', label: 'Match', title: 'Find the right channel relationship', description: 'Run deterministic matching against your partner intelligence and review the fit, strengths, risks and missing capabilities.', href: '/opportunities', action: 'Review matches' },
  { number: '05', label: 'Engage', title: 'Move the relationship forward', description: 'Select a partner, record the relationship and keep the next action visible instead of losing it in email or notes.', href: '/opportunities', action: 'Open pipeline' },
  { number: '06', label: 'Operate', title: 'Let the AI workforce coordinate the work', description: 'Research, qualification, matching, outreach and meeting agents share the same workspace data and human approval stays in control.', href: '/workforce', action: 'Open AI workforce' },
]

export default function WorkflowPage() {
  return (
    <AppShell title="Missions" subtitle="Turn an ecosystem objective into a connected sequence of discovery, intelligence, matching and action.">
      <section className="rounded-2xl border border-blue-900/50 bg-gradient-to-br from-blue-950/40 to-slate-900 p-6 lg:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">The operating loop</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">Discover → Research → Verify → Match → Engage → Learn</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">Every stage contributes context to the same mission. PortAi keeps evidence, relationships, recommendations and approved actions connected so the work can improve over time.</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {steps.map((step) => (
          <article key={step.number} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600/15 text-xs font-bold text-blue-300">{step.number}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">{step.label}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
                <Link href={step.href} className="mt-5 inline-flex rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-blue-500 hover:text-white">{step.action} →</Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ['Ecosystem graph', 'Shared business context', 'Vendors, distributors, partners, customers, products, opportunities and relationships stay connected.'],
          ['Intelligence layer', 'Evidence + matching', 'Research is retained with sources and confidence; matching explains fit, gaps and next actions.'],
          ['AI workforce', 'Human-controlled execution', 'Specialists coordinate research and internal work while external actions remain behind approval.'],
        ].map(([label, title, copy]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><h3 className="mt-2 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></div>)}
      </section>
    </AppShell>
  )
}
