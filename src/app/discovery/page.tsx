'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import AppShell from '@/components/app-shell'
import { parseDiscoveryIntent } from '@/lib/missions/discovery-intent'

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

export default function DiscoveryPage() {
  const [objective, setObjective] = useState('')
  const [country, setCountry] = useState('')
  const [technology, setTechnology] = useState('')
  const [partnerTypes, setPartnerTypes] = useState('')
  const [customerSegment, setCustomerSegment] = useState('')
  const [count, setCount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [missionId, setMissionId] = useState<string | null>(null)
  const [missionInputKey, setMissionInputKey] = useState('')
  const [missionStage, setMissionStage] = useState('defined')
  const [promoted, setPromoted] = useState<Record<string, boolean>>({})

  const parsedIntent = parseDiscoveryIntent(objective)
  const resolvedCountry = country.trim() || parsedIntent.country || ''
  const resolvedTechnology = technology.trim() || parsedIntent.technologyFocus || ''
  const resolvedPartnerTypes = partnerTypes.trim()
    ? partnerTypes.split(',').map((value) => value.trim()).filter(Boolean)
    : parsedIntent.partnerTypes
  const resolvedCustomerSegment = customerSegment.trim() || parsedIntent.customerSegment || ''
  const resolvedCount = Math.min(100, Math.max(1, Number(count) || parsedIntent.desiredCandidateCount || 100))

  async function runDiscovery(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setReport(null)
    const missionObjective = objective.trim() || 'Find qualified ' + resolvedPartnerTypes.join(', ') + ' partners for ' + resolvedTechnology + ' in ' + resolvedCountry + (resolvedCustomerSegment ? ' serving ' + resolvedCustomerSegment : '') + '.'
    if (!resolvedCountry || !resolvedTechnology || !resolvedPartnerTypes.length) {
      setError('Add a target country, technology focus, and partner type, or include them in your objective. PortAi will use these details to search and score candidates.')
      setLoading(false)
      return
    }

    const inputKey = JSON.stringify({ missionObjective, resolvedCountry, resolvedTechnology, resolvedPartnerTypes, resolvedCustomerSegment, resolvedCount })
    try {
      let activeMissionId = missionId && missionInputKey === inputKey ? missionId : null
      if (!activeMissionId) {
        const missionResponse = await fetch('/api/missions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objective: missionObjective,
            country: resolvedCountry,
            technologyFocus: resolvedTechnology,
            partnerTypes: resolvedPartnerTypes,
            customerSegment: resolvedCustomerSegment || undefined,
          }),
        })
        const missionPayload = await missionResponse.json()
        if (!missionResponse.ok) throw new Error(missionPayload.error || 'Could not create mission.')
        activeMissionId = missionPayload.mission?.id as string
        if (!activeMissionId) throw new Error('Mission was created without an ID.')
        setMissionId(activeMissionId)
        setMissionInputKey(inputKey)
        setMissionStage('defined')
      }

      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: missionObjective,
          country: resolvedCountry,
          technologyFocus: resolvedTechnology,
          partnerTypes: resolvedPartnerTypes,
          customerSegment: resolvedCustomerSegment || undefined,
          desiredCandidateCount: resolvedCount,
          missionId: activeMissionId,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        if (payload.missionStage) setMissionStage(payload.missionStage)
        throw new Error(payload.error || 'Discovery failed.')
      }
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

  return (
    <AppShell title="Ecosystem discovery" subtitle="Discover, research, qualify and rank channel partners with evidence before adding them to the shared network.">
      <div className="mx-auto max-w-7xl px-0 py-0">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/app" className="text-sm text-blue-700 hover:text-blue-700">← Workspace overview</Link>
            <h1 className="mt-3 text-3xl font-bold">Discover the ecosystem</h1>
            <p className="mt-2 max-w-3xl text-slate-500">Start with what you need in normal language, then add filters if you want more control. PortAi searches broadly, researches candidates, explains the fit and keeps evidence visible.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Mission</span>{missionId ? ` · ${missionId.slice(0, 8)}` : ' · ready'}
            <span className="ml-2 text-blue-700">{missionStage.replaceAll('_', ' ')}</span>
          </div>
        </div>

        <form onSubmit={runDiscovery} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">What are you trying to find?</span>
            <textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={2} placeholder="Example: Find 20 qualified cybersecurity MSPs in Germany that could sell my product." className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500" />
            <span className="mt-1 block text-xs text-slate-500">PortAi includes this objective in web search and uses recognized details to fill discovery filters. Enter or adjust filters when a detail is missing.</span>
            {(parsedIntent.country || parsedIntent.technologyFocus || parsedIntent.partnerTypes.length || parsedIntent.customerSegment || parsedIntent.desiredCandidateCount) ? <span className="mt-2 block text-xs text-blue-700">Detected: {[parsedIntent.technologyFocus, parsedIntent.partnerTypes.join(', '), parsedIntent.country, parsedIntent.customerSegment, parsedIntent.desiredCandidateCount ? `up to ${parsedIntent.desiredCandidateCount} results` : ''].filter(Boolean).join(' · ')}</span> : null}
          </label>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm text-slate-700">Country<input value={country} onChange={(event) => setCountry(event.target.value)} placeholder={parsedIntent.country || 'e.g. Germany'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500" /></label>
            <label className="text-sm text-slate-700">Technology<input value={technology} onChange={(event) => setTechnology(event.target.value)} placeholder={parsedIntent.technologyFocus || 'e.g. Cybersecurity'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500" /></label>
            <label className="text-sm text-slate-700">Partner types<input value={partnerTypes} onChange={(event) => setPartnerTypes(event.target.value)} placeholder={parsedIntent.partnerTypes.join(', ') || 'MSSP, MSP, Reseller'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500" /></label>
            <label className="text-sm text-slate-700">Customer segment<input value={customerSegment} onChange={(event) => setCustomerSegment(event.target.value)} placeholder={parsedIntent.customerSegment || 'e.g. Mid-market'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500" /></label>
            <label className="text-sm text-slate-700">Results
              <select value={count} onChange={(event) => setCount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500">
                <option value="">Use objective ({parsedIntent.desiredCandidateCount || 100})</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100 — broadest available</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>“Broadest available” means as many relevant companies as this discovery run can surface, not a claim that every company in the country exists in the results.</p>
            <button disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Discovering & researching...' : 'Run ecosystem discovery'}</button>
          </div>
          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </form>

        {report && (
          <section className="mt-8">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="Candidates discovered" value={report.candidatesDiscovered} />
              <Stat label="Research completed" value={report.candidatesResearched} />
              <Stat label="Ranked results" value={report.finalRankedCandidates.length} />
              <Stat label="Search angles" value={report.searchQueries.length} />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Qualified ecosystem candidates</h2>
                  <p className="mt-1 text-sm text-slate-500">Candidates are ranked by current fit signals. Open a result to inspect evidence, gaps and qualification details before adding it to the shared network.</p>
                </div>
                <span className="text-sm text-slate-500">{report.finalRankedCandidates.length} results</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {report.finalRankedCandidates.map((item, index) => {
                const isPromoted = !!item.candidateId && promoted[item.candidateId]
                const countryValue = item.candidate.country || item.candidate.locations?.[0] || 'Unknown'
                const typeValue = item.candidate.partnerTypes.join(', ') || 'Unknown'
                const segmentValue = item.candidate.customerSegments.join(', ') || 'Unknown'
                const confidence = Math.round((item.candidate.researchConfidence || 0) * 100)
                const status = item.qualification.status.replace('_', ' ')

                return (
                  <article key={`${item.candidate.website}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>
                          <h3 className="text-lg font-semibold">{item.candidate.companyName}</h3>
                          <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">{status}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.candidate.description || 'No verified company description available.'}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <Tag value={typeValue} />
                          <Tag value={countryValue} />
                          <Tag value={segmentValue} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 lg:w-72">
                        <Score label="Fit" value={item.candidate.fitScore} />
                        <Score label="Match" value={item.qualification.score} />
                        <Score label="Trust" value={confidence} />
                      </div>
                    </div>

                    <details className="mt-4 border-t border-slate-200 pt-4">
                      <summary className="cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-700">View intelligence & evidence</summary>
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">Why it matched</h4>
                          <ul className="mt-2 space-y-2 text-sm text-slate-500">
                            {(item.qualification.reasons.length ? item.qualification.reasons : ['No additional reason recorded.']).map((reason) => <li key={reason}>• {reason}</li>)}
                          </ul>
                          {!!item.qualification.concerns.length && (
                            <>
                              <h4 className="mt-5 text-sm font-semibold text-slate-800">Needs verification</h4>
                              <ul className="mt-2 space-y-2 text-sm text-slate-500">{item.qualification.concerns.map((concern) => <li key={concern}>• {concern}</li>)}</ul>
                            </>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">Company intelligence</h4>
                          <div className="mt-2 grid gap-2 text-sm">
                            <Fact label="Country" value={countryValue} />
                            <Fact label="Partner type" value={typeValue} />
                            <Fact label="Customer segment" value={segmentValue} />
                            <Fact label="Technologies" value={item.candidate.technologies.join(', ') || 'Unknown'} />
                            <Fact label="Services" value={item.candidate.services?.join(', ') || 'Unknown'} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-800">Evidence</h4>
                          <span className="text-xs text-slate-500">{item.evidenceUrls.length} source{item.evidenceUrls.length === 1 ? '' : 's'}</span>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm">{(item.evidenceUrls.length ? item.evidenceUrls : ['No evidence URL recorded.']).map((url) => <li key={url} className="truncate"><a href={url} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-700">{url}</a></li>)}</ul>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-500">Research: {item.candidate.researchStatus} · Evidence confidence: {confidence}%</div>
                        <div className="flex items-center gap-3">
                          <a href={item.candidate.website} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-slate-900">Visit website</a>
                          <button onClick={() => promote(item.candidateId)} disabled={!item.candidateId || promoting === item.candidateId || isPromoted} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                            {isPromoted ? 'Added to network' : promoting === item.candidateId ? 'Saving...' : 'Add to network'}
                          </button>
                        </div>
                      </div>
                    </details>
                  </article>
                )
              })}
            </div>

            {!!report.skippedResults.length && <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5"><summary className="cursor-pointer text-sm font-medium text-slate-700">Search notes ({report.skippedResults.length})</summary><p className="mt-2 text-xs text-slate-500">Duplicates and invalid pages are hidden from the main results so the list stays useful.</p><ul className="mt-3 max-h-72 space-y-1 overflow-auto text-sm text-slate-500">{report.skippedResults.map((item) => <li key={item}>• {item}</li>)}</ul></details>}
          </section>
        )}
      </div>
    </AppShell>
  )
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div> }
function Score({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center"><p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div> }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-slate-800">{value}</p></div> }
function Tag({ value }: { value: string }) { return <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-500">{value}</span> }

