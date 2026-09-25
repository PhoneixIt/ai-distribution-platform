'use client'

import Link from 'next/link'
import AppShell from '@/components/app-shell'

const cards = [
  ['Ecosystem intelligence', 'Understand organizations, products, technologies, markets and relationships as connected ecosystem signals.', '/discovery'],
  ['Evidence & freshness', 'Keep research distinguishable from confirmed facts, with evidence and freshness visible where the platform has it.', '/discovery'],
  ['Matching intelligence', 'Use structured fit and ecosystem context to connect supply, channel capability and demand.', '/matches'],
  ['Commercial intelligence', 'Bring pricing, opportunities and relationship context into missions without turning PortAi into a second CRM.', '/pricing'],
]

export default function InsightsPage() {
  return (
    <AppShell title="Insights" subtitle="Intelligence that helps PortAi understand the ecosystem and decide what work should happen next.">
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(([title, copy, href]) => (
          <Link key={title} href={href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">PortAi intelligence</p>
            <h2 className="mt-2 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
            <span className="mt-5 inline-block text-sm font-semibold text-blue-700">Explore →</span>
          </Link>
        ))}
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold">Objective-first intelligence</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">The long-term goal is not another reporting dashboard. PortAi should turn ecosystem intelligence into decisions, approved actions and measurable outcomes.</p>
        <Link href="/missions/new" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Start from an objective</Link>
      </section>
    </AppShell>
  )
}
