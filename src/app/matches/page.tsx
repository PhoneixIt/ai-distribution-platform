'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type Match = {
  id: string
  opportunity_id: string
  partner_id: string
  match_score: number
  capability_fit_score: number | null
  industry_fit_score: number | null
  geography_fit_score: number | null
  match_reason: string | null
  recommended_action: string | null
  status: string
  rank: number
  opportunities?: { id: string; title: string } | null
  partners?: { id: string; name: string; website: string | null; country: string | null; is_verified: boolean } | null
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { supabase, orgId } = await ensureWorkspace()
        const { data, error: queryError } = await supabase
          .from('partner_matches')
          .select('id,opportunity_id,partner_id,match_score,capability_fit_score,industry_fit_score,geography_fit_score,match_reason,recommended_action,status,rank,opportunities(id,title),partners(id,name,website,country,is_verified)')
          .eq('org_id', orgId)
          .order('match_score', { ascending: false })
          .limit(100)
        if (queryError) throw queryError
        if (!active) return
        setMatches((data || []).map((row) => ({
          ...row,
          opportunities: Array.isArray(row.opportunities) ? row.opportunities[0] ?? null : row.opportunities,
          partners: Array.isArray(row.partners) ? row.partners[0] ?? null : row.partners,
        })) as Match[])
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load AI matches.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Matches</h1>
          <p className="mt-1 text-sm text-slate-400">Partner recommendations generated from your opportunity and partner data.</p>
        </div>

        {error && <div className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">Loading matches…</div>
        ) : matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
            <p className="font-medium">No AI matches yet.</p>
            <p className="mt-2 text-sm text-slate-500">Open an opportunity and run partner matching to generate ranked recommendations.</p>
            <Link href="/opportunities" className="mt-4 inline-block text-sm text-blue-400">Go to opportunities →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <article key={match.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{match.partners?.name || 'Partner'}</h2>
                      {match.partners?.is_verified && <span className="rounded-full border border-emerald-900 px-2 py-1 text-[11px] text-emerald-400">Verified</span>}
                      <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">{match.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{match.opportunities?.title || 'Opportunity'} · {match.partners?.country || 'Country not set'}</p>
                    <p className="mt-3 text-sm text-slate-300">{match.match_reason || 'Structured data indicates potential fit.'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Match score</p>
                    <p className="text-3xl font-bold text-blue-400">{Math.round(Number(match.match_score))}%</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Metric label="Capability" value={match.capability_fit_score} />
                  <Metric label="Industry" value={match.industry_fit_score} />
                  <Metric label="Geography" value={match.geography_fit_score} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <p className="text-sm text-slate-400">{match.recommended_action || 'Review the partner before outreach.'}</p>
                  <Link href={`/opportunities/${match.opportunity_id}`} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-blue-500">Open opportunity</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 text-sm font-semibold text-slate-300">{value == null ? '—' : `${Math.round(Number(value))}%`}</p></div>
}
