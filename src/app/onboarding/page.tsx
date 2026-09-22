'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ensureWorkspace, ORGANIZATION_ROLES, ORGANIZATION_TYPES } from '@/lib/supabase/workspace'

const input = 'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

export default function WorkspaceSetupPage() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState('')
  const [type, setType] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [autonomy, setAutonomy] = useState('balanced')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { organization } = await ensureWorkspace()
        if (!active) return
        setWorkspace(organization?.name || '')
        setType(organization?.organization_type || '')
        setRoles(organization?.organization_roles || [])
        setAutonomy(organization?.ai_autonomy_level || 'balanced')
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load workspace setup.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  function toggleRole(value: string) {
    setRoles(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!workspace.trim() || !type) {
      setError('Choose your organization type and enter a workspace name.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { supabase, organization } = await ensureWorkspace()
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: workspace.trim().slice(0, 160),
          organization_type: type,
          organization_roles: roles,
          onboarding_status: 'completed',
          ai_autonomy_level: autonomy,
        })
        .eq('id', organization.id)
      if (updateError) throw updateError
      router.replace('/app')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save workspace setup.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-950 text-white"><p className="text-sm text-slate-400">Preparing your workspace…</p></main>

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/60 bg-blue-950/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-300"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Workspace setup</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Tell PortAi how your business operates.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">This determines the workspace, terminology, navigation and AI capabilities you see. You can operate in more than one ecosystem role.</p>
        </div>

        <form onSubmit={save} className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold">Business identity</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-300">Workspace / company name<input required maxLength={160} value={workspace} onChange={e => setWorkspace(e.target.value)} className={input} /></label>
              <label className="block text-sm font-medium text-slate-300">Primary organization type<select required value={type} onChange={e => setType(e.target.value)} className={input}><option value="">Select one</option>{ORGANIZATION_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold">Additional roles</h2>
            <p className="mt-1 text-sm text-slate-500">Select other roles your organization genuinely operates. PortAi will use these to connect the right capabilities without changing your primary identity.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ORGANIZATION_ROLES.filter(item => item.value !== type).map(item => {
                const selected = roles.includes(item.value)
                return <button key={item.value} type="button" onClick={() => toggleRole(item.value)} className={selected ? 'rounded-xl border border-blue-500 bg-blue-600/10 p-3 text-left text-sm text-blue-200' : 'rounded-xl border border-slate-800 bg-slate-950 p-3 text-left text-sm text-slate-400 hover:border-slate-600'}>{selected ? '✓ ' : ''}{item.label}</button>
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold">AI operating preference</h2>
            <p className="mt-1 text-sm text-slate-500">This controls how much autonomy PortAi may eventually use for authorized external actions. Internal research and workflow execution remains automatic.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['conservative', 'Conservative', 'Ask before more consequential actions.'],
                ['balanced', 'Balanced', 'Automate internal work; keep meaningful actions controlled.'],
                ['autonomous', 'Autonomous', 'Allow more pre-authorized actions as capabilities mature.'],
              ].map(([value, label, copy]) => <button key={value} type="button" onClick={() => setAutonomy(value)} className={autonomy === value ? 'rounded-xl border border-blue-500 bg-blue-600/10 p-4 text-left' : 'rounded-xl border border-slate-800 bg-slate-950 p-4 text-left'}><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></button>)}
            </div>
          </section>

          {error && <div className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
          <div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? 'Saving…' : 'Enter my workspace →'}</button></div>
        </form>
      </div>
    </main>
  )
}
