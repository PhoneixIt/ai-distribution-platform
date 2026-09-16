/**
 * Partner Directory component
 * Displays a searchable, filterable list of partners
 */

'use client'

import React, { useState } from 'react'
import {
  ButtonPrimary,
  Card,
  EmptyState,
  LoadingSpinner,
  Badge,
} from '@/components/ui'
import type { PartnerRecord } from '@/lib/supabase/services'

interface PartnerDirectoryProps {
  initialPartners?: PartnerRecord[]
  loading?: boolean
  error?: string
}

export function PartnerDirectory({
  initialPartners = [],
  loading = false,
  error,
}: PartnerDirectoryProps) {
  const [partners, setPartners] = useState<PartnerRecord[]>(initialPartners)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterType, setFilterType] = useState('')

  // Filter partners based on search and filters
  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      !searchQuery ||
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (partner.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    const matchesCountry =
      !filterCountry || partner.country === filterCountry

    const matchesType =
      !filterType ||
      (partner.partner_types?.includes(filterType) ?? false)

    return matchesSearch && matchesCountry && matchesType
  })

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Directory</h1>
          <p className="mt-1 text-slate-400">
            {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <ButtonPrimary href="/partners/new">Add Partner</ButtonPrimary>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Filter by country..."
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Filter by partner type..."
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Partners Grid */}
      {filteredPartners.length === 0 ? (
        <EmptyState
          title="No partners found"
          description="Try adjusting your search or filters"
          action={<ButtonPrimary href="/partners/new">Add First Partner</ButtonPrimary>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPartners.map((partner) => (
            <Card key={partner.id} className="flex flex-col">
              <h3 className="text-lg font-semibold">{partner.name}</h3>

              {partner.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {partner.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {partner.country && (
                  <Badge variant="default">{partner.country}</Badge>
                )}
                {partner.partner_types?.slice(0, 2).map((type) => (
                  <Badge key={type} variant="default">
                    {type}
                  </Badge>
                ))}
              </div>

              <div className="mt-auto flex gap-2 pt-4">
                <ButtonPrimary href={`/partners/${partner.id}`} className="flex-1">
                  View
                </ButtonPrimary>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
