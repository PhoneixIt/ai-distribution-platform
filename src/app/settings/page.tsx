'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { ensureWorkspace } from '@/lib/supabase/workspace'

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-300">{value}</p>
    </div>
  )
}

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [plan, setPlan] = useState('starter')
  const [organizationType, setOrganizationType] = useState('')
  const [organizationRoles, setOrganizationRoles] = useState<string[]>([])
  const [autonomy, setAutonomy] = useState('balanced')
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
        setOrganizationType(organization?.organization_type || '')
        setOrganizationRoles(organization?.organization_roles || [])
        setAutonomy(organization?.ai_autonomy_level || 'balanced')
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
        .update({ name: workspace.trim().slice(0, 160) || 'My Workspace', organization_type: organizationType || null, organization_roles: organizationRoles, ai_autonomy_level: autonomy })
        .eq('id', organization.id)
      if (orgError) throw orgError
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save settings.')
    }
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Manage your profile, workspace and connected operating capabilities."
    >
      <div className="grid max-w-3xl gap-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-slate-500">The name shown inside your workspace.</p>
          <label className="mt-5 block text-sm text-slate-300">
            Full name
            <input
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-blue-500"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Workspace</h2>
              <p className="mt-1 text-sm text-slate-500">Your private operating workspace.</p>
            </div>
            <span className="rounded-full border border-blue-900 bg-blue-950/30 px-3 py-1 text-xs text-blue-300 capitalize">
              {plan}
            </span>
          </div>
          <label className="mt-5 block text-sm text-slate-300">
            Workspace name
            <input
              value={workspace}
              maxLength={160}
              onChange={(event) => setWorkspace(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-blue-500"
            />
          </label>
          <button
            onClick={() => void save()}
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
          >
            Save changes
          </button>
          {saved ? <span className="ml-3 text-sm text-emerald-400">Saved</span> : null}
          {error ? <div className="mt-4 text-sm text-red-300">{error}</div> : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold">Business identity</h2>
          <p className="mt-1 text-sm text-slate-500">These choices personalize navigation, terminology, matching and AI context.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">Primary organization type
              <select value={organizationType} onChange={e => setOrganizationType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-blue-500">
                <option value="">Not set</option>{ORGANIZATION_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <div><span className="text-sm text-slate-300">Additional roles</span><div className="mt-2 flex flex-wrap gap-2">{ORGANIZATION_ROLES.filter(item => item.value !== organizationType).map(item => <button key={item.value} type="button" onClick={() => setOrganizationRoles(current => current.includes(item.value) ? current.filter(v => v !== item.value) : [...current, item.value])} className={organizationRoles.includes(item.value) ? 'rounded-full border border-blue-500 bg-blue-600/10 px-3 py-2 text-xs text-blue-200' : 'rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-400'}>{item.label}</button>)}</div></div>
          </div>
          <label className="mt-5 block text-sm text-slate-300">AI autonomy preference
            <select value={autonomy} onChange={e => setAutonomy(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-blue-500">
              <option value="conservative">Conservative</option><option value="balanced">Balanced</option><option value="autonomous">Autonomous</option>
            </select>
          </label>
          <button onClick={() => void save()} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Save identity</button>
          {saved ? <span className="ml-3 text-sm text-emerald-400">Saved</span> : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
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
