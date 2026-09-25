'use client'

import Link from 'next/link'
import AppShell, { useWorkspaceRole } from '@/components/app-shell'

const roleFocus = {
  vendor: ['Distributors', 'Partners', 'Customers', 'Products & solutions'],
  distributor: ['Vendors', 'Partners', 'Customers', 'Products & solutions'],
  partner: ['Vendors', 'Distributors', 'Customers', 'Products & solutions'],
  customer: ['Products & solutions', 'Vendors', 'Distributors', 'Partners'],
  other: ['Vendors', 'Distributors', 'Partners', 'Customers'],
  unconfigured: ['Vendors', 'Distributors', 'Partners', 'Customers'],
} as const

const routes: Record<string, string> = {
  Vendors: '/vendors',
  Distributors: '/distributors',
  Partners: '/partners',
  Customers: '/customers',
  'Products & solutions': '/products',
}

export default function NetworkPage() {
  const profile = useWorkspaceRole()
  const focus = roleFocus[profile.primaryType]
  return (
    <AppShell title={profile.primaryType === 'customer' ? 'Solution network' : 'Ecosystem network'} subtitle="Explore the relationships and capabilities PortAi can use to turn an objective into action.">
      <section className="grid gap-4 lg:grid-cols-2">
        {focus.map((label, index) => (
          <Link key={label} href={routes[label]} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Network {index + 1}</p>
            <h2 className="mt-2 text-xl font-semibold">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {profile.primaryType === 'vendor' && label === 'Partners' ? 'Find and develop the channel relationships that can extend your market reach.' :
               profile.primaryType === 'distributor' && label === 'Vendors' ? 'Discover technology vendors that can strengthen your portfolio and market coverage.' :
               profile.primaryType === 'partner' && label === 'Vendors' ? 'Discover vendors, programs and complementary technologies aligned with your capabilities.' :
               profile.primaryType === 'customer' && label === 'Products & solutions' ? 'Start from a business need and explore technology options.' :
               'Explore this part of the PortAi ecosystem.'}
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-blue-700 group-hover:text-blue-800">Open →</span>
          </Link>
        ))}
      </section>
      <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
        <p className="text-sm font-semibold text-blue-900">The network is not the product database.</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">PortAi uses organizations, products, capabilities, evidence, relationships and market context as ecosystem intelligence that missions can act on.</p>
        <Link href="/missions/new" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Turn an objective into a mission</Link>
      </section>
    </AppShell>
  )
}
