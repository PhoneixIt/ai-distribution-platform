'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Provider } from '@supabase/supabase-js'
import {
  OAUTH_ONBOARDING_STORAGE_KEY,
  PARTNER_SUBTYPES,
  PRIMARY_ORGANIZATION_TYPES,
  createPendingOrganizationState,
  parseOrganizationSelection,
  type PartnerSubtype,
  type PrimaryOrganizationType,
} from '@/lib/organization-roles'

const socialProviders: Array<{ provider: Provider; label: string; icon: React.ReactNode }> = [
  { provider: 'google', label: 'Google', icon: <GoogleIcon /> },
  { provider: 'azure', label: 'Microsoft', icon: <MicrosoftIcon /> },
  { provider: 'github', label: 'GitHub', icon: <GitHubIcon /> },
  { provider: 'linkedin_oidc', label: 'LinkedIn', icon: <LinkedInIcon /> },
  { provider: 'apple', label: 'Apple', icon: <AppleIcon /> },
]

export default function AuthForm({ mode }: { mode: 'login' | 'signup' | 'forgot' | 'reset' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<Provider | null>(null)
  const [showMoreProviders, setShowMoreProviders] = useState(false)
  const [organizationType, setOrganizationType] = useState<PrimaryOrganizationType | ''>('')
  const [partnerRoles, setPartnerRoles] = useState<PartnerSubtype[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error')
    if (!oauthError) return
    window.history.replaceState({}, document.title, window.location.pathname)
    const timer = window.setTimeout(() => setError(oauthError), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your workspace' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password'
  const description = mode === 'login' ? 'Sign in to your channel intelligence workspace.' : mode === 'signup' ? 'Choose the workspace that fits your organization.' : mode === 'forgot' ? 'We will send a secure reset link to your email.' : 'Set a new password for your account.'

  async function signInWithProvider(provider: Provider) {
    setError('')
    setMessage('')

    if (mode === 'signup' && !organizationType) {
      setError('Select your organization type to continue.')
      return
    }

    setSocialLoading(provider)

    try {
      const supabase = createClient()
      const next = mode === 'signup' ? '/onboarding' : getSafeNextPath(window.location.search)
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      if (mode === 'signup') {
        const selection = parseOrganizationSelection({
          organization_type: organizationType,
          organization_roles: organizationType === 'partner' ? partnerRoles : [],
        })
        if (selection) {
          try {
            sessionStorage.setItem(OAUTH_ONBOARDING_STORAGE_KEY, createPendingOrganizationState(selection))
          } catch {
            // The onboarding screen asks for a role if this short-lived browser state is unavailable.
          }
        }
      }
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === 'azure' ? { scopes: 'email' } : {}),
        },
      })
      if (authError) throw authError
      if (!data.url) throw new Error('Could not start social sign-in.')
      window.location.assign(data.url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start social sign-in.')
      setSocialLoading(null)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try {
      const supabase = createClient()
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
        router.replace(getSafeNextPath(window.location.search)); router.refresh(); return
      }
      if (mode === 'signup') {
        if (!organizationType) throw new Error('Select your organization type to continue.')
        if (password.length < 8) throw new Error('Password must be at least 8 characters.')
        if (password !== confirm) throw new Error('Passwords do not match.')
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              organization_type: organizationType,
              organization_roles: organizationType === 'partner' ? partnerRoles : [],
            },
          },
        })
        if (authError) throw authError
        if (data.session) { router.replace('/onboarding'); router.refresh(); return }
        setMessage('Account created. Check your email to confirm the account, then sign in.')
        return
      }
      if (mode === 'forgot') {
        const redirectTo = `${window.location.origin}/reset-password`
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (authError) throw authError
        setMessage('Reset instructions sent. Check your email.')
        return
      }
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      if (password !== confirm) throw new Error('Passwords do not match.')
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) throw authError
      setMessage('Password updated. You can continue to your workspace.')
      setTimeout(() => router.replace('/app'), 900)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong.') }
    finally { setLoading(false) }
  }

  const showSocial = mode === 'login' || mode === 'signup'
  const enabledProviderKeys = (process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS || 'google')
    .split(',')
    .map(value => value.trim())
    .filter((value): value is Provider => socialProviders.some(item => item.provider === value))
  const enabledProviders = socialProviders.filter(({ provider }) => enabledProviderKeys.includes(provider))
  const primaryProviders = enabledProviders.slice(0, 2)
  const secondaryProviders = enabledProviders.slice(2)

  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10"><div className="w-full">
    <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-black">P</span> PortAi</Link>
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-black/20">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>

      {mode === 'signup' && <fieldset className="mt-6 space-y-3">
        <legend className="text-sm font-medium text-slate-300">What type of organization are you?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRIMARY_ORGANIZATION_TYPES.map(({ value, label, description: roleDescription }) => (
            <label key={value} className={`cursor-pointer rounded-xl border p-3 transition ${organizationType === value ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}>
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 accent-blue-500"
                  type="radio"
                  name="organization_type"
                  form="auth-form"
                  value={value}
                  checked={organizationType === value}
                  onChange={() => { setOrganizationType(value); if (value !== 'partner') setPartnerRoles([]) }}
                  required
                />
                <span><span className="block text-sm font-semibold text-slate-100">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{roleDescription}</span></span>
              </span>
            </label>
          ))}
        </div>
        {organizationType === 'partner' && <fieldset className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <legend className="px-1 text-xs font-medium text-slate-300">Partner subtypes <span className="font-normal text-slate-500">(optional; choose any that apply)</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PARTNER_SUBTYPES.map(({ value, label: subtypeLabel }) => (
              <label key={value} className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  value={value}
                  checked={partnerRoles.includes(value)}
                  onChange={() => setPartnerRoles(current => current.includes(value) ? current.filter(role => role !== value) : [...current, value])}
                  className="accent-blue-500"
                />
                {subtypeLabel}
              </label>
            ))}
          </div>
        </fieldset>}
      </fieldset>}

      {showSocial && <>
        <div className="mt-7 space-y-3">
          {primaryProviders.map(({ provider, label, icon }) => <button key={provider} type="button" disabled={loading || socialLoading !== null} onClick={() => signInWithProvider(provider)} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{socialLoading === provider ? 'Connecting…' : <>{icon}<span>Continue with {label}</span></>}</button>)}
        </div>
        {secondaryProviders.length > 0 && <button type="button" onClick={() => setShowMoreProviders(value => !value)} className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300">{showMoreProviders ? 'Hide other sign-in options' : 'More sign-in options'}</button>}
        {secondaryProviders.length > 0 && showMoreProviders && <div className="mt-3 grid grid-cols-3 gap-3">{secondaryProviders.map(({ provider, label, icon }) => <button key={provider} type="button" disabled={loading || socialLoading !== null} onClick={() => signInWithProvider(provider)} aria-label={`Continue with ${label}`} title={`Continue with ${label}`} className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">{icon}</button>)}</div>}
        <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-slate-600"><span className="h-px flex-1 bg-slate-800" /><span>Or continue with email</span><span className="h-px flex-1 bg-slate-800" /></div>
      </>}

      <form id="auth-form" onSubmit={submit} className="space-y-4">
        {mode === 'signup' && <Field label="Full name"><input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={input} placeholder="Your name" /></Field>}
        {mode !== 'reset' && <Field label="Email"><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="you@company.com" /></Field>}
        {mode !== 'forgot' && mode !== 'reset' && <Field label="Password"><input required type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className={input} placeholder="••••••••" /></Field>}
        {mode === 'reset' && <><Field label="New password"><input required type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={input} placeholder="At least 8 characters" /></Field><Field label="Confirm password"><input required type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={input} placeholder="Repeat your password" /></Field></>}
        {mode === 'signup' && <Field label="Confirm password"><input required type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={input} placeholder="Repeat your password" /></Field>}
        <button disabled={loading || socialLoading !== null} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Working…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>
      </form>
      {error && <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>}
      {message && <div className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3 text-sm text-emerald-300">{message}</div>}
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-slate-500">
        {mode === 'login' ? <><Link href="/signup" className="text-blue-400 hover:text-blue-300">Create account</Link><Link href="/forgot-password" className="hover:text-white">Forgot password?</Link></> : mode === 'signup' ? <Link href="/login" className="text-blue-400 hover:text-blue-300">Already have an account? Sign in</Link> : <Link href="/login" className="text-blue-400 hover:text-blue-300">Back to sign in</Link>}
      </div>
    </div>
    <p className="mt-5 text-center text-xs leading-5 text-slate-600">Your organization role shapes your private workspace. Public company intelligence remains separate from your team&apos;s operating data.</p>
  </div></div></main>
}

const input = 'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-slate-300">{label}{children}</label> }
function getSafeNextPath(search: string) {
  const candidate = new URLSearchParams(search).get('next')
  return candidate && candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/app'
}
function GoogleIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.95h5.23a4.47 4.47 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.92-4.18 2.92-7.22Z"/><path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.35l-3.14-2.43c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.04H3.29v2.5A9.74 9.74 0 0 0 12 21.7Z"/><path fill="#FBBC05" d="M6.53 13.81A5.85 5.85 0 0 1 6.23 12c0-.63.11-1.24.3-1.81v-2.5H3.29A9.73 9.73 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.31l3.24-2.5Z"/><path fill="#EA4335" d="M12 6.15c1.43 0 2.72.49 3.74 1.46l2.8-2.8C16.84 3.25 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.71 5.39l3.24 2.5C7.3 7.87 9.46 6.15 12 6.15Z"/></svg> }
function MicrosoftIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f35325" d="M2 2h9.5v9.5H2z"/><path fill="#81bc06" d="M12.5 2H22v9.5h-9.5z"/><path fill="#05a6f0" d="M2 12.5h9.5V22H2z"/><path fill="#ffba08" d="M12.5 12.5H22V22h-9.5z"/></svg> }
function GitHubIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.17c-3.2.7-3.88-1.36-3.88-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.67 1.25 3.32.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1.12-.29-.51-1.47.11-3.06 0 0 .96-.31 3.16 1.18a10.96 10.96 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.35.77 1.05.77 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg> }
function LinkedInIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.65 3.5a2.15 2.15 0 1 1 0 4.3 2.15 2.15 0 0 1 0-4.3ZM2.75 9h3.8v12h-3.8V9Zm6.1 0h3.64v1.64h.05c.51-.97 1.75-2 3.6-2 3.85 0 4.56 2.53 4.56 5.82V21h-3.8v-5.8c0-1.38-.03-3.15-1.92-3.15-1.92 0-2.22 1.5-2.22 3.05V21h-3.8V9Z"/></svg> }
function AppleIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c0-2.37 1.94-3.51 2.03-3.57a4.36 4.36 0 0 0-3.43-1.85c-1.45-.15-2.83.86-3.57.86-.75 0-1.9-.84-3.12-.82a4.6 4.6 0 0 0-3.86 2.35c-1.67 2.89-.43 7.14 1.18 9.47.8 1.14 1.73 2.42 2.97 2.38 1.2-.05 1.66-.77 3.11-.77 1.45 0 1.86.77 3.13.74 1.3-.02 2.1-1.17 2.89-2.32.9-1.32 1.27-2.59 1.29-2.65-.03-.01-2.49-.95-2.62-3.82Zm-2.34-6.95c.65-.79 1.09-1.89.97-2.99-.94.04-2.08.63-2.76 1.42-.6.69-1.12 1.8-.98 2.86 1.05.08 2.12-.53 2.77-1.29Z"/></svg> }
