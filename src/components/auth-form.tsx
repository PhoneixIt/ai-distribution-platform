'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Provider } from '@supabase/supabase-js'

const socialProviders: Array<{ provider: Provider; label: string }> = [
  { provider: 'google', label: 'Google' },
  { provider: 'azure', label: 'Microsoft' },
  { provider: 'github', label: 'GitHub' },
  { provider: 'linkedin_oidc', label: 'LinkedIn' },
  { provider: 'apple', label: 'Apple' },
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

  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your workspace' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password'
  const description = mode === 'login' ? 'Sign in to your channel intelligence workspace.' : mode === 'signup' ? 'Start building your vendor, distributor and partner network.' : mode === 'forgot' ? 'We will send a secure reset link to your email.' : 'Set a new password for your account.'

  async function signInWithProvider(provider: Provider) {
    setError('')
    setMessage('')
    setSocialLoading(provider)

    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/app`
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === 'azure' ? { scopes: 'email' } : {}),
        },
      })
      if (authError) throw authError
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
        router.replace('/app'); router.refresh(); return
      }
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.')
        if (password !== confirm) throw new Error('Passwords do not match.')
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } })
        if (authError) throw authError
        if (data.session) { router.replace('/app'); router.refresh(); return }
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

  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10"><div className="w-full">
    <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-black">AI</span> AI Distribution Platform</Link>
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-black/20">
      <h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>

      {showSocial && <>
        <div className="mt-7 grid grid-cols-2 gap-3">
          {socialProviders.map(({ provider, label }) => <button
            key={provider}
            type="button"
            disabled={loading || socialLoading !== null}
            onClick={() => signInWithProvider(provider)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >{socialLoading === provider ? 'Connecting…' : `Continue with ${label}`}</button>)}
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-slate-800" /><span>OR</span><span className="h-px flex-1 bg-slate-800" /></div>
      </>}

      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && <Field label="Full name"><input required value={name} onChange={e => setName(e.target.value)} className={input} placeholder="Your name" /></Field>}
        {mode !== 'reset' && <Field label="Email"><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="you@company.com" /></Field>}
        {mode !== 'forgot' && mode !== 'reset' && <Field label="Password"><input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={input} placeholder="••••••••" /></Field>}
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
    <p className="mt-5 text-center text-xs leading-5 text-slate-600">Your workspace is created when you first sign in. Public company intelligence remains separate from your private sales workspace.</p>
  </div></div></main>
}

const input = 'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-slate-300">{label}{children}</label> }
