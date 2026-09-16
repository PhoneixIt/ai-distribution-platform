'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AppShellProps = { children: React.ReactNode; title?: string; subtitle?: string }

const nav = [
  { href: '/app', label: 'Overview' },
  { href: '/workflow', label: 'Workflow' },
  { href: '/discovery', label: 'AI Discovery' },
  { href: '/partners', label: 'Partners' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/distributors', label: 'Distributors' },
  { href: '/customers', label: 'Customers' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/engagements', label: 'Engagements' },
  { href: '/workforce', label: 'AI Workforce' },
  { href: '/settings', label: 'Settings' },
]

export default function AppShell({ children, title, subtitle }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return
      if (error || !data.user || data.user.is_anonymous) {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/app')}`)
        return
      }
      setEmail(data.user.email ?? data.user.user_metadata?.full_name ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      // Do not treat an initial/null auth event as a signed-out state. The
      // initial session can still be loading while this protected shell mounts.
      if (event === 'SIGNED_OUT') {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/app')}`)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router, pathname])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-white grid place-items-center"><div className="text-sm text-slate-400">Loading workspace…</div></div>

  return <div className="min-h-screen bg-slate-950 text-white">
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(v => !v)} className="rounded-lg border border-slate-800 p-2 text-slate-300 lg:hidden" aria-label="Toggle navigation">☰</button>
          <Link href="/app" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-sm font-black">AI</span><span><span className="block text-sm font-semibold">AI Distribution Platform</span><span className="hidden text-[11px] text-slate-500 sm:block">Channel intelligence workspace</span></span></Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1 sm:flex">
            <button onClick={() => router.back()} className="rounded-lg border border-slate-800 px-2.5 py-2 text-xs text-slate-400 hover:border-slate-700 hover:text-white" aria-label="Go back">← Back</button>
            <button onClick={() => router.forward()} className="rounded-lg border border-slate-800 px-2.5 py-2 text-xs text-slate-400 hover:border-slate-700 hover:text-white" aria-label="Go forward">Forward →</button>
          </div>
          <Link href="/discovery" className="hidden rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500 sm:block">New discovery</Link>
          <div className="hidden max-w-48 truncate text-right text-xs text-slate-400 md:block">{email}</div>
          <button onClick={signOut} className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white">Sign out</button>
        </div>
      </div>
    </header>
    <div className="mx-auto flex max-w-[1500px]">
      <aside className={`${mobileOpen ? 'block' : 'hidden'} fixed inset-y-[61px] left-0 z-30 w-72 border-r border-slate-800 bg-slate-950 px-4 py-5 lg:sticky lg:top-[61px] lg:block lg:h-[calc(100vh-61px)] lg:w-64 lg:shrink-0`}>
        <nav className="space-y-1">{nav.map(item => { const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-600/15 text-blue-300' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>{item.label}</Link> })}</nav>
        <div className="mt-8 rounded-xl border border-blue-900/50 bg-blue-950/20 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Platform flow</p><p className="mt-2 text-sm font-medium">Discover → Verify → Match → Engage</p><p className="mt-2 text-xs leading-5 text-slate-500">Use browser Back/Forward or the workflow links to move between stages without losing your place.</p></div>
        <div className="absolute bottom-4 left-4 right-4 text-[11px] text-slate-600">{title || 'Workspace'}{subtitle ? ` · ${subtitle}` : ''}</div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 top-[61px] z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{(title || subtitle) && <div className="mb-7"><h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{title}</h1>{subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>}</div>}{children}</main>
    </div>
  </div>
}
