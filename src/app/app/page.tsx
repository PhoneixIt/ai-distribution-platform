'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import AppShell, { useWorkspaceRole } from '@/components/app-shell'
import { getPartnerSubtypeLabel, type WorkspaceRole } from '@/lib/organization-roles'
import DashboardLoader from './dashboard-loader'

type Stats = { partners: number; vendors: number; distributors: number; customers: number; opportunities: number; matches: number }
type Recent = { id: string; title: string; status: string; stage: string; estimated_value: number | null }
type DashboardData = { stats: Stats; recent: Recent[] }

const nodes = [
  ['Vendors', 'Products & technology', '/vendors'],
  ['Distributors', 'Channel reach', '/distributors'],
  ['Partners', 'Partner network', '/partners'],
  ['Customers', 'Customer demand', '/customers'],
]

export default function AppDashboard() {
  const [data, setData] = useState<DashboardData>({ stats: { partners: 0, vendors: 0, distributors: 0, customers: 0, opportunities: 0, matches: 0 }, recent: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleData = useCallback((nextData: DashboardData) => { setData(nextData); setLoading(false) }, [])
  const handleError = useCallback((message: string) => { setError(message); setLoading(false) }, [])
  const { stats, recent } = data

  return (
    <AppShell title="Ecosystem overview" subtitle="Your role-focused PortAi workspace for finding, connecting and growing through the technology ecosystem.">
      <DashboardLoader onData={handleData} onError={handleError} />
      {error && <div className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}

      <DashboardHero />
      <DashboardStats stats={stats} loading={loading} />

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Missions</p>
              <h2 className="mt-2 text-xl font-semibold">Work from objectives, not modules.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">A mission is the unit of work in PortAi. It can start with supply, demand, a market question or a relationship objective and move through the ecosystem.</p>
            </div>
            <Link href="/workflow" className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-blue-500">Open missions</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ['Find', 'Discover the right companies, products or capabilities.'],
              ['Connect', 'Match supply, channel capability and demand.'],
              ['Move', 'Prepare next actions and keep approved work moving.'],
            ].map(([title, copy]) => <div key={title} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></div>)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI workforce</p>
          <h2 className="mt-2 text-xl font-semibold">AI working behind the scenes.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">PortAi coordinates research, matching, relationships and next actions behind one simple workspace.</p>
          <Link href="/workforce" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Run AI workforce</Link>
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ecosystem activity</p><h2 className="mt-1 text-lg font-semibold">Opportunities moving through the network</h2></div>
          <Link href="/opportunities" className="text-sm text-blue-400 hover:text-blue-300">View opportunities →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="mt-5 grid gap-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center md:grid-cols-3 md:text-left">
            <div><p className="text-sm font-medium text-slate-300">No opportunities yet</p><p className="mt-1 text-xs leading-5 text-slate-600">Opportunities can originate from customer demand, vendor needs or ecosystem matches.</p></div>
            <Link href="/discovery" className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300 hover:border-blue-500">Start discovering →</Link>
            <Link href="/opportunities" className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300 hover:border-blue-500">Create an opportunity →</Link>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-800">{recent.map(item => <div key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-200">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.stage.replaceAll('_', ' ')} · {item.status}</p></div><span className="text-sm text-slate-400">{item.estimated_value ? '$' + Number(item.estimated_value).toLocaleString() : 'Value not set'}</span></div>)}</div>
        )}
      </section>

      <section className="mt-7 grid gap-3 md:grid-cols-3">
        {[
          ['Evidence first', 'Research, facts, gaps and recommendations stay distinguishable so users can understand why a match exists.'],
          ['Human control', 'External actions and important commitments remain subject to the appropriate approval boundary.'],
          ['Network effect', 'Every verified relationship can make future discovery, matching and ecosystem intelligence more useful.'],
        ].map(([title, copy]) => <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></div>)}
      </section>
    </AppShell>
  )
}

const roleCopy: Record<WorkspaceRole, { headline: string; description: string; discoveryLabel: string; example: string }> = {
  vendor: {
    headline: 'Grow your channel with the right partners.',
    description: 'Find distributors, qualified delivery partners, and customer opportunities for your products. Use missions to coordinate discovery, matching, and approved next steps.',
    discoveryLabel: 'Find channel partners',
    example: 'Find qualified cybersecurity MSPs in Germany for your product line.',
  },
  distributor: {
    headline: 'Connect vendor supply with partner reach.',
    description: 'Explore relevant vendors, build partner coverage, and move customer demand through one shared workspace.',
    discoveryLabel: 'Explore vendors',
    example: 'Find security vendors and delivery partners serving the DACH market.',
  },
  partner: {
    headline: 'Find vendor programs and opportunities that fit your strengths.',
    description: 'Use your partner workspace to discover vendors, distributors, and opportunities that match your delivery capabilities.',
    discoveryLabel: 'Discover opportunities',
    example: 'Find cloud and security opportunities aligned with your certifications and services.',
  },
  customer: {
    headline: 'Turn technology needs into coordinated action.',
    description: 'Discover vendors and channel support, then use shared missions to research options, compare matches, and coordinate next steps.',
    discoveryLabel: 'Explore solutions',
    example: 'Compare trusted providers for a new security or infrastructure requirement.',
  },
  other: {
    headline: 'Bring ecosystem work into one place.',
    description: 'Use PortAi to discover organizations, coordinate missions, and keep AI-assisted work visible to your team.',
    discoveryLabel: 'Discover the ecosystem',
    example: 'Start with a business objective and let PortAi organize the work.',
  },
  unconfigured: {
    headline: 'Set up your organization workspace.',
    description: 'Choose an organization role to personalize your workspace and get started.',
    discoveryLabel: 'Discover the ecosystem',
    example: 'Start with a business objective and let PortAi organize the work.',
  },
}

function DashboardHero() {
  const profile = useWorkspaceRole()
  const copy = roleCopy[profile.primaryType]
  const subtypeSummary = profile.partnerRoles.map(getPartnerSubtypeLabel).join(' · ')

  return (
    <section className="rounded-[2rem] border border-blue-900/50 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 p-6 lg:p-8">
      <div className="grid gap-8 xl:grid-cols-[1fr_.9fr] xl:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/60 bg-blue-950/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {profile.label} workspace
          </div>
          {subtypeSummary && <p className="mt-3 text-xs text-slate-500">Partner capabilities: {subtypeSummary}</p>}
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight lg:text-4xl">{copy.headline}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{copy.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/workflow" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Start a mission</Link>
            <Link href="/discovery" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">{copy.discoveryLabel}</Link>
            <Link href="/workforce" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">Open AI Workforce</Link>
          </div>
          <p className="mt-4 text-xs text-slate-600">{copy.example}</p>
        </div>

        <div className="relative rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
          <div className="grid grid-cols-2 gap-3">
            {nodes.map(([title, nodeCopy, href]) => (
              <Link key={title} href={href} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-blue-900/70 hover:bg-slate-900/80">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{nodeCopy}</p>
              </Link>
            ))}
          </div>
          <div className="my-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-slate-600"><span className="h-px flex-1 bg-slate-800" /><span>PortAi ecosystem</span><span className="h-px flex-1 bg-slate-800" /></div>
          <div className="rounded-2xl border border-blue-900/50 bg-blue-950/20 p-4 text-center">
            <p className="text-sm font-semibold text-blue-200">Discover → Research → Verify → Match → Engage</p>
            <p className="mt-1 text-xs text-slate-500">The workspace adapts to your role. The AI operating layer stays shared.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardStats({ stats, loading }: { stats: Stats; loading: boolean }) {
  const profile = useWorkspaceRole()
  const partnerLabel: Record<WorkspaceRole, string> = {
    vendor: 'Partner relationships',
    distributor: 'Channel partners',
    partner: 'Partner relationships',
    customer: 'Service partners',
    other: 'Partner relationships',
    unconfigured: 'Partner relationships',
  }
  const vendorLabel: Record<WorkspaceRole, string> = {
    vendor: 'Vendor connections',
    distributor: 'Vendor relationships',
    partner: 'Vendor relationships',
    customer: 'Vendor options',
    other: 'Vendor relationships',
    unconfigured: 'Vendor relationships',
  }
  const distributorLabel: Record<WorkspaceRole, string> = {
    vendor: 'Distributor relationships',
    distributor: 'Distributor connection',
    partner: 'Distributor relationships',
    customer: 'Distributor options',
    other: 'Distributor relationships',
    unconfigured: 'Distributor relationships',
  }
  const metrics: Array<[string, number, string]> = [
    [partnerLabel[profile.primaryType], stats.partners, '/partners'],
    [vendorLabel[profile.primaryType], stats.vendors, '/vendors'],
    [distributorLabel[profile.primaryType], stats.distributors, '/distributors'],
    ['Customers', stats.customers, '/customers'],
    ['Opportunities', stats.opportunities, '/opportunities'],
    ['Matches', stats.matches, '/matches'],
  ]

  return (
    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {metrics.map(([label, value, href]) => (
        <Link key={label} href={href} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700 hover:bg-slate-900">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{loading ? '—' : value}</p>
          <p className="mt-1 text-[11px] text-slate-600">Open →</p>
        </Link>
      ))}
    </section>
  )
}
