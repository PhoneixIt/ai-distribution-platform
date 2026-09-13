'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAuthenticatedClient } from '@/lib/supabase/client'

export default function Home() {
  const [partnerCount, setPartnerCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const { supabase, error: authError } = await getAuthenticatedClient()

      if (authError) {
        setPartnerCount(null)
        setLoading(false)
        return
      }

      const { count } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true })

      setPartnerCount(count ?? 0)
      setLoading(false)
    }

    loadDashboard()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-400">
              AI Distribution Platform
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Channel Dashboard
            </h1>
            <p className="mt-2 text-slate-400">
              Connect vendors, distributors and channel partners.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            MVP
          </div>
        </header>

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Channel Partners</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? '...' : partnerCount}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Registered in the platform
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Distributors</p>
            <p className="mt-2 text-3xl font-bold">0</p>
            <p className="mt-2 text-xs text-slate-500">
              Distribution network
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Opportunities</p>
            <p className="mt-2 text-3xl font-bold">0</p>
            <p className="mt-2 text-xs text-slate-500">
              Channel opportunities
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">AI Matches</p>
            <p className="mt-2 text-3xl font-bold">0</p>
            <p className="mt-2 text-xs text-slate-500">
              Partner recommendations
            </p>
          </div>
        </section>

        {/* Main actions */}
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-medium text-blue-400">01</p>
            <h2 className="mt-2 text-xl font-semibold">
              Partner Directory
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Discover resellers, MSPs, SIs and other channel partners by
              geography, technology and capabilities.
            </p>

            <Link
              href="/partners"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Explore Partners
            </Link>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-medium text-blue-400">02</p>
            <h2 className="mt-2 text-xl font-semibold">
              Create Opportunity
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Describe a customer opportunity and let the platform identify
              the most suitable channel partners.
            </p>

            <button className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">
              Create Opportunity
            </button>
          </div>
        </section>

        {/* AI matching */}
        <section className="mt-6 rounded-xl border border-blue-900/50 bg-blue-950/20 p-6">
          <p className="text-sm font-medium text-blue-400">
            AI MATCHING ENGINE
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            Turn opportunities into the right partner
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            The platform will analyze geography, technologies, certifications,
            industries, customer segments and partner capabilities to rank the
            best channel match.
          </p>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              Geography
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              Technologies
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              Capabilities
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              Customer Fit
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
