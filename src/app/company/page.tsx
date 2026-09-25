'use client'

import AppShell, { getWorkspaceObjective, useWorkspaceRole } from '@/components/app-shell'
import { useEffect, useState } from 'react'

type Workspace = { name?: string; organization_type?: string | null; organization_roles?: string[] | null }

export default function CompanyPage() {
  return <AppShell title="My Company" subtitle="The organization context PortAi uses to understand your ecosystem objectives.">
    <CompanyContent />
  </AppShell>
}

function CompanyContent() {
  const profile = useWorkspaceRole()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  useEffect(() => {
    fetch('/api/onboarding', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => setWorkspace(data?.workspace ?? null)).catch(() => undefined)
  }, [])
  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Organization</p>
      <h2 className="mt-2 text-2xl font-semibold">{workspace?.name ?? 'Your organization'}</h2>
      <p className="mt-2 text-sm text-slate-500">Primary perspective: {getWorkspaceObjective(profile.primaryType)}</p>
    </section>
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Organization type</p><p className="mt-2 font-semibold capitalize">{profile.label}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Partner capabilities</p><p className="mt-2 font-semibold">{profile.partnerRoles.length ? profile.partnerRoles.join(' · ') : 'Not applicable'}</p></div>
    </section>
  </div>
}
