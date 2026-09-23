import type { SupabaseClient } from '@supabase/supabase-js'

export type EcosystemExternalIdentity = {
  id: string; ecosystem_organization_id: string; connection_id: string; provider: string
  external_record_type: string; external_record_id: string; external_name: string | null; external_domain: string | null
  match_method: string; match_confidence: number | null
  status: 'candidate' | 'confirmed' | 'rejected' | 'stale' | 'disconnected'
  first_seen_at: string; last_seen_at: string; metadata: Record<string, unknown>; created_at: string; updated_at: string
}
export async function listExternalIdentities(supabase: SupabaseClient, connectionId: string) {
  const { data, error } = await supabase.from('ecosystem_external_identities').select('*').eq('connection_id', connectionId).order('external_name')
  if (error) throw error
  return (data ?? []) as EcosystemExternalIdentity[]
}
export async function findExternalIdentity(supabase: SupabaseClient, connectionId: string, externalRecordType: string, externalRecordId: string) {
  const { data, error } = await supabase.from('ecosystem_external_identities').select('*').eq('connection_id', connectionId).eq('external_record_type', externalRecordType).eq('external_record_id', externalRecordId).maybeSingle()
  if (error) throw error
  return data as EcosystemExternalIdentity | null
}
export async function upsertExternalIdentity(supabase: SupabaseClient, input: { ecosystem_organization_id: string; connection_id: string; provider: string; external_record_type?: string; external_record_id: string; external_name?: string | null; external_domain?: string | null; match_method?: string; match_confidence?: number | null; status?: EcosystemExternalIdentity['status']; metadata?: Record<string, unknown> }) {
  const { data, error } = await supabase.from('ecosystem_external_identities').upsert({ ...input, external_record_type: input.external_record_type || 'organization', match_method: input.match_method || 'candidate', status: input.status || 'candidate', metadata: input.metadata || {}, last_seen_at: new Date().toISOString() }, { onConflict: 'connection_id,external_record_type,external_record_id' }).select('*').single()
  if (error) throw error
  return data as EcosystemExternalIdentity
}