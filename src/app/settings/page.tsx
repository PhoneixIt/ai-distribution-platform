'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { ensureWorkspace } from '@/lib/supabase/workspace'
import { getOrganizationProfile, getPartnerSubtypeLabel } from '@/lib/organization-roles'

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [organizationType, setOrganizationType] = useState<string | null>(null)
  const [organizationRoles, setOrganizationRoles] = useState<string[]>([])
  const [plan, setPlan] = useState('starter')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { user, organization } = await ensureWorkspace()
        if (!active) return
        setName((user.user_metadata?.full_name as string) || '')
        setWorkspace(organization?.name || '')
        setPlan(organization?.plan || 'starter')
        setOrganizationType(organization?.organization_type ?? null)
        setOrganizationRoles(organization?.organization_roles ?? [])
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load settings.')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function save() {
    setSaved(false)
    setError('')
    try {
      const { supabase, organization } = await ensureWorkspace()
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: name.trim().slice(0, 160) },
      })
      if (authError) throw authError
      const { error: orgError } = await supabase
        .from('organizations')
        .update({ name: workspace.trim().slice(0, 160) || 'My Workspace' })
        .eq('id', organization.id)
      if (orgError) throw orgError
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save settings.')
    }
  }

  const organizationProfile = getOrganizationProfile(organizationType, organizationRoles)

  return (
    <AppShell
      title="Settings"
      subtitle="Manage your profile, workspace and connected operating capabilities."
    >
      <div className="grid max-w-3xl gap-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-slate-500">The name shown inside your workspace.</p>
          <label className="mt-5 block text-sm text-slate-700">
            Full name
            <input
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Workspace</h2>
              <p className="mt-1 text-sm text-slate-500">Your private operating workspace.</p>
            </div>
            <span className="rounded-full border border-blue-900 bg-blue-50 px-3 py-1 text-xs text-blue-700 capitalize">
              {plan}
            </span>
          </div>
          <label className="mt-5 block text-sm text-slate-700">
            Workspace name
            <input
              value={workspace}
              maxLength={160}
              onChange={(event) => setWorkspace(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-blue-500"
            />
          </label>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-slate-700">Organization type</h3>
              <span className="rounded-full border border-blue-900 bg-blue-50 px-3 py-1 text-xs text-blue-700">{organizationProfile.label}</span>
              {organizationProfile.partnerRoles.map(role => <span key={role} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">{getPartnerSubtypeLabel(role)}</span>)}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">This role shapes your workspace navigation. Contact a workspace owner to request a role change; existing organization identity and relationships are preserved.</p>
          </div>
          <button
            onClick={() => void save()}
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
          >
            Save changes
          </button>
          {saved ? <span className="ml-3 text-sm text-emerald-700">Saved</span> : null}
          {error ? <div className="mt-4 text-sm text-red-700">{error}</div> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="font-semibold">Operating capabilities</h2>
          <p className="mt-1 text-sm text-slate-500">
            AI actions stay inside explicit approval boundaries. Provider connections are used only when configured for your workspace.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Status label="Human approval controls" value="Active" />
            <Status label="Workspace audit trail" value="Active" />
            <Status label="External action execution" value="Provider required" />
            <Status label="Web discovery" value="Server provider required" />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
