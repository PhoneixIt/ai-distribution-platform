import Link from 'next/link'
import AppShell, { getWorkspaceObjective, useWorkspaceRole } from '@/components/app-shell'

export default function InsightsPage() {
  return <AppShell title="Insights" subtitle="Turn ecosystem intelligence and signals into objectives PortAi can act on.">
    <InsightsContent />
  </AppShell>
}

function InsightsContent() {
  const profile = useWorkspaceRole()
  const focus = profile.primaryType === 'vendor' ? ['Channel gaps','Partner signals','Market expansion','Customer opportunities']
    : profile.primaryType === 'distributor' ? ['Portfolio gaps','Vendor signals','Partner coverage','Ecosystem opportunities']
    : profile.primaryType === 'partner' ? ['Vendor opportunities','Technology signals','Customer needs','Market opportunities']
    : ['Technology needs','Solution signals','Vendor options','Implementation opportunities']
  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{getWorkspaceObjective(profile.primaryType)}</p>
      <h2 className="mt-2 text-xl font-semibold">Intelligence for your next objective</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">PortAi should turn evidence, ecosystem changes and matching signals into recommended work rather than another reporting dashboard.</p>
    </section>
    <section className="grid gap-4 sm:grid-cols-2">
      {focus.map(item => <Link key={item} href="/discovery" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200">
        <p className="font-semibold text-slate-900">{item}</p>
        <p className="mt-1 text-sm text-slate-500">Use discovery and AI matching to investigate this signal.</p>
        <span className="mt-4 inline-flex text-xs font-semibold text-blue-700">Investigate →</span>
      </Link>)}
    </section>
  </div>
}
