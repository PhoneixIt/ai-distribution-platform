'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Opportunity = {
  id: string
  title: string
  description: string | null
  status: string
  stage: string
  estimated_value: number | null
  probability: number
  preferred_region: string | null
  requirements: string[]
  technology_categories: string[]
  customers?: { company_name: string; industry: string | null; company_size: string | null } | null
}

type Match = {
  id: string
  rank: number
  match_score: number
  capability_fit_score: number | null
  industry_fit_score: number | null
  geography_fit_score: number | null
  match_reason: string | null
  strengths: string[]
  risks: string[]
  missing_capabilities: string[]
  recommended_action: string | null
  status: string
  partners?: { id: string; name: string; website: string | null; description: string | null; country: string | null; partner_types: string[]; is_verified: boolean } | null
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>()
  const opportunityId = params.id
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const [{ data: opportunityData, error: opportunityError }, { data: matchData, error: matchError }] = await Promise.all([
        supabase
          .from('opportunities')
          .select('id,title,description,status,stage,estimated_value,probability,preferred_region,requirements,technology_categories,customers(company_name,industry,company_size)')
          .eq('id', opportunityId)
          .eq('org_id', orgId)
          .single(),
        supabase
          .from('partner_matches')
          .select('id,rank,match_score,capability_fit_score,industry_fit_score,geography_fit_score,match_reason,strengths,risks,missing_capabilities,recommended_action,status,partners(id,name,website,description,country,partner_types,is_verified)')
          .eq('opportunity_id', opportunityId)
          .eq('org_id', orgId)
          .order('rank'),
      ])
      if (opportunityError) throw opportunityError
      if (matchError) throw matchError
      const rawOpportunity = opportunityData as Opportunity & { customers?: Opportunity['customers'] | Opportunity['customers'][] }
      setOpportunity({ ...rawOpportunity, customers: Array.isArray(rawOpportunity.customers) ? rawOpportunity.customers[0] ?? null : rawOpportunity.customers })
      setMatches((matchData || []).map((row) => ({ ...row, partners: Array.isArray(row.partners) ? row.partners[0] ?? null : row.partners })) as Match[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load opportunity.')
    } finally {
      setLoading(false)
    }
  }

  // Data-fetching effect: the async callback owns the state updates after the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [opportunityId])

  async function runMatching() {
    setMatching(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/opportunities/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Matching failed.')
      setMessage(`Matching complete: ${payload.matched} partner candidates ranked.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Matching failed.')
    } finally {
      setMatching(false)
    }
  }

  async function selectPartner(partnerId: string) {
    setSelecting(partnerId)
    setError('')
    try {
      const { supabase, orgId } = await ensureWorkspace()
      const { error: insertError } = await supabase.from('opportunity_partners').upsert({ org_id: orgId, opportunity_id: opportunityId, partner_id: partnerId, role: 'partner', status: 'proposed', is_primary: false }, { onConflict: 'opportunity_id,partner_id' })
      if (insertError) throw insertError
      const { error: stageError } = await supabase.from('opportunities').update({ stage: 'partner_selected', status: 'open' }).eq('id', opportunityId).eq('org_id', orgId)
      if (stageError) throw stageError
      setMessage('Partner added to the opportunity. The opportunity is now ready for engagement.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not select partner.')
    } finally {
      setSelecting(null)
    }
  }

  if (loading) return <main className="min-h-screen bg-slate-950 p-8 text-slate-400">Loading opportunity…</main>
  if (!opportunity) return <main className="min-h-screen bg-slate-950 p-8 text-white"><p>Opportunity not found.</p><Link href="/opportunities" className="mt-4 inline-block text-blue-400">← Back to opportunities</Link></main>

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/opportunities" className="text-sm text-blue-400 hover:text-blue-300">← Opportunities</Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Opportunity workspace</p>
            <h1 className="mt-2 text-3xl font-bold">{opportunity.title}</h1>
            <p className="mt-2 text-slate-400">{opportunity.customers?.company_name || 'Customer'} · {opportunity.preferred_region || 'Region not set'} · {opportunity.stage.replaceAll('_', ' ')}</p>
          </div>
          <button onClick={() => void runMatching()} disabled={matching} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{matching ? 'Matching partners…' : matches.length ? 'Refresh partner matches' : 'Find matching partners'}</button>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
        {message && <div className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-300">{message}</div>}

        <section className="mt-7 grid gap-4 md:grid-cols-4">
          <Metric label="Customer" value={opportunity.customers?.company_name || '—'} />
          <Metric label="Technology" value={opportunity.technology_categories.join(', ') || 'Not set'} />
          <Metric label="Requirements" value={opportunity.requirements.join(', ') || 'Not set'} />
          <Metric label="Value" value={opportunity.estimated_value ? `$${Number(opportunity.estimated_value).toLocaleString()}` : 'Not set'} />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI matching layer</p><h2 className="mt-2 text-xl font-semibold">Best channel partners</h2><p className="mt-1 text-sm text-slate-500">Deterministic matching uses the structured partner and opportunity data first. AI explanation can be layered on top later.</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{matches.length} ranked</span></div>

          {matches.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-800 p-10 text-center"><p className="text-sm text-slate-400">No matches yet.</p><p className="mt-1 text-xs text-slate-600">Run matching to compare your opportunity against active partner profiles.</p></div> : <div className="mt-6 space-y-4">{matches.map((match) => <article key={match.id} className="rounded-xl border border-slate-800 bg-slate-950 p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold">{match.rank}</span><h3 className="text-lg font-semibold">{match.partners?.name || 'Partner'}</h3><span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">{match.status}</span>{match.partners?.is_verified && <span className="rounded-full border border-emerald-900 px-2 py-1 text-[11px] text-emerald-400">Verified</span>}</div><p className="mt-2 text-sm text-slate-400">{match.match_reason || 'Structured data indicates potential fit.'}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">{match.strengths.slice(0, 4).map((item) => <span key={item} className="rounded-full border border-slate-800 px-2.5 py-1">{item}</span>)}</div></div><div className="w-full lg:w-80"><div className="flex items-end justify-between"><span className="text-xs uppercase tracking-wider text-slate-500">Match</span><span className="text-3xl font-bold text-blue-400">{Math.round(Number(match.match_score))}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, Number(match.match_score)))}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><Mini label="Capability" value={match.capability_fit_score} /><Mini label="Industry" value={match.industry_fit_score} /><Mini label="Geography" value={match.geography_fit_score} /></div></div></div><div className="mt-5 grid gap-4 border-t border-slate-800 pt-4 md:grid-cols-2"><div><p className="text-xs uppercase tracking-wider text-slate-500">Recommended action</p><p className="mt-1 text-sm text-slate-300">{match.recommended_action || 'Review the partner profile before outreach.'}</p></div><div><p className="text-xs uppercase tracking-wider text-slate-500">Risks / missing capabilities</p><p className="mt-1 text-sm text-slate-400">{[...match.risks, ...match.missing_capabilities].slice(0, 3).join(' · ') || 'None recorded'}</p></div></div><div className="mt-5 flex flex-wrap gap-3 border-t border-slate-800 pt-4"><button onClick={() => match.partners && void selectPartner(match.partners.id)} disabled={!match.partners || selecting === match.partners.id} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{selecting === match.partners?.id ? 'Adding…' : 'Select partner'}</button>{match.partners?.website && <a href={match.partners.website} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-blue-500">Visit website</a>}</div></article>)}</div>}
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 truncate text-sm font-medium text-slate-200">{value}</p></div> }
function Mini({ label, value }: { label: string; value: number | null }) { return <div className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-2"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 text-sm font-semibold text-slate-300">{value == null ? '—' : `${Math.round(Number(value))}%`}</p></div> }
