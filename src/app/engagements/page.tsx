'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Engagement = {
  id: string
  opportunity_id: string
  partner_id: string
  role: string
  status: string
  is_primary: boolean
  notes: string | null
  created_at: string
  opportunities?: { id: string; title: string; stage: string } | null
  partners?: { id: string; name: string; website: string | null; country: string | null } | null
}

const statuses = ['proposed', 'introduced', 'engaged', 'accepted', 'declined']

export default function EngagementsPage() {
  const [items, setItems] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const { data, error: queryError } = await supabase.from('opportunity_partners').select('id,opportunity_id,partner_id,role,status,is_primary,notes,created_at,opportunities(id,title,stage),partners(id,name,website,country)').eq('org_id', orgId).order('created_at', { ascending: false })
      if (queryError) throw queryError
      setItems((data || []).map((row) => ({ ...row, opportunities: Array.isArray(row.opportunities) ? row.opportunities[0] ?? null : row.opportunities, partners: Array.isArray(row.partners) ? row.partners[0] ?? null : row.partners })) as Engagement[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load engagements.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function updateStatus(id: string, status: string) {
    setError('')
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
      if (status === 'introduced') patch.introduced_at = new Date().toISOString()
      if (status === 'accepted') patch.accepted_at = new Date().toISOString()
      if (status === 'declined') patch.declined_at = new Date().toISOString()
      const { error: updateError } = await supabase.from('opportunity_partners').update(patch).eq('id', id).eq('org_id', orgId)
      if (updateError) throw updateError
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update engagement.') }
  }

  return <AppShell title="Engagements" subtitle="The relationship layer after a partner is selected. Keep introductions, status and next steps connected to the opportunity.">
    {error && <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Partner relationships</p><h2 className="mt-2 text-xl font-semibold">Opportunity engagements</h2><p className="mt-1 text-sm text-slate-500">Select a partner from an opportunity, then move the relationship through its engagement stages here.</p></div><Link href="/opportunities" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Open opportunities</Link></div>
      {loading ? <div className="py-12 text-center text-sm text-slate-500">Loading engagements…</div> : items.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-800 p-10 text-center"><p className="text-sm text-slate-400">No partner engagements yet.</p><p className="mt-1 text-xs text-slate-600">Run a match on an opportunity and select a partner to create the first relationship record.</p></div> : <div className="mt-6 space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.partners?.name || 'Partner'}</h3><span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] capitalize text-slate-400">{item.status}</span>{item.is_primary && <span className="rounded-full border border-blue-900 px-2 py-1 text-[11px] text-blue-300">Primary</span>}</div><p className="mt-2 text-sm text-slate-400">Opportunity: {item.opportunities?.title || 'Unknown'} · {item.opportunities?.stage?.replaceAll('_', ' ') || 'stage not set'}</p><p className="mt-1 text-xs text-slate-600">Role: {item.role} · Added {new Date(item.created_at).toLocaleDateString()}</p></div><div className="flex flex-wrap items-center gap-2"><select value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><Link href={`/opportunities/${item.opportunity_id}`} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-blue-500">Open opportunity</Link></div></div></article>)}</div>}
    </section>
  </AppShell>
}
