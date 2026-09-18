import type { SupabaseClient } from '@supabase/supabase-js'

export const BUSINESS_ENTITIES = [
  'org_vendors',
  'vendor_contacts',
  'distributor_partners',
  'activities',
  'meetings',
  'tasks',
  'pricing_records',
  'partner_performance',
  'business_notes',
  'recommendations',
] as const

export type BusinessEntity = (typeof BUSINESS_ENTITIES)[number]

const ENTITY_SET = new Set<string>(BUSINESS_ENTITIES)

export function isBusinessEntity(value: string): value is BusinessEntity {
  return ENTITY_SET.has(value)
}

export async function listBusinessRecords(
  supabase: SupabaseClient,
  entity: BusinessEntity,
  id?: string,
) {
  let query = supabase.from(entity).select('*').order('created_at', { ascending: false }).limit(200)

  if (id) query = query.eq('id', id)

  const { data, error } = await query
  if (error) throw error

  return data ?? []
}

export async function createBusinessRecord(
  supabase: SupabaseClient,
  entity: BusinessEntity,
  input: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from(entity)
    .insert(input)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateBusinessRecord(
  supabase: SupabaseClient,
  entity: BusinessEntity,
  id: string,
  input: Record<string, unknown>,
) {
  const updates = { ...input }
  delete updates.id
  delete updates.org_id
  delete updates.created_at

  const { data, error } = await supabase
    .from(entity)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteBusinessRecord(
  supabase: SupabaseClient,
  entity: BusinessEntity,
  id: string,
) {
  const { error } = await supabase.from(entity).delete().eq('id', id)
  if (error) throw error
}
