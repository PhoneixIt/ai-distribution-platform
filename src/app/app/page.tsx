'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/app-shell'
import DashboardLoader from './dashboard-loader'
import { ensureWorkspace, ORGANIZATION_TYPES } from '@/lib/supabase/workspace'

type Stats = { partners: number; vendors: number; distributors: number; customers: number; opportunities: number; matches: number }
type Recent = { id: string; title: string; status: string; stage: string; estimated_value: number | null }
type DashboardData = {
  organizationName: string
  primaryRole: string
  roles: string[]
  stats: Stats
  recent: Recent[]
}

type LinkItem = { label: string; copy: string; href: string }
type RoleConfig = {
  label: string
  title: string
  subtitle: string
  hero: string
  heroCopy: string
  links: LinkItem[]
  metrics: Array<{ label: string; key: keyof Stats; href: string }>
  activityLabel: string
}

const roleConfigs: Record<string, RoleConfig> = {
  vendor: {
    label: 'Vendor',
    title: 'Vendor command center',
    subtitle: 'Grow and operate your technology channel from one intelligent workspace.',
    hero: 'Grow your channel with PortAi.',
    heroCopy: 'State the outcome you need. PortAi can discover partners, research markets, connect distributors, prepare recruitment work and keep the channel moving with evidence and approvals visible.',
    links: [
      { label: 'Partners', copy: 'Active, new, dormant and growing channel relationships.', href: '/partners' },
      { label: 'Partner recruitment', copy: 'Discover and qualify new channel organizations.', href: '/discovery' },
      { label: 'Channel pipeline', copy: 'Track opportunities moving through the ecosystem.', href: '/opportunities' },
      { label: 'Products & solutions', copy: 'Connect your portfolio to partners, markets and demand.', href: '/products' },
    ],
    metrics: [
      { label: 'Partners', key: 'partners', href: '/partners' },
      { label: 'Distributors', key: 'distributors', href: '/distributors' },
      { label: 'Pipeline', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
    ],
    activityLabel: 'Channel activity',
  },
  distributor: {
    label: 'Distributor',
    title: 'Distributor command center',
    subtitle: 'Connect vendor supply with downstream partners and market demand.',
    hero: 'Build the right distribution network.',
    heroCopy: 'Find vendors, activate downstream partners, identify market gaps and keep pipeline and partner activity connected to the same ecosystem intelligence.',
    links: [
      { label: 'Vendors', copy: 'Find and manage the technology supply you represent.', href: '/vendors' },
      { label: 'Resellers & partners', copy: 'Build and activate your downstream network.', href: '/partners' },
      { label: 'Customers', copy: 'Connect demand to your vendor and partner network.', href: '/customers' },
      { label: 'Pipeline', copy: 'Move opportunities across vendors, partners and customers.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Partners', key: 'partners', href: '/partners' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Pipeline', key: 'opportunities', href: '/opportunities' },
    ],
    activityLabel: 'Distribution activity',
  },
  reseller: {
    label: 'Reseller',
    title: 'Reseller command center',
    subtitle: 'Connect vendors, solutions, customers and opportunities in one sales workspace.',
    hero: 'Run your technology sales from the ecosystem.',
    heroCopy: 'PortAi connects the vendors you work with, the solutions you sell, your customers and the opportunities that move between them.',
    links: [
      { label: 'Vendors', copy: 'Manage the vendors and programs behind your portfolio.', href: '/vendors' },
      { label: 'Solutions', copy: 'Organize the technology and services you sell.', href: '/products' },
      { label: 'Customers', copy: 'Keep customer demand and relationship context connected.', href: '/customers' },
      { label: 'Opportunities', copy: 'Move qualified demand into commercial work.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
    ],
    activityLabel: 'Sales activity',
  },
  var: {
    label: 'VAR / Solution Provider',
    title: 'VAR command center',
    subtitle: 'Connect vendors, solutions, customer requirements and delivery capability.',
    hero: 'Turn customer requirements into qualified opportunities.',
    heroCopy: 'PortAi keeps your vendor ecosystem, solution portfolio, customer needs and commercial work connected so the next action is visible.',
    links: [
      { label: 'Vendors', copy: 'Manage the technology providers behind your solutions.', href: '/vendors' },
      { label: 'Solutions', copy: 'Connect products and services to delivery capabilities.', href: '/products' },
      { label: 'Customers', copy: 'Capture and understand requirements and buying context.', href: '/customers' },
      { label: 'Opportunities', copy: 'Coordinate projects and commercial progression.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
    ],
    activityLabel: 'Project activity',
  },
  msp: {
    label: 'MSP',
    title: 'MSP command center',
    subtitle: 'Connect technology vendors, managed services, customers and recurring opportunities.',
    hero: 'Operate a connected managed-service ecosystem.',
    heroCopy: 'Find the right vendors and solutions, understand customer needs, manage opportunities and keep recurring relationships in view.',
    links: [
      { label: 'Technology vendors', copy: 'Manage the vendors and technology relationships you depend on.', href: '/vendors' },
      { label: 'Solutions & services', copy: 'Connect solutions to your delivery model.', href: '/products' },
      { label: 'Customers', copy: 'Keep customer requirements and relationship health connected.', href: '/customers' },
      { label: 'Opportunities', copy: 'Move projects, expansions and commercial work forward.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
    ],
    activityLabel: 'Service activity',
  },
  mssp: {
    label: 'MSSP',
    title: 'MSSP command center',
    subtitle: 'Connect security vendors, services, customers and opportunities.',
    hero: 'Operate your security ecosystem from one place.',
    heroCopy: 'Discover security vendors, connect solutions to customer needs and keep partner, opportunity and engagement context together.',
    links: [
      { label: 'Security vendors', copy: 'Manage the vendors and technologies in your stack.', href: '/vendors' },
      { label: 'Solutions & services', copy: 'Connect security capabilities to delivery work.', href: '/products' },
      { label: 'Customers', copy: 'Keep customer security requirements in one context.', href: '/customers' },
      { label: 'Opportunities', copy: 'Coordinate projects, expansions and commercial work.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
    ],
    activityLabel: 'Security activity',
  },
  system_integrator: {
    label: 'System Integrator',
    title: 'System integrator command center',
    subtitle: 'Connect technology ecosystems, projects, customers and delivery capability.',
    hero: 'Turn technology ecosystems into deliverable projects.',
    heroCopy: 'PortAi connects technology relationships, solutions, customer requirements and project opportunities so your team can move from discovery to delivery.',
    links: [
      { label: 'Technology vendors', copy: 'Track vendors and technology relationships behind delivery.', href: '/vendors' },
      { label: 'Solutions', copy: 'Connect products and capabilities to projects.', href: '/products' },
      { label: 'Customers', copy: 'Keep demand and relationship context connected.', href: '/customers' },
      { label: 'Projects & opportunities', copy: 'Move qualified work through the commercial lifecycle.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
    ],
    activityLabel: 'Project activity',
  },
  technology_partner: {
    label: 'Technology Partner',
    title: 'Technology partner command center',
    subtitle: 'Connect integrations, vendors, ecosystem relationships and joint opportunities.',
    hero: 'Turn integrations into ecosystem opportunities.',
    heroCopy: 'Keep technology relationships, solution context, ecosystem discovery and joint commercial opportunities connected.',
    links: [
      { label: 'Relationships', copy: 'Manage the vendors and ecosystem organizations you integrate with.', href: '/relationships' },
      { label: 'Integrations & solutions', copy: 'Connect products, integrations and capabilities.', href: '/products' },
      { label: 'Joint opportunities', copy: 'Move shared opportunities through the ecosystem.', href: '/opportunities' },
      { label: 'Discover ecosystem', copy: 'Find organizations that expand your reach.', href: '/discovery' },
    ],
    metrics: [
      { label: 'Relationships', key: 'partners', href: '/relationships' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
    ],
    activityLabel: 'Ecosystem activity',
  },
  service_provider: {
    label: 'Service Provider',
    title: 'Service provider command center',
    subtitle: 'Connect vendors, services, customers and commercial opportunities.',
    hero: 'Operate services through a connected ecosystem.',
    heroCopy: 'Keep your vendor network, service portfolio, customer requirements and opportunities connected in one operating layer.',
    links: [
      { label: 'Vendors', copy: 'Manage the technology relationships supporting your services.', href: '/vendors' },
      { label: 'Services & solutions', copy: 'Connect capabilities to customer needs.', href: '/products' },
      { label: 'Customers', copy: 'Keep demand and relationship context connected.', href: '/customers' },
      { label: 'Opportunities', copy: 'Move commercial work forward with shared context.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
    ],
    activityLabel: 'Service activity',
  },
  customer: {
    label: 'Customer',
    title: 'Technology sourcing command center',
    subtitle: 'Turn technology requirements into researched, comparable ecosystem options.',
    hero: 'Tell PortAi what you need.',
    heroCopy: 'State the outcome, technology requirement or project. PortAi can research vendors and delivery partners, compare evidence and coordinate the next step.',
    links: [
      { label: 'Find solutions', copy: 'Discover vendors, technologies and delivery options.', href: '/discovery' },
      { label: 'Vendors', copy: 'Explore technology providers connected to your requirements.', href: '/vendors' },
      { label: 'Solutions', copy: 'Review products and solution context.', href: '/products' },
      { label: 'Projects & evaluations', copy: 'Keep evaluations and commercial work moving.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Evaluations', key: 'opportunities', href: '/opportunities' },
      { label: 'Matches', key: 'matches', href: '/matches' },
      { label: 'Solutions', key: 'partners', href: '/products' },
    ],
    activityLabel: 'Evaluation activity',
  },
  other: {
    label: 'Organization',
    title: 'Ecosystem command center',
    subtitle: 'Connect your organization to the technology ecosystem and the work moving through it.',
    hero: 'Start with the outcome.',
    heroCopy: 'Tell PortAi what you need. The workspace adapts as your ecosystem relationships, missions and capabilities become clearer.',
    links: [
      { label: 'Relationships', copy: 'Connect the organizations around your business.', href: '/relationships' },
      { label: 'Discover ecosystem', copy: 'Research companies, capabilities and markets.', href: '/discovery' },
      { label: 'Products & solutions', copy: 'Explore technology supply and capability.', href: '/products' },
      { label: 'Opportunities', copy: 'Track work moving through the ecosystem.', href: '/opportunities' },
    ],
    metrics: [
      { label: 'Partners', key: 'partners', href: '/partners' },
      { label: 'Vendors', key: 'vendors', href: '/vendors' },
      { label: 'Customers', key: 'customers', href: '/customers' },
      { label: 'Opportunities', key: 'opportunities', href: '/opportunities' },
    ],
    activityLabel: 'Ecosystem activity',
  },
}

const roleLabel = (role: string) => ORGANIZATION_TYPES.find(item => item.value === role)?.label || role.replaceAll('_', ' ')

export default function AppDashboard() {
  const [data, setData] = useState<DashboardData>({
    organizationName: 'Workspace',
    primaryRole: 'other',
    roles: [],
    stats: { partners: 0, vendors: 0, distributors: 0, customers: 0, opportunities: 0, matches: 0 },
    recent: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ensureWorkspace().then(({ organization }) => {
      if (organization?.onboarding_status !== 'completed') window.location.replace('/onboarding')
    }).catch(() => {})
  }, [])

  const handleData = (nextData: DashboardData) => { setData(nextData); setLoading(false) }
  const handleError = (message: string) => { setError(message); setLoading(false) }
  const config = roleConfigs[data.primaryRole] || roleConfigs.other
  const additionalRoles = useMemo(() => data.roles.filter(role => role !== data.primaryRole), [data.roles, data.primaryRole])

  return (
    <AppShell title={config.title} subtitle={config.subtitle}>
      <DashboardLoader onData={handleData} onError={handleError} />
      {error && <div className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-blue-900/50 bg-gradient-to-br from-blue-950/50 via-slate-900 to-slate-950 p-6 lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_.9fr] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-900/60 bg-blue-950/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {config.label}
              </span>
              {additionalRoles.length > 0 && <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-300">Also operates as {additionalRoles.map(roleLabel).join(' · ')}</span>}
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight lg:text-4xl">{config.hero}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{config.heroCopy}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/workflow" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">Start a mission</Link>
              <Link href={config.links[0].href} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-600">{config.links[0].label}</Link>
            </div>
            <p className="mt-4 text-xs text-slate-600">Example: “Find 10 qualified cybersecurity MSPs in Germany for a new vendor.”</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {config.links.map(item => (
                <Link key={item.label} href={item.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-blue-900/70 hover:bg-slate-900/80">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.copy}</p>
                </Link>
              ))}
            </div>
            <div className="my-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-slate-600"><span className="h-px flex-1 bg-slate-800" /><span>PortAi operating loop</span><span className="h-px flex-1 bg-slate-800" /></div>
            <div className="rounded-2xl border border-blue-900/50 bg-blue-950/20 p-4 text-center">
              <p className="text-sm font-semibold text-blue-200">Discover → Research → Verify → Match → Engage → Learn</p>
              <p className="mt-1 text-xs text-slate-500">AI handles internal work; people control consequential actions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map(card => (
          <Link key={card.label} href={card.href} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-700 hover:bg-slate-900">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{loading ? '—' : data.stats[card.key]}</p>
            <p className="mt-1 text-[11px] text-slate-600">Open →</p>
          </Link>
        ))}
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Missions</p>
              <h2 className="mt-2 text-xl font-semibold">Work from objectives, not modules.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{config.label} teams can state an outcome and let PortAi determine the research, matching and operational work needed to move it forward.</p>
            </div>
            <Link href="/workflow" className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-blue-500">Open missions</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm font-semibold">Find</p><p className="mt-2 text-xs leading-5 text-slate-500">Research the right organizations, products, markets or capabilities.</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm font-semibold">Connect</p><p className="mt-2 text-xs leading-5 text-slate-500">Match ecosystem supply, capability and demand with evidence.</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm font-semibold">Move</p><p className="mt-2 text-xs leading-5 text-slate-500">Prepare next actions, approvals and follow-up work.</p></div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI workforce</p>
          <h2 className="mt-2 text-xl font-semibold">The work behind your workspace.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Specialized AI capabilities coordinate around the same objective, using the ecosystem model, evidence and your authorization boundaries.</p>
          <Link href="/workforce" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Open AI workforce</Link>
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{config.activityLabel}</p><h2 className="mt-1 text-lg font-semibold">{config.label} opportunities</h2></div>
          <Link href="/opportunities" className="text-sm text-blue-400 hover:text-blue-300">View opportunities →</Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="mt-5 grid gap-4 rounded-2xl border border-dashed border-slate-800 p-8 text-center md:grid-cols-3 md:text-left">
            <div><p className="text-sm font-medium text-slate-300">No opportunities yet</p><p className="mt-1 text-xs leading-5 text-slate-600">PortAi can create or progress opportunities from customer demand, vendor needs and ecosystem matches.</p></div>
            <Link href="/workflow" className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300 hover:border-blue-500">Start a mission →</Link>
            <Link href="/opportunities" className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300 hover:border-blue-500">Open pipeline →</Link>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-800">{data.recent.map(item => <div key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-200">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.stage.replaceAll('_', ' ')} · {item.status}</p></div><span className="text-sm text-slate-400">{item.estimated_value ? '$' + Number(item.estimated_value).toLocaleString() : 'Value not set'}</span></div>)}</div>
        )}
      </section>

      <section className="mt-7 grid gap-3 md:grid-cols-3">
        {[
          ['Evidence first', 'Research and recommendations remain distinguishable so teams can understand why PortAi surfaced a company, match or action.'],
          ['Human control', 'External actions and important commitments stay within the workspace approval boundary.'],
          ['Connected ecosystem', 'Relationships, connected systems and AI research contribute to the same ecosystem context instead of separate silos.'],
        ].map(([title, copy]) => <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></div>)}
      </section>
    </AppShell>
  )
}
