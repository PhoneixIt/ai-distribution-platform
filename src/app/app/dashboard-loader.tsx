'use client'

import { useEffect } from 'react'
import { ensureWorkspace } from '@/lib/supabase/workspace'

type DashboardData = Awaited<ReturnType<typeof loadDashboard>>

export default function DashboardLoader({ onData, onError }: { onData: (data: DashboardData) => void; onError: (message: string) => void }) {
  useEffect(() => {
    let active = true
    loadDashboard().then(data => { if (active) onData(data) }).catch(error => { if (active) onError(error instanceof Error ? error.message : 'Could not load your workspace.') })
    return () => { active = false }
  }, [onData, onError])
  return null
}

async function loadDashboard() {
  const { supabase, orgId } = await ensureWorkspace()
  const [partners, vendors, distributors, customers, opportunities, matches, discoveryRuns, qualifiedCandidates] = await Promise.all([
    supabase.from('distributor_partners').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('org_vendors').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('org_distributors').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('partner_matches').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('discovery_runs').select('id', { count: 'exact', head: true }),
    supabase.from('discovery_candidates').select('id', { count: 'exact', head: true }).eq('qualification_status', 'qualified'),
  ])
  const results = [['partners', partners.error], ['vendors', vendors.error], ['distributors', distributors.error], ['customers', customers.error], ['opportunities', opportunities.error], ['partner matches', matches.error], ['discovery runs', discoveryRuns.error], ['qualified candidates', qualifiedCandidates.error]] as const
  const failed = results.find(([, error]) => error)
  if (failed?.[1]) throw new Error(`Could not load ${failed[0]}: ${failed[1].message}`)

  const { data: recentData, error: recentError } = await supabase
    .from('opportunities')
    .select('id,title,status,stage,estimated_value')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(6)
  if (recentError) throw new Error(`Could not load recent opportunities: ${recentError.message}`)

  return {
    stats: {
      partners: partners.count ?? 0,
      vendors: vendors.count ?? 0,
      distributors: distributors.count ?? 0,
      customers: customers.count ?? 0,
      opportunities: opportunities.count ?? 0,
      matches: matches.count ?? 0,
      discoveryRuns: discoveryRuns.count ?? 0,
      qualifiedCandidates: qualifiedCandidates.count ?? 0,
    },
    recent: recentData ?? [],
  }
}
