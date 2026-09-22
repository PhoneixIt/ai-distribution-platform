import type { SupabaseClient } from '@supabase/supabase-js'

export const ECOSYSTEM_ENTITY_TYPES = [
  'organization',
  'vendor',
  'distributor',
  'partner',
  'customer',
] as const

export const RELATIONSHIP_LIFECYCLE_STAGES = [
  'identified',
  'prospect',
  'engaged',
  'qualified',
  'application',
  'approved',
  'onboarding',
  'enabled',
  'active',
  'growing',
  'at_risk',
  'dormant',
  'reactivated',
  'closed',
] as const

export const RELATIONSHIP_STATUSES = [
  'active',
  'inactive',
  'pending',
  'blocked',
  'closed',
] as const

export type EcosystemEntityType = typeof ECOSYSTEM_ENTITY_TYPES[number]
export type RelationshipLifecycleStage = typeof RELATIONSHIP_LIFECYCLE_STAGES[number]
export type RelationshipStatus = typeof RELATIONSHIP_STATUSES[number]

export type EcosystemRelationship = {
  id: string
  org_id: string
  from_entity_type: EcosystemEntityType
  from_entity_id: string
  to_entity_type: EcosystemEntityType
  to_entity_id: string
  relationship_type: string
  lifecycle_stage: RelationshipLifecycleStage
  status: RelationshipStatus
  owner_id: string | null
  market: string | null
  territory: string | null
  started_at: string | null
  last_interaction_at: string | null
  next_action_at: string | null
  health_score: number | null
  source_type: string
  source_reference: string | null
  evidence_id: string | null
  metadata: Record<string, unknown>
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type EcosystemRelationshipInput = {
  from_entity_type: EcosystemEntityType
  from_entity_id: string
  to_entity_type: EcosystemEntityType
  to_entity_id: string
  relationship_type: string
  lifecycle_stage?: RelationshipLifecycleStage
  status?: RelationshipStatus
  owner_id?: string | null
  market?: string | null
  territory?: string | null
  started_at?: string | null
  last_interaction_at?: string | null
  next_action_at?: string | null
  health_score?: number | null
  source_type?: string
  source_reference?: string | null
  evidence_id?: string | null
  metadata?: Record<string, unknown>
  notes?: string | null
}

function validateEntityType(value: string): EcosystemEntityType {
  if ((ECOSYSTEM_ENTITY_TYPES as readonly string[]).includes(value)) return value as EcosystemEntityType
  throw new Error('Invalid ecosystem entity type.')
}

function validateLifecycle(value: string): RelationshipLifecycleStage {
  if ((RELATIONSHIP_LIFECYCLE_STAGES as readonly string[]).includes(value)) return value as RelationshipLifecycleStage
  throw new Error('Invalid relationship lifecycle stage.')
}

function validateStatus(value: string): RelationshipStatus {
  if ((RELATIONSHIP_STATUSES as readonly string[]).includes(value)) return value as RelationshipStatus
  throw new Error('Invalid relationship status.')
}

function normalizeInput(input: EcosystemRelationshipInput) {
  const from_entity_type = validateEntityType(input.from_entity_type)
  const to_entity_type = validateEntityType(input.to_entity_type)
  if (from_entity_type === to_entity_type && input.from_entity_id === input.to_entity_id) {
    throw new Error('A relationship cannot connect an entity to itself.')
  }
  if (!input.relationship_type?.trim()) throw new Error('Relationship type is required.')

  const lifecycle_stage = input.lifecycle_stage ? validateLifecycle(input.lifecycle_stage) : 'identified'
  const status = input.status ? validateStatus(input.status) : 'active'

  return {
    from_entity_type,
    from_entity_id: input.from_entity_id,
    to_entity_type,
    to_entity_id: input.to_entity_id,
    relationship_type: input.relationship_type.trim(),
    lifecycle_stage,
    status,
    owner_id: input.owner_id ?? null,
    market: input.market ?? null,
    territory: input.territory ?? null,
    started_at: input.started_at ?? null,
    last_interaction_at: input.last_interaction_at ?? null,
    next_action_at: input.next_action_at ?? null,
    health_score: input.health_score ?? null,
    source_type: input.source_type?.trim() || 'manual',
    source_reference: input.source_reference ?? null,
    evidence_id: input.evidence_id ?? null,
    metadata: input.metadata ?? {},
    notes: input.notes ?? null,
  }
}

export async function listEcosystemRelationships(
  supabase: SupabaseClient,
  orgId: string,
  filters: {
    fromEntityType?: string
    fromEntityId?: string
    toEntityType?: string
    toEntityId?: string
    relationshipType?: string
    status?: string
    limit?: number
  } = {},
): Promise<EcosystemRelationship[]> {
  let query = supabase
    .from('ecosystem_relationships')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (filters.fromEntityType) query = query.eq('from_entity_type', validateEntityType(filters.fromEntityType))
  if (filters.fromEntityId) query = query.eq('from_entity_id', filters.fromEntityId)
  if (filters.toEntityType) query = query.eq('to_entity_type', validateEntityType(filters.toEntityType))
  if (filters.toEntityId) query = query.eq('to_entity_id', filters.toEntityId)
  if (filters.relationshipType) query = query.eq('relationship_type', filters.relationshipType)
  if (filters.status) query = query.eq('status', validateStatus(filters.status))

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  const { data, error } = await query.limit(limit)
  if (error) throw error
  return (data ?? []) as EcosystemRelationship[]
}

export async function getEcosystemRelationship(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
): Promise<EcosystemRelationship> {
  const { data, error } = await supabase
    .from('ecosystem_relationships')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Relationship not found.')
  return data as EcosystemRelationship
}

export async function createEcosystemRelationship(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  input: EcosystemRelationshipInput,
): Promise<EcosystemRelationship> {
  const payload = normalizeInput(input)
  const { data, error } = await supabase
    .from('ecosystem_relationships')
    .insert({ ...payload, org_id: orgId, created_by: userId })
    .select('*')
    .single()

  if (error) throw error
  return data as EcosystemRelationship
}

export async function updateEcosystemRelationship(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  updates: Partial<EcosystemRelationshipInput>,
): Promise<EcosystemRelationship> {
  const existing = await getEcosystemRelationship(supabase, orgId, id)
  const payload = normalizeInput({
    from_entity_type: updates.from_entity_type ?? existing.from_entity_type,
    from_entity_id: updates.from_entity_id ?? existing.from_entity_id,
    to_entity_type: updates.to_entity_type ?? existing.to_entity_type,
    to_entity_id: updates.to_entity_id ?? existing.to_entity_id,
    relationship_type: updates.relationship_type ?? existing.relationship_type,
    lifecycle_stage: updates.lifecycle_stage ?? existing.lifecycle_stage,
    status: updates.status ?? existing.status,
    owner_id: updates.owner_id === undefined ? existing.owner_id : updates.owner_id,
    market: updates.market === undefined ? existing.market : updates.market,
    territory: updates.territory === undefined ? existing.territory : updates.territory,
    started_at: updates.started_at === undefined ? existing.started_at : updates.started_at,
    last_interaction_at: updates.last_interaction_at === undefined ? existing.last_interaction_at : updates.last_interaction_at,
    next_action_at: updates.next_action_at === undefined ? existing.next_action_at : updates.next_action_at,
    health_score: updates.health_score === undefined ? existing.health_score : updates.health_score,
    source_type: updates.source_type ?? existing.source_type,
    source_reference: updates.source_reference === undefined ? existing.source_reference : updates.source_reference,
    evidence_id: updates.evidence_id === undefined ? existing.evidence_id : updates.evidence_id,
    metadata: updates.metadata ?? existing.metadata,
    notes: updates.notes === undefined ? existing.notes : updates.notes,
  })

  const { data, error } = await supabase
    .from('ecosystem_relationships')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as EcosystemRelationship
}

export async function deleteEcosystemRelationship(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('ecosystem_relationships')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id)

  if (error) throw error
}
