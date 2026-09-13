'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAuthenticatedClient } from '@/lib/supabase/client'

export default function Home() {
  const [partnerCount, setPartnerCount] = useState<number | null>(null)
  const [distributorCount, setDistributorCount] = useState<number | null>(null)
  const [opportunityCount, setOpportunityCount] = useState<number | null>(null)
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const { supabase, error: authError } = await getAuthenticatedClient()

      if (authError) {
        setLoading(false)
        return
      }

      const [partners, distributors, opportunities, matches] = await Promise.all([
        supabase.from('partners').select('*', { count: 'exact', head: true }),
        supabase.from('distributors').select('*', { count: 'exact', head: true }),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }),
        supabase.from('partner_matches').select('*', { count: 'exact', head: true }),
      ])

      setPartnerCount(partners.count ?? 0)
      setDistributorCount(distributors.count ?? 0)
      setOpportunityCount(opportunities.count ?? 0)
      setMatchCount(matches.count ?? 0)
      setLoading(false)
    }

    loadDashboard()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">AI Distribution Platform</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Channel Dashboard</h1>
            <p className="mt-2 text-slate-400">AI-powered discovery, intelligence and matching across the channel ecosystem.</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">MVP</div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Channel Partners" value={partnerCount} hint="Registered partners" loading={loading} />
          <Metric label="Distributors" value={distributorCount} hint="Distribution network" loading={loading} />
          <Metric label="Opportunities" value={opportunityCount} hint="Channel opportunities" loading={loading} />
          <Metric label="AI Matches" value={matchCount} hint="Partner recommendations" loading={loading} />
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <ActionCard
            number="01"
            title="AI Partner Discovery"
            description="Search the open web broadly, research companies, preserve evidence and rank the strongest channel candidates."
            href="/discovery"
            action="Run Discovery"
          />
          <ActionCard
            number="02"
            title="Partner Directory"
            description="Browse and manage the trusted partner layer used for matching and channel opportunities."
            href="/partners"
            action="Explore Partners"
          />
        </section>

        <section className="mt-6 rounded-xl border border-blue-900/50 bg-blue-950/20 p-6">
          <p className="text-sm font-medium text-blue-400">PLATFORM ENGINE</p>
          <h2 className="mt-2 text-2xl font-semibold">Discovery → Research → Evidence → Qualification → Matching</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            The core platform is being built around evidence-backed channel intelligence instead of unsupported AI guesses. Every important company claim can carry a source, excerpt, confidence and verification status.
          </p>
          <div className="mt-6 grid gap-3 text-sm md:grid-cols-5">
            {['Discovery', 'Research', 'Evidence', 'Qualification', 'Matching'].map((step) => (
              <div key={step} className="rounded-lg border border-slate-800 bg-slate-900 p-4">{step}</div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, hint, loading }: { label: string; value: number | null; hint: string; loading: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{loading ? '...' : value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  )
}

function ActionCard({ number, title, description, href, action }: { number: string; title: string; description: string; href: string; action: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm font-medium text-blue-400">{number}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <Link href={href} className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">{action}</Link>
    </div>
  )
}
