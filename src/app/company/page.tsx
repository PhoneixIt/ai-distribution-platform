'use client'

import AppShell, { useWorkspaceRole } from '@/components/app-shell'
import { getPartnerSubtypeLabel } from '@/lib/organization-roles'

export default function CompanyPage() {
  const profile = useWorkspaceRole()
  return (
    <AppShell title="My Company" subtitle="The organization context PortAi uses to personalize missions, discovery, matching and execution.">
      <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Primary perspective</p>
            <h2 className="mt-2 text-2xl font-semibold">{profile.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">This role determines the perspective PortAi uses across the shared ecosystem operating layer.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{profile.primaryType}</span>
        </div>
        {profile.partnerRoles.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Partner capabilities</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.partnerRoles.map(role => <span key={role} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">{getPartnerSubtypeLabel(role)}</span>)}
            </div>
          </div>
        )}
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold">Shared operating layer</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Missions, discovery, matching, AI Workforce and approvals remain shared. Your role changes the objective, terminology and recommended paths—not the underlying PortAi platform.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold">Organization settings</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use Settings for account, workspace and integration configuration. Connected systems remain external systems of record.</p>
        </div>
      </section>
    </AppShell>
  )
}
