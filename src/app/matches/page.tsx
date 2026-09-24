'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'

type Mission = {
  id: string
  objective: string
  vendor_name: string | null
  product_name: string | null
  country: string | null
  partner_types: string[]
  technology_focus: string | null
  customer_segment: string | null
  status: string
  current_stage: string
  candidate_count: number
  discovery_run_id: string | null
  result_summary: Record<string, unknown>
}

type Match = {
  rank: number
  matchScore: number
  technologyFit: number
  partnerFit: number
  geographyFit: number
  segmentFit: number
  evidenceFit: number
  qualificationStatus: string
  researchStatus: string
  researchConfidence: number
  company: {
    id: string
    name: string
    website: string | null
    country: string | null
    description: string | null
  }
  strengths: string[]
  risks: string[]
  reasons: string[]
  concerns: string[]
  evidence: unknown[]
  recommendedAction: string
}

export default function MatchesPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadMissions() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/matching/mission')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not load missions.')
      const nextMissions = (payload.missions || []) as Mission[]
      setMissions(nextMissions)
      if (!selectedMissionId && nextMissions.length) setSelectedMissionId(nextMissions[0].id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load missions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMissions()
  }, [])

  async function runMatching() {
    if (!selectedMissionId) return
    setRunning(true)
    setError('')
    setMessage('')
    setMatches([])
    try {
      const response = await fetch('/api/matching/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: selectedMissionId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'AI matching failed.')
      setMatches((payload.matches || []) as Match[])
      setMessage(`Matching complete: ${payload.matched} candidates ranked from the selected mission.`)
      await loadMissions()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI matching failed.')
    } finally {
      setRunning(false)
    }
  }

  const selectedMission = missions.find((mission) => mission.id === selectedMissionId) || null

  return (
    <AppShell title="AI matching" subtitle="Run an explainable matching mission against the real companies PortAi has already discovered and researched.">
      <div className="space-y-6">
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Mission-driven matching</p>
          <h1 className="mt-2 text-3xl font-bold">Match the best companies to a mission</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            PortAi uses the selected mission criteria, discovery evidence and research status to rank candidates. No opportunity record is required for this mission-level matching step.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedMissionId}
              onChange={(event) => { setSelectedMissionId(event.target.value); setMatches([]); setMessage('') }}
              disabled={!missions.length || running}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500"
            >
              {!missions.length ? <option value="">No discovered missions available</option> : missions.map((mission) => (
                <option key={mission.id} value={mission.id}>{mission.objective}</option>
              ))}
            </select>
            <button
              disabled={!selectedMissionId || running || loading}
              onClick={() => void runMatching()}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? 'Running AI matching…' : matches.length ? 'Re-run AI matching' : 'Run AI matching'}
            </button>
          </div>
          {selectedMission && (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metric label="Candidates" value={selectedMission.candidate_count} />
              <Metric label="Country" value={selectedMission.country || 'Not specified'} />
              <Metric label="Technology" value={selectedMission.technology_focus || 'Objective only'} />
              <Metric label="Partner type" value={selectedMission.partner_types.join(', ') || 'Objective only'} />
            </div>
          )}
        </section>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

        {!loading && !missions.length ? (
          <section className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="font-medium">No completed discovery mission is available yet.</p>
            <p className="mt-2 text-sm text-slate-500">Run a discovery mission first; its researched companies will then become available to the matching engine.</p>
            <Link href="/discovery" className="mt-4 inline-block text-sm font-medium text-blue-700">Start a discovery mission →</Link>
          </section>
        ) : null}

        {matches.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Ranked mission matches</p>
                <h2 className="mt-1 text-xl font-semibold">{matches.length} candidates</h2>
              </div>
              <span className="text-xs text-slate-500">Deterministic + evidence-backed</span>
            </div>

            {matches.map((match) => (
              <article key={match.company.id + '-' + match.rank} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700">{match.rank}</span>
                      <h3 className="text-lg font-semibold">{match.company.name}</h3>
                      <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">{match.qualificationStatus.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{match.company.country || 'Country not verified'} · Research {match.researchStatus}</p>
                    <p className="mt-3 text-sm text-slate-700">{match.company.description || 'No verified description recorded.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.strengths.map((item) => <span key={item} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">{item}</span>)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Match</p>
                    <p className="text-3xl font-bold text-blue-700">{match.matchScore}%</p>
                    <p className="mt-1 text-xs text-slate-500">Evidence {match.evidenceFit}%</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Metric label="Technology" value={match.technologyFit + '%'} />
                  <Metric label="Partner type" value={match.partnerFit + '%'} />
                  <Metric label="Geography" value={match.geographyFit + '%'} />
                  <Metric label="Customer segment" value={match.segmentFit + '%'} />
                </div>

                <details className="mt-5 border-t border-slate-200 pt-4">
                  <summary className="cursor-pointer text-sm font-medium text-blue-700">View reasoning & evidence</summary>
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold">Why it matched</h4>
                      <ul className="mt-2 space-y-2 text-sm text-slate-500">{(match.reasons.length ? match.reasons : match.strengths).map((item) => <li key={item}>• {item}</li>)}</ul>
                      {!!match.risks.length && <><h4 className="mt-5 text-sm font-semibold">Risks</h4><ul className="mt-2 space-y-2 text-sm text-slate-500">{match.risks.map((item) => <li key={item}>• {item}</li>)}</ul></>}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Recommended next step</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{match.recommendedAction}</p>
                      {!!match.evidence.length && <><h4 className="mt-5 text-sm font-semibold">Evidence</h4><ul className="mt-2 space-y-2 text-xs text-slate-500">{match.evidence.slice(0, 6).map((item, index) => <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul></>}
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 truncate text-sm font-semibold text-slate-800">{String(value)}</p></div>
}
