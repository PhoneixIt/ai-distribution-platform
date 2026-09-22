import type { SupabaseClient } from '@supabase/supabase-js'

export type EcosystemConnection = {
  id: string
  org_id: string
  provider: string
  connection_type: string
  display_name: string
  status: 'active' | 'paused' | 'disconnected' | 'error'
  sync_direction: 'inbound' | 'outbound' | 'bidirectional'
  sync_status: 'never' | 'pending' | 'running' | 'completed' | 'partial' | 'failed'
  last_sync_at: string | null
  last_error: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export async function listEcosystemConnections(
  supabase: SupabaseClient,
  orgId: string,
): Promise<EcosystemConnection[]> {
  const { data, error } = await supabase
    .from('ecosystem_connections')
    .select('*')
    .eq('org_id', orgId)
    .order('display_name')

  if (error) throw error
  return (data ?? []) as EcosystemConnection[]
}

export async function createEcosystemConnection(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  input: {
    provider: string
    connection_type?: string
    display_name: string
    sync_direction?: EcosystemConnection['sync_direction']
    metadata?: Record<string, unknown>
  },
): Promise<EcosystemConnection> {
  const { data, error } = await supabase
    .from('ecosystem_connections')
    .insert({
      org_id: orgId,
      provider: input.provider.trim(),
      connection_type: input.connection_type?.trim() || 'api',
      display_name: input.display_name.trim(),
      sync_direction: input.sync_direction || 'inbound',
      metadata: input.metadata || {},
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as EcosystemConnection
}

export async function updateEcosystemConnection(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  updates: Partial<Pick<EcosystemConnection, 'display_name' | 'status' | 'sync_direction' | 'sync_status' | 'last_sync_at' | 'last_error' | 'metadata'>>,
): Promise<EcosystemConnection> {
  const { data, error } = await supabase
    .from('ecosystem_connections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as EcosystemConnection
}
