'use client'

import { useMemo, useState } from 'react'
import { ButtonPrimary, Card, EmptyState, LoadingSpinner, Badge } from '@/components/ui'
import type { PartnerRecord } from '@/lib/supabase/services'

interface PartnerDirectoryProps {
  initialPartners?: PartnerRecord[]
  loading?: boolean
  error?: string
}

export function PartnerDirectory({ initialPartners = [], loading = false, error }: PartnerDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterType, setFilterType] = useState('')

  const countryOptions = useMemo(() => Array.from(new Set(initialPartners.map(partner => partner.country).filter(Boolean))).sort() as string[], [initialPartners])
  const typeOptions = useMemo(() => Array.from(new Set(initialPartners.flatMap(partner => partner.partner_types || []))).sort(), [initialPartners])

  const filteredPartners = initialPartners.filter((partner) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query || partner.name.toLowerCase().includes(query) || (partner.description?.toLowerCase().includes(query) ?? false)
    const matchesCountry = !filterCountry || partner.country === filterCountry
    const matchesType = !filterType || partner.partner_types.includes(filterType)
    return matchesSearch && matchesCountry && matchesType
  })

  if (error) return <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4"><p className="text-sm text-red-300">{error}</p></div>
  if (loading) return <LoadingSpinner />

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-semibold text-white">Partner network</h1><p className="mt-1 text-sm text-slate-400">{filteredPartners.length} organization{filteredPartners.length !== 1 ? 's' : ''}</p></div>
      <ButtonPrimary href="/partners/new">Add partner</ButtonPrimary>
    </div>
    <Card><div className="space-y-4">
      <input type="text" placeholder="Search by name or description..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <select value={filterCountry} onChange={(event) => setFilterCountry(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"><option value="">All countries</option>{countryOptions.map(country => <option key={country} value={country}>{country}</option>)}</select>
        <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"><option value="">All partner types</option>{typeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select>
      </div>
    </div></Card>
    {filteredPartners.length === 0 ? <EmptyState title="No partners found" description="Try adjusting your search or filters" action={<ButtonPrimary href="/partners/new">Add First Partner</ButtonPrimary>} /> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredPartners.map((partner) => <Card key={partner.id} className="flex flex-col"><h3 className="text-lg font-semibold">{partner.name}</h3>{partner.description && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{partner.description}</p>}<div className="mt-4 flex flex-wrap gap-2">{partner.country && <Badge>{partner.country}</Badge>}{partner.partner_types.slice(0, 2).map((type) => <Badge key={type}>{type}</Badge>)}</div><div className="mt-auto pt-4"><ButtonPrimary href={`/partners/${partner.id}`} className="w-full">View</ButtonPrimary></div></Card>)}
    </div>}
  </div>
}
