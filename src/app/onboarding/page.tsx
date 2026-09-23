'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  OAUTH_ONBOARDING_STORAGE_KEY,
  PARTNER_SUBTYPES,
  PRIMARY_ORGANIZATION_TYPES,
  parseOrganizationSelection,
  parsePendingOrganizationSelection,
  type OrganizationSelection,
  type PartnerSubtype,
  type PrimaryOrganizationType,
} from '@/lib/organization-roles'

type WorkspaceSetup = {
  id: string
  name: string
  organization_type: string | null
  organization_roles: string[] | null
  onboarding_status: string | null
}

type SetupResponse = {
  status: 'new' | 'needs_setup' | 'configured'
  workspace: WorkspaceSetup | null
  error?: string
}

const inputClass = 'accent-blue-500'

export default function OnboardingPage() {
  const router = useRouter()
  const [organizationType, setOrganizationType] = useState<PrimaryOrganizationType | ''>('')
  const [partnerRoles, setPartnerRoles] = useState<PartnerSubtype[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submissionInProgress = useRef(false)

  const saveSelection = useCallback(async (selection: OrganizationSelection, showErrors = true) => {
    if (submissionInProgress.current) return
    submissionInProgress.current = true
    setSaving(true)
    if (showErrors) setError('')

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_type: selection.organizationType,
          organization_roles: selection.organizationRoles,
        }),
      })
      const result = await response.json() as SetupResponse
      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent('/onboarding')}`)
        return
      }
      if (!response.ok || result.status !== 'configured') throw new Error(result.error || 'Could not save organization setup.')

      clearPendingSelection()
      router.replace(getSafeNextPath(window.location.search))
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save organization setup.')
      setLoading(false)
    } finally {
      submissionInProgress.current = false
      setSaving(false)
    }
  }, [router])

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const supabase = createClient()
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError || !auth.user || auth.user.is_anonymous) {
          router.replace(`/login?next=${encodeURIComponent('/onboarding')}`)
          return
        }

        const response = await fetch('/api/onboarding', { cache: 'no-store' })
        const setup = await response.json() as SetupResponse
        if (response.status === 401) {
          router.replace(`/login?next=${encodeURIComponent('/onboarding')}`)
          return
        }
        if (!response.ok) throw new Error(setup.error || 'Could not load organization setup.')
        if (!active) return

        if (setup.status === 'configured') {
          clearPendingSelection()
          router.replace(getSafeNextPath(window.location.search))
          return
        }

        const pending = parsePendingOrganizationSelection(sessionStorage.getItem(OAUTH_ONBOARDING_STORAGE_KEY))
        const authMetadata = parseOrganizationSelection({
          organization_type: auth.user.user_metadata?.organization_type,
          organization_roles: auth.user.user_metadata?.organization_roles,
        })

        if (setup.status === 'new' && (pending || authMetadata)) {
          await saveSelection(pending ?? authMetadata!, false)
          return
        }

        const suggestion = setup.status === 'needs_setup' ? authMetadata : pending ?? authMetadata
        if (suggestion) {
          setOrganizationType(suggestion.organizationType)
          setPartnerRoles(suggestion.organizationRoles)
        }
        setLoading(false)
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load organization setup.')
          setLoading(false)
        }
      }
    }

    void load()
    return () => { active = false }
  }, [router, saveSelection])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!organizationType) {
      setError('Choose your organization type to continue.')
      return
    }

    const selection = parseOrganizationSelection({
      organization_type: organizationType,
      organization_roles: organizationType === 'partner' ? partnerRoles : [],
    })
    if (!selection) {
      setError('Choose a valid organization type and partner subtypes.')
      return
    }
    void saveSelection(selection)
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-black">P</span> PortAi
        </Link>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Workspace setup</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">What kind of organization do you represent?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">This helps PortAi shape your workspace. Your team, data, and shared AI operating layer stay together in one platform.</p>

          {loading ? <div role="status" className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">Loading your workspace setup…</div> : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-slate-200">Primary organization type</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRIMARY_ORGANIZATION_TYPES.map(({ value, label, description }) => (
                    <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${organizationType === value ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}>
                      <span className="flex items-start gap-3">
                        <input
                          className={`${inputClass} mt-1`}
                          type="radio"
                          name="organization_type"
                          value={value}
                          checked={organizationType === value}
                          onChange={() => { setOrganizationType(value); if (value !== 'partner') setPartnerRoles([]) }}
                          required
                        />
                        <span><span className="block text-sm font-semibold text-slate-100">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {organizationType === 'partner' && <fieldset className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <legend className="px-1 text-xs font-medium text-slate-300">Partner subtypes <span className="font-normal text-slate-500">(optional; choose any that apply)</span></legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PARTNER_SUBTYPES.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-slate-400">
                      <input
                        type="checkbox"
                        value={value}
                        checked={partnerRoles.includes(value)}
                        onChange={() => setPartnerRoles(current => current.includes(value) ? current.filter(role => role !== value) : [...current, value])}
                        className={inputClass}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>}

              {error && <div role="alert" className="rounded-lg border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>}
              <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">You can use PortAi&apos;s AI workforce, discovery, matching, and approval workflow with any organization type.</p>
                <button type="submit" disabled={saving || !organizationType} className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Saving workspace…' : 'Continue to PortAi'}
                </button>
              </div>
            </form>
          )}

        </section>
      </div>
    </main>
  )
}

function clearPendingSelection() {
  sessionStorage.removeItem(OAUTH_ONBOARDING_STORAGE_KEY)
}

function getSafeNextPath(search: string) {
  const candidate = new URLSearchParams(search).get('next')
  return candidate && candidate.startsWith('/') && !candidate.startsWith('//') && candidate !== '/onboarding' ? candidate : '/app'
}
