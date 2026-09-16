'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function finishOAuth() {
      const supabase = createClient()
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const oauthError = params.get('error_description') || params.get('error')
      const next = params.get('next')

      if (oauthError) {
        if (mounted) setError(oauthError)
        return
      }

      if (!code) {
        if (mounted) setError('Authentication callback did not include an authorization code.')
        return
      }

      // This callback intentionally runs in the browser because createBrowserClient
      // stores the PKCE verifier in browser storage. The same browser client must
      // perform the code exchange so Supabase can recover that verifier.
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        if (mounted) setError(exchangeError.message)
        return
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user || user.is_anonymous) {
        if (mounted) setError(userError?.message || 'Authentication succeeded, but no signed-in user was found.')
        return
      }

      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app'
      window.location.replace(safeNext)
    }

    void finishOAuth()
    return () => { mounted = false }
  }, [router])

  return (
    <main className="min-h-screen bg-slate-950 text-white grid place-items-center px-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-sm font-black">AI</div>
        {error ? (
          <>
            <h1 className="mt-5 text-xl font-semibold">Sign-in could not be completed</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{error}</p>
            <button onClick={() => router.replace('/login')} className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Back to sign in</button>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-xl font-semibold">Signing you in…</h1>
            <p className="mt-2 text-sm text-slate-400">Securing your session and opening your workspace.</p>
          </>
        )}
      </div>
    </main>
  )
}
