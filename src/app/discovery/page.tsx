'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

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
  const [country, setCountry] = useState('Germany')
  const [technology, setTechnology] = useState('Cybersecurity')
  const [partnerTypes, setPartnerTypes] = useState('MSSP')
  const [customerSegment, setCustomerSegment] = useState('Mid-market')
  const [count, setCount] = useState('100')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [promoted, setPromoted] = useState<Record<string, boolean>>({})

  async function runDiscovery(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          technologyFocus: technology,
          partnerTypes: partnerTypes.split(',').map((value) => value.trim()).filter(Boolean),
          customerSegment: customerSegment || undefined,
          desiredCandidateCount: Number(count),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Discovery failed.')
      setReport(payload.report as Report)
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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">← Dashboard</Link>
            <h1 className="mt-3 text-3xl font-bold">AI Partner Discovery</h1>
            <p className="mt-2 max-w-3xl text-slate-400">Find relevant companies broadly, verify them with evidence, and rank the best channel opportunities.</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400">Exa + evidence layer</div>
        </div>

        <form onSubmit={runDiscovery} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm text-slate-300">Country<input value={country} onChange={(event) => setCountry(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
            <label className="text-sm text-slate-300">Technology<input value={technology} onChange={(event) => setTechnology(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
            <label className="text-sm text-slate-300">Partner types<input value={partnerTypes} onChange={(event) => setPartnerTypes(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" placeholder="MSSP, MSP, Reseller" /></label>
            <label className="text-sm text-slate-300">Customer segment<input value={customerSegment} onChange={(event) => setCustomerSegment(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" /></label>
            <label className="text-sm text-slate-300">Results
              <select value={count} onChange={(event) => setCount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100 — broadest available</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>“Broadest available” means as many relevant companies as this discovery run can surface, not a claim that every company in the country exists in the results.</p>
            <button disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Discovering & researching...' : 'Run AI Discovery'}</button>
          </div>
          {error && <p className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        </form>

        {report && (
          <section className="mt-8">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="Companies found" value={report.candidatesDiscovered} />
              <Stat label="Research completed" value={report.candidatesResearched} />
              <Stat label="Ranked results" value={report.finalRankedCandidates.length} />
              <Stat label="Search angles" value={report.searchQueries.length} />
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Best matches</h2>
                  <p className="mt-1 text-sm text-slate-400">The strongest candidates are ranked first. Open a result for the evidence and research details.</p>
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
                  <article key={`${item.candidate.website}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">{index + 1}</span>
                          <h3 className="text-lg font-semibold">{item.candidate.companyName}</h3>
                          <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-400">{status}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.candidate.description || 'No verified company description available.'}</p>
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

                    <details className="mt-4 border-t border-slate-800 pt-4">
                      <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300">View intelligence & evidence</summary>
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200">Why it matched</h4>
                          <ul className="mt-2 space-y-2 text-sm text-slate-400">
                            {(item.qualification.reasons.length ? item.qualification.reasons : ['No additional reason recorded.']).map((reason) => <li key={reason}>• {reason}</li>)}
                          </ul>
                          {!!item.qualification.concerns.length && (
                            <>
                              <h4 className="mt-5 text-sm font-semibold text-slate-200">Needs verification</h4>
                              <ul className="mt-2 space-y-2 text-sm text-slate-400">{item.qualification.concerns.map((concern) => <li key={concern}>• {concern}</li>)}</ul>
                            </>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200">Company intelligence</h4>
                          <div className="mt-2 grid gap-2 text-sm">
                            <Fact label="Country" value={countryValue} />
                            <Fact label="Partner type" value={typeValue} />
                            <Fact label="Customer segment" value={segmentValue} />
                            <Fact label="Technologies" value={item.candidate.technologies.join(', ') || 'Unknown'} />
                            <Fact label="Services" value={item.candidate.services?.join(', ') || 'Unknown'} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-200">Evidence</h4>
                          <span className="text-xs text-slate-500">{item.evidenceUrls.length} source{item.evidenceUrls.length === 1 ? '' : 's'}</span>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm">{(item.evidenceUrls.length ? item.evidenceUrls : ['No evidence URL recorded.']).map((url) => <li key={url} className="truncate"><a href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">{url}</a></li>)}</ul>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-500">Research: {item.candidate.researchStatus} · Evidence confidence: {confidence}%</div>
                        <div className="flex items-center gap-3">
                          <a href={item.candidate.website} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-blue-500 hover:text-white">Visit website</a>
                          <button onClick={() => promote(item.candidateId)} disabled={!item.candidateId || promoting === item.candidateId || isPromoted} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                            {isPromoted ? 'Saved to directory' : promoting === item.candidateId ? 'Saving...' : 'Save partner'}
                          </button>
                        </div>
                      </div>
                    </details>
                  </article>
                )
              })}
            </div>

            {!!report.skippedResults.length && <details className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5"><summary className="cursor-pointer text-sm font-medium text-slate-300">Search notes ({report.skippedResults.length})</summary><p className="mt-2 text-xs text-slate-500">Duplicates and invalid pages are hidden from the main results so the list stays useful.</p><ul className="mt-3 max-h-72 space-y-1 overflow-auto text-sm text-slate-500">{report.skippedResults.map((item) => <li key={item}>• {item}</li>)}</ul></details>}
          </section>
        )}
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div> }
function Score({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-center"><p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div> }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-slate-200">{value}</p></div> }
function Tag({ value }: { value: string }) { return <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-400">{value}</span> }
