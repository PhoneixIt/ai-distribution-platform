'use client'

import Link from 'next/link'
import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrganizationProfile, type WorkspaceRole } from '@/lib/organization-roles'

type AppShellProps = { children: React.ReactNode; title?: string; subtitle?: string }
type WorkspaceProfile = ReturnType<typeof getOrganizationProfile> & {
  organizationType: string
  organizationRoles: string[]
}
type NavigationItem = { href: string; label: string; icon: string }\ntype WorkspaceStatusResponse = {
  status: 'new' | 'needs_setup' | 'configured'
  workspace: { organization_type: string | null; organization_roles: string[] | null } | null
  error?: string
}

const WorkspaceRoleContext = createContext<WorkspaceProfile | null>(null)

export function useWorkspaceRole() {
  const profile = useContext(WorkspaceRoleContext)
  if (!profile) throw new Error('Workspace role is unavailable outside the application shell.')
  return profile
}

const ecosystemItems = [
  { href: '/partners', label: 'Partners', icon: 'P' },
  { href: '/vendors', label: 'Vendors', icon: 'V' },
  { href: '/distributors', label: 'Distributors', icon: 'D' },
  { href: '/customers', label: 'Customers', icon: 'C' },
  { href: '/products', label: 'Products & solutions', icon: 'S' },
]

const commercialItems = [
  { href: '/opportunities', label: 'Opportunities', icon: 'O' },
  { href: '/engagements', label: 'Engagements', icon: 'E' },
  { href: '/pricing', label: 'Pricing & economics', icon: '$' },
]

const rolePriorities: Record<WorkspaceRole, string[]> = {
  vendor: ['/partners', '/distributors', '/products', '/customers', '/opportunities', '/engagements'],
  distributor: ['/vendors', '/partners', '/customers', '/products', '/opportunities', '/engagements'],
  partner: ['/vendors', '/distributors', '/customers', '/products', '/opportunities', '/engagements'],
  customer: ['/vendors', '/distributors', '/partners', '/products', '/opportunities', '/engagements'],
  other: ['/partners', '/vendors', '/distributors', '/customers', '/products', '/opportunities', '/engagements'],
  unconfigured: ['/partners', '/vendors', '/distributors', '/customers', '/products', '/opportunities', '/engagements'],
}


function getNavigation(profile: WorkspaceProfile) {
  const priority = rolePriorities[profile.primaryType]
  const orderedEcosystem = [...ecosystemItems].sort((left, right) => priority.indexOf(left.href) - priority.indexOf(right.href))
  const orderedCommercial = [...commercialItems].sort((left, right) => priority.indexOf(left.href) - priority.indexOf(right.href))
  const dashboardLabel = profile.primaryType === 'other' ? 'Workspace dashboard' : profile.label + ' dashboard'

  return [
    {
      label: 'Home',
      items: [{ href: '/app', label: dashboardLabel, icon: '⌂' }],
    },
    {
      label: 'Plan & intelligence',
      items: [
        { href: '/workflow', label: 'Missions & workflow', icon: 'M' },
        { href: '/discovery', label: 'Discover ecosystem', icon: '⌕' },
        { href: '/matches', label: 'AI matching', icon: '✦' },
        { href: '/workforce', label: 'AI Workforce', icon: 'AI' },
      ],
    },
    {
      label: 'Ecosystem',
      items: orderedEcosystem,
    },
    {
      label: 'Revenue & relationships',
      items: orderedCommercial,
    },
    {
      label: 'Administration',
      items: [
        { href: '/settings', label: 'Settings', icon: '⚙' },
      ],
    },
  ]
}


export default function AppShell({ children, title, subtitle }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null)
  const [shellError, setShellError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function loadWorkspace() {
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error || !data.user || data.user.is_anonymous) {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/app')}`)
        return
      }

      setEmail(data.user.email ?? data.user.user_metadata?.full_name ?? null)

      try {
        const response = await fetch('/api/onboarding', { cache: 'no-store' })
        const setup = await response.json() as WorkspaceStatusResponse
        if (!mounted) return
        if (response.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(pathname || '/app')}`)
          return
        }
        if (!response.ok) throw new Error(setup.error || 'Could not load your workspace.')
        if (setup.status !== 'configured' || !setup.workspace?.organization_type) {
          router.replace(`/onboarding?next=${encodeURIComponent(pathname || '/app')}`)
          return
        }

        const role = getOrganizationProfile(setup.workspace.organization_type, setup.workspace.organization_roles)
        setProfile({
          ...role,
          organizationType: setup.workspace.organization_type,
          organizationRoles: setup.workspace.organization_roles ?? [],
        })
        setLoading(false)
      } catch (cause) {
        if (!mounted) return
        setShellError(cause instanceof Error ? cause.message : 'Could not load your workspace.')
        setLoading(false)
      }
    }

    void loadWorkspace()
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace(`/login?next=${encodeURIComponent(pathname || '/app')}`)
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

  if (loading || !profile) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 px-5 text-white">
      <div className="max-w-md text-center">
        <div className="text-sm text-slate-400">{shellError ? 'Your workspace could not load.' : 'Loading workspace…'}</div>
        {shellError && <><p className="mt-2 text-xs text-red-300">{shellError}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">Try again</button></>}
      </div>
    </div>
  }

  const groups = getNavigation(profile)
  const effectiveTitle = title === 'Ecosystem overview' ? `${profile.label} workspace` : title

  return (
    <WorkspaceRoleContext.Provider value={profile}>
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(v => !v)} className="rounded-lg border border-slate-800 p-2 text-slate-300 lg:hidden" aria-label="Toggle navigation">☰</button>
              <Link href="/app" className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-sm font-black">P</span>
                <span>
                  <span className="block text-sm font-semibold">PortAi</span>
                  <span className="hidden text-[11px] text-slate-500 sm:block">{profile.label} workspace</span>
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-1 sm:flex">
                <button onClick={() => router.back()} className="rounded-lg border border-slate-800 px-2.5 py-2 text-xs text-slate-400 hover:border-slate-700 hover:text-white" aria-label="Go back">← Back</button>
                <button onClick={() => router.forward()} className="rounded-lg border border-slate-800 px-2.5 py-2 text-xs text-slate-400 hover:border-slate-700 hover:text-white" aria-label="Go forward">Forward →</button>
              </div>
              <Link href="/missions/new" className="hidden rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500 sm:block">Start a mission</Link>
              <div className="hidden max-w-48 truncate text-right text-xs text-slate-400 md:block">{email}</div>
              <button onClick={signOut} className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white">Sign out</button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1500px]">
          <aside className={`${mobileOpen ? 'block' : 'hidden'} fixed inset-y-[61px] left-0 z-30 w-72 border-r border-slate-800 bg-slate-950 px-4 py-5 lg:sticky lg:top-[61px] lg:block lg:h-[calc(100vh-61px)] lg:w-64 lg:shrink-0`}>
            <nav className="space-y-6">
              {groups.map(group => (
                <div key={group.label}>
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{group.label}</p>
                  <div className="mt-2 space-y-1">
                    {group.items.map(item => {
                      const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(`${item.href}/`))
                      return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-600/15 text-blue-300' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-500">{item.icon}</span><span>{item.label}</span></Link>
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-300">One shared AI operating layer</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Missions, AI workforce, discovery, matching, and approvals stay available across every organization workspace.</p>
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-[11px] text-slate-600">{effectiveTitle || 'Workspace'}</div>
          </aside>
          {mobileOpen && <button className="fixed inset-0 top-[61px] z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {(effectiveTitle || subtitle) && (
              <div className="mb-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{effectiveTitle}</h1>
                    {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>}
                  </div>
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </WorkspaceRoleContext.Provider>
  )
}
