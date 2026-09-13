'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

type Candidate = {
  candidate: {
    companyName: string
    website: string
    country: string
    partnerTypes: string[]
    customerSegments: string[]
    technologies: string[]
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
  const [count, setCount] = useState('10')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem('adp-last-discovery')
    if (saved) {
      try {
        setReport(JSON.parse(saved) as Report)
      } catch {
        window.localStorage.removeItem('adp-last-discovery')
      }
    }
  }, [])

  async function runDiscovery(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

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
      window.localStorage.setItem('adp-last-discovery', JSON.stringify(payload.report))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Discovery failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">AI Partner Discovery</h1>
            <p className="mt-2 text-slate-400">
              Search broadly, research candidates, verify evidence, then rank the best matches.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400">
            Exa + evidence layer
          </div>
        </div>

        <form onSubmit={runDiscovery} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm text-slate-300">
              Country
              <input value={country} onChange={(event) => setCountry(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm text-slate-300">
              Technology
              <input value={technology} onChange={(event) => setTechnology(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm text-slate-300">
              Partner types
              <input value={partnerTypes} onChange={(event) => setPartnerTypes(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" placeholder="MSSP, MSP, Reseller" />
            </label>
            <label className="text-sm text-slate-300">
              Customer segment
              <input value={customerSegment} onChange={(event) => setCustomerSegment(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm text-slate-300">
              Results
              <input type="number" min="1" max="25" value={count} onChange={(event) => setCount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500" />
            </label>
          </div>

          <button disabled={loading} className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Researching...' : 'Run AI Discovery'}
          </button>

          {error && <p className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        </form>

        {report && (
          <section className="mt-8">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="Discovered" value={report.candidatesDiscovered} />
              <Stat label="Researched" value={report.candidatesResearched} />
              <Stat label="Returned" value={report.finalRankedCandidates.length} />
              <Stat label="Queries" value={report.searchQueries.length} />
            </div>

            <div className="mt-6 space-y-4">
              {report.finalRankedCandidates.map((item, index) => (
                <article key={`${item.candidate.website}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">#{index + 1}</span>
                        <h2 className="text-xl font-semibold">{item.candidate.companyName}</h2>
                        <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
                          {item.qualification.status.replace('_', ' ')}
                        </span>
                      </div>
                      <a href={item.candidate.website} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-blue-400 hover:text-blue-300">
                        {item.candidate.website}
                      </a>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <Score label="Fit" value={item.candidate.fitScore} />
                      <Score label="Qualification" value={item.qualification.score} />
                      <Score label="Confidence" value={Math.round((item.candidate.researchConfidence || 0) * 100)} />
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-400">{item.candidate.description || 'No verified description available.'}</p>

                  <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
                    <Fact label="Country" value={item.candidate.country || 'Unknown'} />
                    <Fact label="Partner type" value={item.candidate.partnerTypes.join(', ') || 'Unknown'} />
                    <Fact label="Customer segment" value={item.candidate.customerSegments.join(', ') || 'Unknown'} />
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Why it matched</h3>
                      <ul className="mt-2 space-y-1 text-sm text-slate-400">
                        {(item.qualification.reasons.length ? item.qualification.reasons : ['No additional reason recorded.']).map((reason) => <li key={reason}>• {reason}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Evidence</h3>
                      <ul className="mt-2 space-y-1 text-sm text-slate-400">
                        {(item.evidenceUrls.length ? item.evidenceUrls : ['No evidence URL recorded.']).map((url) => (
                          <li key={url} className="truncate"><a href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">{url}</a></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!!report.skippedResults.length && (
              <details className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <summary className="cursor-pointer text-sm font-medium text-slate-300">Skipped or failed results ({report.skippedResults.length})</summary>
                <ul className="mt-3 space-y-1 text-sm text-slate-500">
                  {report.skippedResults.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
}

function Score({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-slate-200">{value}</p></div>
}
