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
type WorkspaceStatusResponse = {
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

type NavItem = { href: string; label: string; comingSoon?: boolean }

const sharedNavigation: Array<{ label: string; items: NavItem[] }> = [
  { label: 'Work', items: [
    { href: '/workflow', label: 'Missions' },
    { href: '/discovery', label: 'Discover' },
    { href: '/network', label: 'Network' },
    { href: '/opportunities', label: 'Opportunities' },
  ]},
  { label: 'Intelligence', items: [{ href: '/insights', label: 'Insights' }] },
  { label: 'AI', items: [{ href: '/workforce', label: 'AI Workforce' }] },
  { label: 'Organization', items: [{ href: '/company', label: 'My Company' }, { href: '/settings', label: 'Settings' }] },
]

const roleWorkspace: Record<WorkspaceRole, {
  objective: string
  network: NavItem[]
  primaryEntities: string
}> = {
  vendor: {
    objective: 'Grow My Channel',
    primaryEntities: 'Partners, distributors, customers, products and opportunities',
    network: [
      { href: '/partners', label: 'Partners' },
      { href: '/distributors', label: 'Distributors' },
      { href: '/customers', label: 'Customers' },
      { href: '/products', label: 'Products & solutions' },
      { href: '/opportunities', label: 'Opportunities' },
    ],
  },
  distributor: {
    objective: 'Grow My Ecosystem',
    primaryEntities: 'Vendors, products, partners, customers and opportunities',
    network: [
      { href: '/vendors', label: 'Vendors' },
      { href: '/products', label: 'Products & portfolio' },
      { href: '/partners', label: 'Partners' },
      { href: '/customers', label: 'Customers' },
      { href: '/opportunities', label: 'Opportunities' },
    ],
  },
  partner: {
    objective: 'Grow My Technology Business',
    primaryEntities: 'Vendors, distributors, customers, technologies and opportunities',
    network: [
      { href: '/vendors', label: 'Vendors' },
      { href: '/distributors', label: 'Distributors' },
      { href: '/customers', label: 'Customers' },
      { href: '/products', label: 'Products & solutions' },
      { href: '/opportunities', label: 'Opportunities' },
    ],
  },
  customer: {
    objective: 'Solve My Technology Need',
    primaryEntities: 'Solutions, vendors, distributors, implementation partners and opportunities',
    network: [
      { href: '/products', label: 'Solutions' },
      { href: '/vendors', label: 'Vendors' },
      { href: '/distributors', label: 'Distributors' },
      { href: '/partners', label: 'Implementation partners' },
      { href: '/opportunities', label: 'Opportunities' },
    ],
  },
  other: {
    objective: 'Work with the technology ecosystem',
    primaryEntities: 'Organizations, products and opportunities',
    network: [
      { href: '/vendors', label: 'Organizations' },
      { href: '/products', label: 'Products & solutions' },
      { href: '/opportunities', label: 'Opportunities' },
    ],
  },
  unconfigured: {
    objective: 'Set up your PortAi workspace',
    primaryEntities: 'Ecosystem',
    network: [],
  },
}

function getNavigation(profile: WorkspaceProfile) {
  const config = roleWorkspace[profile.primaryType] ?? roleWorkspace.other
  return [
    { label: 'Workspace', items: [{ href: '/app', label: 'Home' }] },
    { label: 'Work', items: sharedNavigation[0].items },
    { label: 'Network', items: config.network },
    { label: 'Intelligence', items: sharedNavigation[1].items },
    { label: 'AI', items: sharedNavigation[2].items },
    { label: 'Organization', items: sharedNavigation[3].items },
  ]
}

export function getWorkspaceObjective(role: WorkspaceRole) {
  return roleWorkspace[role]?.objective ?? roleWorkspace.other.objective
}

export function getWorkspaceEntities(role: WorkspaceRole) {
  return roleWorkspace[role]?.primaryEntities ?? roleWorkspace.other.primaryEntities
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
    return <div className="grid min-h-screen place-items-center bg-white px-5 text-slate-900">
      <div className="max-w-md text-center">
        <div className="text-sm text-slate-500">{shellError ? 'Your workspace could not load.' : 'Loading workspace…'}</div>
        {shellError && <><p className="mt-2 text-xs text-red-700">{shellError}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">Try again</button></>}
      </div>
    </div>
  }

  const groups = getNavigation(profile)
  const effectiveTitle = title === 'Ecosystem overview' ? `${getWorkspaceObjective(profile.primaryType)}` : title

  return (
    <WorkspaceRoleContext.Provider value={profile}>
      <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(v => !v)} className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden" aria-label="Toggle navigation">☰</button>
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
                <button onClick={() => router.back()} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-900" aria-label="Go back">← Back</button>
                <button onClick={() => router.forward()} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-900" aria-label="Go forward">Forward →</button>
              </div>
              <Link href="/missions/new" className="hidden rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500 sm:block">Start a mission</Link>
              <div className="hidden max-w-48 truncate text-right text-xs text-slate-500 md:block">{email}</div>
              <button onClick={signOut} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900">Sign out</button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1500px]">
          <aside className={`${mobileOpen ? 'block' : 'hidden'} fixed inset-y-[61px] left-0 z-30 w-72 border-r border-slate-200 bg-[#f7f9fc] px-4 py-5 lg:sticky lg:top-[61px] lg:block lg:h-[calc(100vh-61px)] lg:w-64 lg:shrink-0`}>
            <nav className="space-y-6">
              {groups.map(group => (
                <div key={group.label}>
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
                  <div className="mt-2 space-y-1">
                    {group.items.map(item => {
                      const active = !('comingSoon' in item) && (pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href + '/')))
                      if ('comingSoon' in item && item.comingSoon) {
                        return <div key={item.label} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-slate-400">
                          <span>{item.label}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Soon</span>
                        </div>
                      }
                      return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-600/10 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{item.label}</Link>
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-700">One shared AI operating layer</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Missions, discovery, intelligence, AI workforce and approvals are shared across every PortAi workspace.</p>
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-[11px] text-slate-500">{effectiveTitle || 'Workspace'}</div>
          </aside>
          {mobileOpen && <button className="fixed inset-0 top-[61px] z-20 bg-slate-900/10 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {(effectiveTitle || subtitle) && (
              <div className="mb-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{effectiveTitle}</h1>
                    {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
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
