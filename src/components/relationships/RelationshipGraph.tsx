'use client'

import { useMemo, useState } from 'react'
import type { EcosystemRelationship } from '@/lib/supabase/services'

type Props = {
  initialRelationships: EcosystemRelationship[]
  error?: string
}

const lifecycleLabels: Record<string, string> = {
  identified: 'Identified',
  prospect: 'Prospect',
  engaged: 'Engaged',
  qualified: 'Qualified',
  application: 'Application',
  approved: 'Approved',
  onboarding: 'Onboarding',
  enabled: 'Enabled',
  active: 'Active',
  growing: 'Growing',
  at_risk: 'At risk',
  dormant: 'Dormant',
  reactivated: 'Reactivated',
  closed: 'Closed',
}

export function RelationshipGraph({ initialRelationships, error }: Props) {
  const [relationships] = useState(initialRelationships)
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(
    () => filter === 'all' ? relationships : relationships.filter((item) => item.lifecycle_stage === filter),
    [filter, relationships],
  )

  const counts = useMemo(() => ({
    total: relationships.length,
    active: relationships.filter((item) => item.status === 'active').length,
    growing: relationships.filter((item) => item.lifecycle_stage === 'growing').length,
    atRisk: relationships.filter((item) => item.lifecycle_stage === 'at_risk').length,
  }), [relationships])

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-indigo-600">Ecosystem</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Relationships</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Your workspace relationship graph. Relationships connect organizations and ecosystem entities across their commercial lifecycle.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total relationships', counts.total],
          ['Active', counts.active],
          ['Growing', counts.growing],
          ['At risk', counts.atRisk],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Relationship graph</h2>
            <p className="mt-1 text-xs text-slate-500">Tenant-scoped operational relationships, separate from public market intelligence.</p>
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All lifecycle stages</option>
            {Object.entries(lifecycleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium text-slate-900">No workspace relationships yet</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              PortAi will use this graph to connect partners, vendors, distributors, customers and other ecosystem participants as relationships are created.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((relationship) => (
              <div key={relationship.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-900">{relationship.from_entity_type}</p>
                  <p className="truncate text-xs text-slate-500">{relationship.from_entity_id}</p>
                </div>
                <div className="text-center text-xs font-medium text-indigo-600">{relationship.relationship_type}</div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{relationship.to_entity_type}</p>
                  <p className="truncate text-xs text-slate-500">{relationship.to_entity_id}</p>
                </div>
                <div className="text-xs text-slate-500 md:text-right">
                  <div>{lifecycleLabels[relationship.lifecycle_stage] || relationship.lifecycle_stage}</div>
                  <div className="mt-1">{relationship.health_score == null ? 'No health score' : `${relationship.health_score}/100 health`}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
