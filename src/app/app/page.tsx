'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import AppShell from '@/components/app-shell'
import DashboardLoader from './dashboard-loader'

type Stats = { partners: number; vendors: number; distributors: number; customers: number; opportunities: number; matches: number }
type Recent = { id: string; title: string; status: string; stage: string; estimated_value: number | null }
type DashboardData = { stats: Stats; recent: Recent[] }

export default function AppDashboard() {
  const [data, setData] = useState<DashboardData>({ stats: { partners: 0, vendors: 0, distributors: 0, customers: 0, opportunities: 0, matches: 0 }, recent: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleData = useCallback((nextData: DashboardData) => { setData(nextData); setLoading(false) }, [])
  const handleError = useCallback((message: string) => { setError(message); setLoading(false) }, [])
  const { stats, recent } = data
  const nextAction = getNextAction(stats)

  return (
    <AppShell title="Command center" subtitle="Find the right channel relationships, turn them into opportunities, and keep the next action visible.">
      <DashboardLoader onData={handleData} onError={handleError} />
      {error && <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Partners', stats.partners, '/partners'], ['Vendors', stats.vendors, '/vendors'], ['Distributors', stats.distributors, '/distributors'],
          ['Customers', stats.customers, '/customers'], ['Opportunities', stats.opportunities, '/opportunities'], ['AI Matches', stats.matches, '/opportunities'],
        ].map(([label, value, href]) => (
          <Link key={String(label)} href={String(href)} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-900 hover:bg-slate-900/80">
            <p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{loading ? '—' : value}</p><p className="mt-2 text-xs text-slate-600">Open workspace →</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-blue-900/50 bg-gradient-to-br from-blue-950/40 to-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Recommended next step</p>
          <h2 className="mt-2 text-xl font-semibold">{nextAction.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{nextAction.description}</p>
          <Link href={nextAction.href} className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">{nextAction.label}</Link>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Operating flow</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {['Discover', 'Verify', 'Match', 'Engage'].map((step, index) => <div key={step} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><span className="text-xs text-blue-400">0{index + 1}</span><p className="mt-2 text-sm font-medium">{step}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Discovery</p><h2 className="mt-2 text-xl font-semibold">Build your channel intelligence layer</h2><p className="mt-2 text-sm leading-6 text-slate-400">Search the market, inspect evidence-backed companies, qualify the strongest candidates, and save useful relationships to your workspace.</p></div><Link href="/discovery" className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Start discovery</Link></div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick actions</p>
          <div className="mt-4 space-y-2">
            {[['Add partner', '/partners/new'], ['Create opportunity', '/opportunities'], ['Browse distributors', '/distributors'], ['Browse vendors', '/vendors']].map(([label, href]) => <Link key={label} href={href} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 hover:border-slate-700 hover:text-white"><span>{label}</span><span className="text-slate-600">→</span></Link>)}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Recent opportunities</h2><p className="mt-1 text-sm text-slate-500">The latest activity in your channel pipeline.</p></div><Link href="/opportunities" className="text-sm text-blue-400 hover:text-blue-300">View all</Link></div>
        {recent.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-800 p-8 text-center"><p className="text-sm text-slate-400">No opportunities yet.</p><p className="mt-1 text-xs text-slate-600">Create one to start matching your channel ecosystem against a real business need.</p></div> : <div className="mt-5 divide-y divide-slate-800">{recent.map(item => <div key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-200">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.stage.replaceAll('_', ' ')} · {item.status}</p></div><span className="text-sm text-slate-400">{item.estimated_value ? `$${Number(item.estimated_value).toLocaleString()}` : 'Value not set'}</span></div>)}</div>}
      </section>
    </AppShell>
  )
}

function getNextAction(stats: Stats) {
  if (stats.partners === 0) return { title: 'Start with partner discovery', description: 'Your workspace has no saved partners yet. Use evidence-backed discovery to build the first layer of reusable channel intelligence.', label: 'Find partners', href: '/discovery' }
  if (stats.opportunities === 0) return { title: 'Create your first opportunity', description: 'Turn a real customer or market requirement into an opportunity so the platform can connect it to relevant channel relationships.', label: 'Create opportunity', href: '/opportunities' }
  if (stats.matches === 0) return { title: 'Run partner matching', description: 'You have channel data and opportunities. The next product step is to match opportunity requirements against the partner intelligence you have collected.', label: 'Review opportunities', href: '/opportunities' }
  return { title: 'Review your active matches', description: 'You already have partner matches. Review the strongest relationships and move the most relevant ones toward engagement.', label: 'Review matches', href: '/opportunities' }
}
