'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from './AppNav'

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return

      if (error || !data.user || data.user.is_anonymous) {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/app')}`)
        return
      }

      setCheckingAuth(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/app')}`)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [pathname, router])

  if (checkingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="text-sm text-slate-400">Checking workspace access…</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <AppNav />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
