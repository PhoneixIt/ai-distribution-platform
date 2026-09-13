'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Stats = { partners: number; vendors: number; distributors: number; customers: number; opportunities: number; matches: number }

export default function AppDashboard() {
  const [stats, setStats] = useState<Stats>({ partners: 0, vendors: 0, distributors: 0, customers: 0, opportunities: 0, matches: 0 })
  const [recent, setRecent] = useState<Array<{ id: string; title: string; status: string; stage: string; estimated_value: number | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { void load() }, [])
  async function load() {
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const [partners, vendors, distributors, customers, opportunities, matches] = await Promise.all([
        supabase.from('partners').select('*', { count: 'exact', head: true }),
        supabase.from('vendors').select('*', { count: 'exact', head: true }),
        supabase.from('distributors').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('partner_matches').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      ])
      const { data: recentData } = await supabase.from('opportunities').select('id,title,status,stage,estimated_value').eq('org_id', orgId).order('created_at', { ascending: false }).limit(6)
      setStats({ partners: partners.count ?? 0, vendors: vendors.count ?? 0, distributors: distributors.count ?? 0, customers: customers.count ?? 0, opportunities: opportunities.count ?? 0, matches: matches.count ?? 0 })
      setRecent(recentData ?? [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your workspace.') }
    finally { setLoading(false) }
  }

  return <AppShell title="Workspace overview" subtitle="A practical command center for discovering, managing and activating your channel ecosystem.">
    {error && <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{[
      ['Partners', stats.partners, '/partners'], ['Vendors', stats.vendors, '/vendors'], ['Distributors', stats.distributors, '/distributors'], ['Customers', stats.customers, '/customers'], ['Opportunities', stats.opportunities, '/opportunities'], ['AI Matches', stats.matches, '/opportunities']
    ].map(([label,value,href]) => <Link key={String(label)} href={String(href)} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-blue-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{loading ? '—' : value}</p><p className="mt-2 text-xs text-slate-600">Open</p></Link>)}</section>
    <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Core action</p><h2 className="mt-2 text-xl font-semibold">Find your next channel opportunity</h2><p className="mt-2 text-sm leading-6 text-slate-400">Run an evidence-backed market search, inspect the strongest candidates, then save companies into your reusable partner intelligence layer.</p></div><Link href="/discovery" className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Start discovery</Link></div><div className="mt-7 grid gap-3 sm:grid-cols-4">{['Discover', 'Research', 'Qualify', 'Activate'].map((step,i) => <div key={step} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><span className="text-xs text-blue-400">0{i+1}</span><p className="mt-2 text-sm font-medium">{step}</p></div>)}</div></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick actions</p><div className="mt-4 space-y-2">{[['Add partner','/partners/new'],['Add customer','/customers'],['Create opportunity','/opportunities'],['Browse vendors','/vendors']].map(([label,href]) => <Link key={label} href={href} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 hover:border-slate-700 hover:text-white"><span>{label}</span><span className="text-slate-600">→</span></Link>)}</div></div>
    </section>
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Recent opportunities</h2><p className="mt-1 text-sm text-slate-500">Your latest channel pipeline activity.</p></div><Link href="/opportunities" className="text-sm text-blue-400 hover:text-blue-300">View all</Link></div>{recent.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No opportunities yet. Create one from the Opportunities workspace.</div> : <div className="mt-5 divide-y divide-slate-800">{recent.map(item => <div key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-200">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.stage.replaceAll('_',' ')} · {item.status}</p></div><span className="text-sm text-slate-400">{item.estimated_value ? `$${Number(item.estimated_value).toLocaleString()}` : 'Value not set'}</span></div>)}</div>}</section>
  </AppShell>
}
