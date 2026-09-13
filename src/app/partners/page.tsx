'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getAuthenticatedClient } from '@/lib/supabase/client'

type Partner = {
  id: string
  name: string
  description: string | null
  website: string | null
  country: string | null
  company_size: string | null
  partner_types: string[] | null
  created_at: string | null
}

function formatPartnerTypes(types: string[] | null) { return types?.length ? types.join(' / ') : 'Channel partner' }
function formatWebsite(website: string) { return website.replace(/^https?:\/\//, '').replace(/\/$/, '') }

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPartners() {
      const { supabase, error: authError } = await getAuthenticatedClient()
      if (authError) {
        setError('We could not establish an anonymous session. Please enable Anonymous sign-ins in Supabase Auth.')
        setLoading(false)
        return
      }
      const { data, error: queryError } = await supabase.from('partners').select('id, name, description, website, country, company_size, partner_types, created_at').order('name', { ascending: true })
      if (queryError) setError('We could not load the partner directory. Please try again.')
      else setPartners(data ?? [])
      setLoading(false)
    }
    void loadPartners()
  }, [])

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return partners
    return partners.filter((partner) => [partner.name, partner.description, partner.website, partner.country, partner.company_size, partner.partner_types?.join(' ')].filter(Boolean).join(' ').toLowerCase().includes(query))
  }, [partners, search])

  return (
    <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div><Link href="/" className="text-sm font-medium text-blue-400 hover:text-blue-300">← Back to dashboard</Link><p className="mt-8 text-sm font-medium text-blue-400">AI Distribution Platform</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Partner Directory</h1><p className="mt-2 max-w-2xl text-slate-400">Discover and inspect channel companies with evidence-backed intelligence.</p></div>
        <div className="flex items-center gap-3"><div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">{loading ? 'Loading partners' : `${partners.length} partners`}</div><Link href="/partners/new" className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium hover:bg-blue-500">+ Add Partner</Link></div>
      </header>

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5"><label htmlFor="partner-search" className="text-sm font-medium text-slate-300">Search partners</label><input id="partner-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, country, type or company size" className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></section>

      {loading && <section className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Loading partner records...</section>}
      {!loading && error && <section className="rounded-xl border border-red-900/60 bg-red-950/20 p-8 text-center"><h2 className="text-lg font-semibold text-red-200">Unable to load partners</h2><p className="mt-2 text-sm text-red-300/80">{error}</p></section>}
      {!loading && !error && partners.length === 0 && <section className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center"><h2 className="text-lg font-semibold">No partners yet</h2><p className="mt-2 text-sm text-slate-400">Run AI Discovery and save a candidate to create your first company profile.</p></section>}
      {!loading && !error && partners.length > 0 && filteredPartners.length === 0 && <section className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center"><h2 className="text-lg font-semibold">No matching partners</h2><p className="mt-2 text-sm text-slate-400">Try a different search.</p></section>}
      {!loading && !error && filteredPartners.length > 0 && <section className="grid gap-4 md:grid-cols-2">{filteredPartners.map((partner) => <Link key={partner.id} href={`/partners/${partner.id}`} className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-blue-800"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{partner.name}</h2><p className="mt-1 text-sm text-blue-400">{formatPartnerTypes(partner.partner_types)}</p></div>{partner.country && <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{partner.country}</span>}</div><p className="mt-5 min-h-12 text-sm leading-6 text-slate-400">{partner.description || 'No partner description available.'}</p><div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 pt-4 text-xs text-slate-500">{partner.company_size && <span>Size: {partner.company_size}</span>}{partner.website && <span className="text-blue-400">{formatWebsite(partner.website)}</span>}<span className="ml-auto text-slate-400">View intelligence →</span></div></Link>)}</section>}
    </div></main>
  )
}
