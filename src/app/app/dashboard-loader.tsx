'use client'

import { useEffect } from 'react'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type DashboardData = Awaited<ReturnType<typeof loadDashboard>>

export default function DashboardLoader({
  onData,
  onError,
}: {
  onData: (data: DashboardData) => void
  onError: (message: string) => void
}) {
  useEffect(() => {
    let active = true

    loadDashboard()
      .then((data) => {
        if (active) onData(data)
      })
      .catch((error) => {
        if (active) onError(error instanceof Error ? error.message : 'Could not load your workspace.')
      })

    return () => {
      active = false
    }
  }, [onData, onError])

  return null
}

async function loadDashboard() {
  const { supabase, orgId, organization } = await ensureWorkspace()

  const [partners, vendors, distributors, customers, opportunities, matches] = await Promise.all([
    supabase.from('partners').select('*', { count: 'exact', head: true }),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
    supabase.from('distributors').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('partner_matches').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ])

  const results = [
    ['partners', partners.error],
    ['vendors', vendors.error],
    ['distributors', distributors.error],
    ['customers', customers.error],
    ['opportunities', opportunities.error],
    ['partner matches', matches.error],
  ] as const

  const failed = results.find(([, error]) => error)
  if (failed?.[1]) throw new Error(`Could not load ${failed[0]}: ${failed[1].message}`)

  const { data: recentData, error: recentError } = await supabase
    .from('opportunities')
    .select('id,title,status,stage,estimated_value')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(6)

  if (recentError) throw new Error(`Could not load recent opportunities: ${recentError.message}`)

  const primaryRole = organization?.organization_type || organization?.organization_roles?.[0] || 'other'
  const roles = Array.from(new Set([primaryRole, ...(organization?.organization_roles || [])])).filter(Boolean)

  return {
    organizationName: organization?.name || 'Workspace',
    primaryRole,
    roles,
    stats: {
      partners: partners.count ?? 0,
      vendors: vendors.count ?? 0,
      distributors: distributors.count ?? 0,
      customers: customers.count ?? 0,
      opportunities: opportunities.count ?? 0,
      matches: matches.count ?? 0,
    },
    recent: recentData ?? [],
  }
}
