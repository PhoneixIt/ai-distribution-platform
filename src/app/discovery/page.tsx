'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import AppShell from '@/components/app-shell'

type Candidate = {
  candidateId: string | null
  candidate: {
    companyName: string
    website: string
    country: string
    locations?: string[]
    partnerTypes: string[]
    customerSegments: string[]
    technologies: string[]
    services?: string[]
    vendorPartnerships?: string[]
    certifications?: string[]
    industries?: string[]
    researchStatus: string
    researchConfidence?: number
    fitScore: number
    description: string
  }
  qualification: {
    status: string
    score: number
    reasons: string[]
    concerns: string[]
  }
  evidenceUrls: string[]
}

type Report = {
  candidatesDiscovered: number
  candidatesResearched: number
  finalRankedCandidates: Candidate[]
  searchQueries: string[]
  skippedResults: string[]
}

type Tab = 'best' | 'all' | 'saved'

const NON_COMPANY_PATTERNS: Array<[RegExp, string]> = [
  [/\bBSI\b|bundesregierung|bundesamt für sicherheit|verfassungsschutz/i, 'Government body'],
  [/\bHDI\b|securance|insurance|versicherung/i, 'Insurer'],
  [/research institute|research organization|universit|fraunhofer|institut/i, 'Research organization'],
  [/cloudtango|cybersecurityintelligence|directory|aggregator|marketplace|listing/i, 'Directory / aggregator'],
]

function cleanDisplayName(item: Candidate) {
  const raw = item.candidate.companyName?.trim()
  const generic = !raw || /^(startseite|home|homepage|our|medien|cybersecurity in germany|managed detection ?&? ?response|services|about|contact)$/i.test(raw)
  if (!generic) return raw

  try {
    const hostname = new URL(item.candidate.website).hostname.replace(/^www\./i, '')
    const label = hostname.split('.')[0]
    return label ? label.toUpperCase() : 'Unknown company'
  } catch {
    return raw || 'Unknown company'
  }
}

function companyFlag(item: Candidate) {
  const text = [item.candidate.companyName, item.candidate.website, item.candidate.description, ...item.candidate.industries || []].join(' ')
  for (const [pattern, reason] of NON_COMPANY_PATTERNS) if (pattern.test(text)) return reason
  return null
}

function isLowEvidence(item: Candidate) {
  const status = item.candidate.researchStatus.toLowerCase()
  const trust = Math.round((item.candidate.researchConfidence || 0) * 100)
  return (item.candidate.fitScore <= 0 && item.qualification.score <= 0) || (trust === 0 && (status === 'failed' || status === 'unknown'))
}

function hasEvidence(item: Candidate) {
  const trust = Math.round((item.candidate.researchConfidence || 0) * 100)
  return item.evidenceUrls.length > 0 && !isLowEvidence(item) && (item.candidate.fitScore > 0 || item.qualification.score > 0 || trust > 0)
}

function sortCandidates(items: Candidate[]) {
  return [...items].sort((a, b) => {
    const aFlag = companyFlag(a) ? 1 : 0
    const bFlag = companyFlag(b) ? 1 : 0
    const aLow = isLowEvidence(a) ? 1 : 0
    const bLow = isLowEvidence(b) ? 1 : 0
    return aFlag - bFlag || aLow - bLow || (b.qualification.score + b.candidate.fitScore) - (a.qualification.score + a.candidate.fitScore)
  })
}

export default function DiscoveryPage() {
  const [objective, setObjective] = useState('')
  const [country, setCountry] = useState('Germany')
  const [technology, setTechnology] = useState('Cybersecurity')
  const [partnerTypes, setPartnerTypes] = useState('MSSP')
  const [customerSegment, setCustomerSegment] = useState('Mid-market')
  const [count, setCount] = useState('100')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [missionId, setMissionId] = useState<string | null>(null)
  const [missionStage, setMissionStage] = useState('defined')
  const [promoted, setPromoted] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<Tab>('best')
  const [expandedLowEvidence, setExpandedLowEvidence] = useState(false)
  const [savedOnly, setSavedOnly] = useState(false)

  async function runDiscovery(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setReport(null)
    setMissionId(null)
    setMissionStage('defined')
    setTab('best')
    try {
      const missionObjective = objective.trim() || 'Find qualified ' + partnerTypes + ' partners for ' + technology + ' in ' + country + (customerSegment ? ' serving ' + customerSegment : '') + '.'
      const missionResponse = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: missionObjective,
          country,
          technologyFocus: technology,
          partnerTypes: partnerTypes.split(',').map((value) => value.trim()).filter(Boolean),
          customerSegment: customerSegment || undefined,
        }),
      })
      const missionPayload = await missionResponse.json()
      if (!missionResponse.ok) throw new Error(missionPayload.error || 'Could not create mission.')
      const createdMissionId = missionPayload.mission?.id as string
      setMissionId(createdMissionId)
      setMissionStage('discovering')

      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          technologyFocus: technology,
          partnerTypes: partnerTypes.split(',').map((value) => value.trim()).filter(Boolean),
          customerSegment: customerSegment || undefined,
          desiredCandidateCount: Number(count),
          missionId: createdMissionId,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Discovery failed.')
      setReport(payload.report as Report)
      setMissionStage(payload.missionStage || 'scored')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Discovery failed.')
    } finally {
      setLoading(false)
    }
  }

  async function promote(candidateId: string | null) {
    if (!candidateId) return
    setPromoting(candidateId)
    setError('')
    try {
      const response = await fetch('/api/discovery/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not save partner.')
      setPromoted((current) => ({ ...current, [candidateId]: true }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save partner.')
    } finally {
      setPromoting(null)
    }
  }

  const allCandidates = useMemo(() => sortCandidates(report?.finalRankedCandidates || []), [report])
  const bestMatches = useMemo(() => allCandidates.filter((item) => {
    const status = item.qualification.status.toLowerCase()
    return !companyFlag(item) && hasEvidence(item) && (status === 'qualified' || status === 'needs_review')
  }), [allCandidates])
  const lowEvidence = useMemo(() => allCandidates.filter(isLowEvidence), [allCandidates])
  const nonCompany = useMemo(() => allCandidates.filter((item) => !!companyFlag(item) && !isLowEvidence(item)), [allCandidates])
  const savedCandidates = useMemo(() => allCandidates.filter((item) => !!item.candidateId && promoted[item.candidateId]), [allCandidates, promoted])

  const visibleCandidates = useMemo(() => {
    if (tab === 'best') return bestMatches
    if (tab === 'saved') return savedCandidates
    return allCandidates
  }, [allCandidates, bestMatches, savedCandidates, tab])

  const displayedCandidates = visibleCandidates.slice(0, Number(count))

  return (
    <AppShell title="Ecosystem discovery" subtitle="Discover, research, verify and rank channel partners with evidence before adding them to the shared network.">
      <div className="mx-auto max-w-7xl px-0 py-0">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/app" className="text-sm text-blue-700 hover:text-blue-800">← Workspace overview</Link>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Discover the ecosystem</h1>
            <p className="mt-2 max-w-3xl text-slate-600">Start with what you need in normal language, then add filters if you want more control. PortAi searches broadly, researches candidates, explains the fit and keeps evidence visible.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm">
            <span className="font-medium text-slate-900">Mission</span>{missionId ? ` · ${missionId.slice(0, 8)}` : ' · ready'}
            <span className="ml-2 text-blue-700">{missionStage.replaceAll('_', ' ')}</span>
          </div>
        </div>

        <form onSubmit={runDiscovery} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium text-slate-900">What are you trying to find?</span>
            <textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={2} placeholder="Example: Find cybersecurity MSPs in Germany that serve mid-market customers and could sell a backup solution." className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            <span className="mt-1 block text-xs text-slate-500">Use plain language. The filters below can narrow the search without replacing your objective.</span>
          </label>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Field label="Country" value={country} onChange={setCountry} />
            <Field label="Technology" value={technology} onChange={setTechnology} />
            <Field label="Partner types" value={partnerTypes} onChange={setPartnerTypes} placeholder="MSSP, MSP, Reseller" />
            <Field label="Customer segment" value={customerSegment} onChange={setCustomerSegment} />
            <label className="text-sm text-slate-700">Results
              <select value={count} onChange={(event) => setCount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>Results are sliced client-side from the current discovery response; the discovery engine is unchanged.</p>
            <button disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Discovering & researching...' : 'Run ecosystem discovery'}</button>
          </div>
          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </form>

        {report && (
          <section className="mt-8">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="Companies found" value={report.candidatesDiscovered} />
              <Stat label="Research completed" value={report.candidatesResearched} />
              <Stat label="Ranked results" value={report.finalRankedCandidates.length} />
              <Stat label="Search angles" value={report.searchQueries.length} />
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Discovery results</h2>
                <p className="mt-1 text-sm text-slate-600">Review strong evidence first, inspect the full ranked set when needed, or return to partners you saved during this run.</p>
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {([['best', 'Best matches'], ['all', 'All results'], ['saved', 'Saved']] as Array<[Tab, string]>).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-md px-3 py-2 text-sm font-medium transition ${tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                    {label}
                    <span className="ml-1.5 text-xs text-slate-500">{value === 'best' ? bestMatches.length : value === 'saved' ? savedCandidates.length : allCandidates.length}</span>
                  </button>
                ))}
              </div>
            </div>

            {tab === 'best' && bestMatches.length === 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                No candidates currently meet the Best matches evidence threshold. Open <button type="button" onClick={() => setTab('all')} className="font-semibold underline">All results</button> to inspect the complete discovery output.
              </div>
            )}

            {tab !== 'saved' && lowEvidence.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
                <button type="button" onClick={() => setExpandedLowEvidence((current) => !current)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <span><span className="font-semibold text-slate-900">Low evidence</span><span className="ml-2 text-sm text-slate-500">— {lowEvidence.length} candidates</span><span className="ml-3 rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-sm">Fit 0 / Trust 0 / failed or unknown</span></span>
                  <span className="text-sm font-medium text-blue-700">{expandedLowEvidence ? 'Collapse' : 'Expand'}</span>
                </button>
                {expandedLowEvidence && (
                  <div className="border-t border-slate-200 px-5 py-3">
                    {lowEvidence.map((item, index) => <CompactCandidate key={`low-${item.candidate.website}-${index}`} item={item} index={index} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'all' && nonCompany.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {nonCompany.length} result{nonCompany.length === 1 ? '' : 's'} appear likely to be non-partner entities or directory pages. They remain below company results for transparency.
              </div>
            )}

            <div className="mt-4 space-y-3">
              {displayedCandidates.map((item, index) => <ResultCard key={`${item.candidate.website}-${index}`} item={item} index={index} promoted={promoted} promoting={promoting} onPromote={promote} />)}
              {displayedCandidates.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No results in this tab yet.</div>}
            </div>

            {!!report.skippedResults.length && <details className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-sm font-medium text-slate-700">Search notes ({report.skippedResults.length})</summary><p className="mt-2 text-xs text-slate-500">Duplicates and invalid pages are hidden from the main results so the list stays useful.</p><ul className="mt-3 max-h-72 space-y-1 overflow-auto text-sm text-slate-500">{report.skippedResults.map((item) => <li key={item}>• {item}</li>)}</ul></details>}
          </section>
        )}
      </div>
    </AppShell>
  )
}

function ResultCard({ item, index, promoted, promoting, onPromote }: { item: Candidate; index: number; promoted: Record<string, boolean>; promoting: string | null; onPromote: (id: string | null) => void }) {
  const isPromoted = !!item.candidateId && promoted[item.candidateId]
  const countryValue = item.candidate.country || item.candidate.locations?.[0] || 'Unknown'
  const typeValue = item.candidate.partnerTypes.join(', ') || 'Unknown'
  const technologies = item.candidate.technologies.join(', ') || 'Unknown'
  const confidence = Math.round((item.candidate.researchConfidence || 0) * 100)
  const status = item.qualification.status.replace(/_/g, ' ')
  const flag = companyFlag(item)

  return (
    <article className={`rounded-xl border bg-white p-5 shadow-sm ${flag ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>
            <h3 className="text-lg font-semibold text-slate-900">{cleanDisplayName(item)}</h3>
            {flag && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">Likely not a partner — {flag}</span>}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-600">{status}</span>
            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${item.candidate.researchStatus.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700' : item.candidate.researchStatus.toLowerCase() === 'failed' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{item.candidate.researchStatus}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.candidate.description || 'No verified company description available.'}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Tag value={countryValue} /><Tag value={typeValue} /><Tag value={technologies} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:w-72">
          <Score label="Fit" value={item.candidate.fitScore} />
          <Score label="Match" value={item.qualification.score} />
          <Score label="Trust" value={confidence} suffix="%" />
        </div>
      </div>

      <details className="mt-4 border-t border-slate-200 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-blue-700 hover:text-blue-800">View intelligence & evidence</summary>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Why it matched</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">{(item.qualification.reasons.length ? item.qualification.reasons : ['No additional reason recorded.']).map((reason) => <li key={reason}>• {reason}</li>)}</ul>
            {!!item.qualification.concerns.length && <><h4 className="mt-5 text-sm font-semibold text-slate-900">Needs verification</h4><ul className="mt-2 space-y-2 text-sm text-slate-600">{item.qualification.concerns.map((concern) => <li key={concern}>• {concern}</li>)}</ul></>}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Company intelligence</h4>
            <div className="mt-2 grid gap-2 text-sm">
              <Fact label="Country" value={countryValue} /><Fact label="Partner type" value={typeValue} /><Fact label="Technologies" value={technologies} /><Fact label="Services" value={item.candidate.services?.join(', ') || 'Unknown'} />
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-slate-900">Evidence</h4><span className="text-xs text-slate-500">{item.evidenceUrls.length} source{item.evidenceUrls.length === 1 ? '' : 's'}</span></div>
          <ul className="mt-3 space-y-2 text-sm">{(item.evidenceUrls.length ? item.evidenceUrls : ['No evidence URL recorded.']).map((url) => <li key={url} className="truncate"><a href={url} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800">{url}</a></li>)}</ul>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">Research: {item.candidate.researchStatus} · Evidence confidence: {confidence}%</div>
          <div className="flex items-center gap-3">
            <a href={item.candidate.website} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-slate-900">Visit website</a>
            <button onClick={() => onPromote(item.candidateId)} disabled={!item.candidateId || promoting === item.candidateId || isPromoted} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{isPromoted ? 'Added to network' : promoting === item.candidateId ? 'Saving...' : 'Save partner'}</button>
          </div>
        </div>
      </details>
    </article>
  )
}

function CompactCandidate({ item, index }: { item: Candidate; index: number }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-0"><div className="min-w-0"><span className="font-medium text-slate-700">{index + 1}. {cleanDisplayName(item)}</span><span className="ml-2 text-xs text-slate-500">{item.candidate.researchStatus}</span></div><div className="text-xs text-slate-500">Fit {item.candidate.fitScore} · Trust {Math.round((item.candidate.researchConfidence || 0) * 100)}%</div></div>
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="text-sm text-slate-700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></div> }
function Score({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) { return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center"><p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}{suffix}</p></div> }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-slate-800">{value}</p></div> }
function Tag({ value }: { value: string }) { return <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">{value}</span> }
