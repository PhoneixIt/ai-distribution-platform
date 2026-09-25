import Link from 'next/link'
import AppShell, { getWorkspaceEntities, getWorkspaceObjective, useWorkspaceRole } from '@/components/app-shell'

export default function NetworkPage() {
  return <AppShell title="Network" subtitle="One ecosystem view of the organizations, technologies and opportunities relevant to your role.">
    <NetworkContent />
  </AppShell>
}

function NetworkContent() {
  const profile = useWorkspaceRole()
  const links = profile.primaryType === 'vendor'
    ? [['Partners','/partners'],['Distributors','/distributors'],['Customers','/customers'],['Products & solutions','/products'],['Opportunities','/opportunities']]
    : profile.primaryType === 'distributor'
    ? [['Vendors','/vendors'],['Products & portfolio','/products'],['Partners','/partners'],['Customers','/customers'],['Opportunities','/opportunities']]
    : profile.primaryType === 'partner'
    ? [['Vendors','/vendors'],['Distributors','/distributors'],['Customers','/customers'],['Products & solutions','/products'],['Opportunities','/opportunities']]
    : [['Solutions','/products'],['Vendors','/vendors'],['Distributors','/distributors'],['Implementation partners','/partners'],['Opportunities','/opportunities']]
  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{getWorkspaceObjective(profile.primaryType)}</p>
      <h2 className="mt-2 text-xl font-semibold">Your ecosystem network</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">PortAi keeps the underlying ecosystem connected while this workspace prioritizes {getWorkspaceEntities(profile.primaryType).toLowerCase()}.</p>
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {links.map(([label,href]) => <Link key={href+label} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
        <p className="text-base font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">Explore this part of your PortAi ecosystem.</p>
        <span className="mt-4 inline-flex text-xs font-semibold text-blue-700">Open →</span>
      </Link>)}
    </section>
  </div>
}
