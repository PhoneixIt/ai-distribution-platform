'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import AppShell, { useWorkspaceRole } from '@/components/app-shell'
import { getPartnerSubtypeLabel, type WorkspaceRole } from '@/lib/organization-roles'
import DashboardLoader from './dashboard-loader'

type Stats = { partners: number; vendors: number; distributors: number; customers: number; opportunities: number; matches: number; discoveryRuns: number; qualifiedCandidates: number }
type Recent = { id: string; title: string; status: string; stage: string; estimated_value: number | null }
type DashboardData = { stats: Stats; recent: Recent[] }

const roleCopy: Record<WorkspaceRole, { headline: string; description: string; discoveryLabel: string; example: string }> = {
  vendor: { headline: 'Grow your channel with the right partners.', description: 'Find distributors, qualified delivery partners, and customer opportunities for your products.', discoveryLabel: 'Find channel partners', example: 'Find qualified cybersecurity MSPs in Germany for your product line.' },
  distributor: { headline: 'Connect vendor supply with partner reach.', description: 'Explore relevant vendors, build partner coverage, and move customer demand through one shared workspace.', discoveryLabel: 'Explore vendors', example: 'Find security vendors and delivery partners serving the DACH market.' },
  partner: { headline: 'Find vendors and opportunities that fit your strengths.', description: 'Discover vendors, distributors, customers and opportunities aligned with your capabilities.', discoveryLabel: 'Discover opportunities', example: 'Find cloud and security opportunities aligned with your certifications and services.' },
  customer: { headline: 'Turn technology needs into coordinated action.', description: 'Discover vendors and channel support, compare matches, and coordinate the next steps.', discoveryLabel: 'Explore solutions', example: 'Find suitable providers for a new security or infrastructure requirement.' },
  other: { headline: 'Bring ecosystem work into one place.', description: 'Discover organizations, coordinate missions, and keep AI-assisted work visible to your team.', discoveryLabel: 'Discover the ecosystem', example: 'Start with a business objective and let PortAi organize the work.' },
  unconfigured: { headline: 'Set up your organization workspace.', description: 'Choose an organization role to personalize your workspace and get started.', discoveryLabel: 'Discover the ecosystem', example: 'Start with a business objective and let PortAi organize the work.' },
}

export default function AppDashboard() {
  const [data, setData] = useState<DashboardData>({ stats: { partners: 0, vendors: 0, distributors: 0, customers: 0, opportunities: 0, matches: 0, discoveryRuns: 0, qualifiedCandidates: 0 }, recent: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const handleData = useCallback((nextData: DashboardData) => { setData(nextData); setLoading(false) }, [])
  const handleError = useCallback((message: string) => { setError(message); setLoading(false) }, [])
  const { stats, recent } = data
  const copyProfile = profilePlaceholder
  const openOpportunities = recent.filter(item => !['closed', 'won', 'lost'].includes(item.status.toLowerCase())).length

  return (
    <AppShell title="Ecosystem overview" subtitle="Your role-focused PortAi workspace for finding, connecting and growing through the technology ecosystem.">
      <DashboardLoader onData={handleData} onError={handleError} />
      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6 lg:p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700">{profile.label} workspace</div>
            {profile.partnerRoles.length > 0 && <p className="mt-3 text-xs text-slate-500">Capabilities: {profile.partnerRoles.map(getPartnerSubtypeLabel).join(' · ')}</p>}
            <h2 className="mt-4 text-3xl font-semibold tracking-tight lg:text-4xl">{copy.headline}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/discovery" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">{copy.discoveryLabel}</Link>
              <Link href="/workflow" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-400">Start a mission</Link>
            </div>
            <p className="mt-4 text-xs text-slate-600">{copy.example}</p>
          </div>
          <div className="min-w-[280px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Next best action</p>
            <NextAction profile={profile.primaryType} stats={stats} openOpportunities={openOpportunities} />
          </div>
        </div>
      </section>

      <DashboardStats stats={stats} loading={loading} profile={profile.primaryType} />
      <ProgressStrip stats={stats} />

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <NextActions profile={profile.primaryType} stats={stats} openOpportunities={openOpportunities} />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent opportunities</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{openOpportunities ? `${openOpportunities} open opportunities need attention` : 'No open opportunities yet'}</h2>
          {recent.length ? <div className="mt-4 divide-y divide-slate-200">{recent.slice(0, 4).map(item => <Link href="/opportunities" key={item.id} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"><div><p className="text-sm font-medium text-slate-700">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.stage.replaceAll('_', ' ')} · {item.status}</p></div><span className="text-xs text-blue-700">Review →</span></Link>)}</div> : <Link href="/discovery" className="mt-4 block rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 hover:border-blue-300">Start discovering →</Link>}
        </div>
      </section>
    </AppShell>
  )
}

function NextAction({ profile, stats, openOpportunities }: { profile: WorkspaceRole; stats: DashboardData['stats']; openOpportunities: number }) {
  const action = actionFor(profile, stats, openOpportunities)
  return <div className="mt-3"><p className="text-base font-semibold text-slate-900">{action.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{action.detail}</p><Link href={action.href} className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{action.cta}</Link></div>
}

function actionFor(profile: WorkspaceRole, stats: DashboardData['stats'], openOpportunities: number) {
  if (profile === 'vendor' && stats.partners === 0) return { title: 'Run your first partner discovery', detail: 'Your channel has no saved partners yet.', cta: 'Find partners', href: '/discovery' }
  if (profile === 'distributor' && stats.vendors === 0) return { title: 'Run your first vendor discovery', detail: 'No vendor relationships are in this workspace yet.', cta: 'Find vendors', href: '/discovery' }
  if (profile === 'partner' && stats.vendors === 0) return { title: 'Discover your first vendor', detail: 'Start building the vendor side of your ecosystem.', cta: 'Discover vendors', href: '/discovery' }
  if (profile === 'customer' && stats.vendors === 0) return { title: 'Define your first technology search', detail: 'No vendor options are connected yet.', cta: 'Explore solutions', href: '/discovery' }
  if (openOpportunities > 0) return { title: `${openOpportunities} open opportunit${openOpportunities === 1 ? 'y needs' : 'ies need'} next actions`, detail: 'Review the current pipeline and move the next relationship forward.', cta: 'Review opportunities', href: '/opportunities' }
  if (stats.qualifiedCandidates > 0 && stats.partners === 0) return { title: `${stats.qualifiedCandidates} qualified candidates are ready`, detail: 'Turn discovered candidates into partner relationships.', cta: 'Review discovery', href: '/discovery' }
  return { title: 'Create your next ecosystem objective', detail: 'PortAi can research, match and coordinate the next piece of work.', cta: 'Start a mission', href: '/workflow' }
}

function NextActions({ profile, stats, openOpportunities }: { profile: WorkspaceRole; stats: DashboardData['stats']; openOpportunities: number }) {
  const action = actionFor(profile, stats, openOpportunities)
  const secondary = profile === 'vendor' ? { label: 'Review partner network', href: '/partners', count: stats.partners } : profile === 'distributor' ? { label: 'Review partner activation', href: '/partners', count: stats.partners } : profile === 'partner' ? { label: 'Review customers', href: '/customers', count: stats.customers } : profile === 'customer' ? { label: 'Review solution options', href: '/vendors', count: stats.vendors } : { label: 'Review ecosystem', href: '/partners', count: stats.partners }
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Next best actions</p><h2 className="mt-1 text-lg font-semibold">Work from what exists now</h2><div className="mt-4 space-y-3"><Link href={action.href} className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4"><div><p className="text-sm font-semibold text-blue-900">{action.title}</p><p className="mt-1 text-xs text-blue-800/80">{action.detail}</p></div><span className="text-xs font-semibold text-blue-700">{action.cta} →</span></Link><Link href={secondary.href} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-slate-300"><span className="text-sm font-medium text-slate-700">{secondary.label}</span><span className="text-xs text-slate-500">{secondary.count} records →</span></Link></div></div>
}

function DashboardStats({ stats, loading, profile }: { stats: DashboardData['stats']; loading: boolean; profile: WorkspaceRole }) {
  const metrics = useMemo(() => {
    const dormantSub = stats.partners > 0 ? 'Saved relationships' : 'No saved partners'
    const vendorSub = stats.vendors > 0 ? 'Connected vendors' : 'Needs discovery'
    const distributorSub = stats.distributors > 0 ? 'Connected distributors' : 'Needs discovery'
    return [
      { label: profile === 'customer' ? 'Vendor options' : profile === 'distributor' ? 'Vendor relationships' : 'Vendors', value: stats.vendors, sub: vendorSub, href: '/vendors' },
      { label: profile === 'vendor' ? 'Channel partners' : profile === 'customer' ? 'Service partners' : 'Partners', value: stats.partners, sub: dormantSub, href: '/partners' },
      { label: 'Distributors', value: stats.distributors, sub: distributorSub, href: '/distributors' },
      { label: 'Customers', value: stats.customers, sub: stats.customers ? 'Connected customers' : 'Needs customer discovery', href: '/customers' },
      { label: 'Opportunities', value: stats.opportunities, sub: stats.opportunities ? 'Review open pipeline' : 'No opportunities yet', href: '/opportunities' },
      { label: 'AI matches', value: stats.matches, sub: stats.matches ? 'Matches available' : 'Run matching work', href: '/matches' },
    ]
  }, [profile, stats])
  return <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{metrics.map(item => <Link key={item.label} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '—' : item.value}</p><p className="mt-1 text-[11px] text-slate-500">{item.sub}</p></Link>)}</section>
}

function ProgressStrip({ stats }: { stats: DashboardData['stats'] }) {
  const stages = [
    ['Discover', stats.discoveryRuns > 0, stats.discoveryRuns ? `${stats.discoveryRuns} run${stats.discoveryRuns === 1 ? '' : 's'}` : 'No discovery yet'],
    ['Verify', stats.qualifiedCandidates > 0, stats.qualifiedCandidates ? `${stats.qualifiedCandidates} qualified` : 'No qualified candidates'],
    ['Match', stats.matches > 0, stats.matches ? `${stats.matches} match${stats.matches === 1 ? '' : 'es'}` : 'No matches yet'],
    ['Engage', stats.partners > 0 || stats.opportunities > 0, stats.partners || stats.opportunities ? `${stats.partners} partners · ${stats.opportunities} opps` : 'No relationships yet'],
  ]
  const activeIndex = stages.reduce((last, stage, index) => stage[1] ? index : last, -1)
  return <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workspace progress</p><p className="mt-1 text-sm text-slate-600">Computed from actual discovery, qualification, matching and relationship records.</p></div><span className="text-xs font-semibold text-blue-700">{activeIndex >= 0 ? `${stages[activeIndex][0]} reached` : 'Ready to discover'}</span></div><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{stages.map(([label, done, detail], index) => <div key={`${label}-${index}`} className={`rounded-xl border p-3 ${done ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-900">{label}</span><span className={`h-2 w-2 rounded-full ${done ? 'bg-blue-600' : 'bg-slate-300'}`} /></div><p className="mt-1 text-xs text-slate-500">{detail}</p></div>)}</div></section>
}
