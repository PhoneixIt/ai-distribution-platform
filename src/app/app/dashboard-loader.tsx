'use client'

import { useEffect } from 'react'
import { ensureWorkspace } from '@/lib/supabase/workspace'

export default function DashboardLoader({ onData, onError }: { onData: (data: Awaited<ReturnType<typeof loadDashboard>>) => void; onError: (message: string) => void }) {
  useEffect(() => { loadDashboard().then(onData).catch((e) => onError(e instanceof Error ? e.message : 'Could not load your workspace.')) }, [onData, onError])
  return null
}

async function loadDashboard() {
  const { supabase, orgId } = await ensureWorkspace()
  const [partners, vendors, distributors, customers, opportunities, matches] = await Promise.all([
    supabase.from('partners').select('*', { count: 'exact', head: true }),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
    supabase.from('distributors').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('partner_matches').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ])
  const { data: recentData } = await supabase.from('opportunities').select('id,title,status,stage,estimated_value').eq('org_id', orgId).order('created_at', { ascending: false }).limit(6)
  return { stats: { partners: partners.count ?? 0, vendors: vendors.count ?? 0, distributors: distributors.count ?? 0, customers: customers.count ?? 0, opportunities: opportunities.count ?? 0, matches: matches.count ?? 0 }, recent: recentData ?? [] }
}
