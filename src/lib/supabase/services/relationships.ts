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

export const RELATIONSHIP_CATEGORIES = [
  'distribution',
  'channel',
  'partnership',
  'technology',
  'customer',
] as const

export const ECOSYSTEM_ORGANIZATION_ROLES = [
  'vendor',
  'distributor',
  'reseller',
  'var',
  'msp',
  'mssp',
  'system_integrator',
  'technology_partner',
  'service_provider',
  'customer',
  'other',
] as const

export type EcosystemEntityType = typeof ECOSYSTEM_ENTITY_TYPES[number]
export type RelationshipLifecycleStage = typeof RELATIONSHIP_LIFECYCLE_STAGES[number]
export type RelationshipStatus = typeof RELATIONSHIP_STATUSES[number]
export type RelationshipCategory = typeof RELATIONSHIP_CATEGORIES[number]
export type EcosystemOrganizationRole = typeof ECOSYSTEM_ORGANIZATION_ROLES[number]

export type EcosystemRelationship = {
  id: string
  org_id: string
  from_entity_type: EcosystemEntityType
  from_entity_id: string
  to_entity_type: EcosystemEntityType
  to_entity_id: string
  from_ecosystem_organization_id: string | null
  to_ecosystem_organization_id: string | null
  from_role: EcosystemOrganizationRole | null
  to_role: EcosystemOrganizationRole | null
  relationship_type: string
  relationship_category: RelationshipCategory | null
  lifecycle_stage: RelationshipLifecycleStage
  status: RelationshipStatus
  owner_id: string | null
  market: string | null
  territory: string | null
  started_at: string | null
  last_interaction_at: string | null
  next_action_at: string | null
  health_score: number | null
  confidence: number | null
  source_type: string
  source_reference: string | null
  source_connection_id: string | null
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
  from_ecosystem_organization_id?: string | null
  to_ecosystem_organization_id?: string | null
  from_role?: EcosystemOrganizationRole | null
  to_role?: EcosystemOrganizationRole | null
  relationship_type: string
  relationship_category?: RelationshipCategory | null
  lifecycle_stage?: RelationshipLifecycleStage
  status?: RelationshipStatus
  owner_id?: string | null
  market?: string | null
  territory?: string | null
  started_at?: string | null
  last_interaction_at?: string | null
  next_action_at?: string | null
  health_score?: number | null
  confidence?: number | null
  source_type?: string
  source_reference?: string | null
  source_connection_id?: string | null
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

function validateCategory(value: string): RelationshipCategory {
  if ((RELATIONSHIP_CATEGORIES as readonly string[]).includes(value)) return value as RelationshipCategory
  throw new Error('Invalid relationship category.')
}

function validateRole(value: string | null | undefined): EcosystemOrganizationRole | null {
  if (!value) return null
  if ((ECOSYSTEM_ORGANIZATION_ROLES as readonly string[]).includes(value)) return value as EcosystemOrganizationRole
  throw new Error('Invalid ecosystem organization role.')
}

function deriveCategory(
  relationshipType: string,
  fromRole: EcosystemOrganizationRole | null,
  toRole: EcosystemOrganizationRole | null,
): RelationshipCategory {
  if (fromRole && toRole) {
    if ((fromRole === 'vendor' && toRole === 'distributor') || (fromRole === 'distributor' && toRole === 'vendor')) return 'distribution'
    if (fromRole === 'customer' || toRole === 'customer') return 'customer'
    if (fromRole === 'technology_partner' || toRole === 'technology_partner') return 'technology'
    if (
      ['reseller', 'var', 'msp', 'mssp', 'system_integrator', 'service_provider'].includes(fromRole) ||
      ['reseller', 'var', 'msp', 'mssp', 'system_integrator', 'service_provider'].includes(toRole)
    ) return 'channel'
  }

  const normalized = relationshipType.trim().toLowerCase().replace(/\s+/g, '_')
  if (normalized === 'vendor_distributor' || normalized === 'distributor_vendor' || normalized === 'distribution') return 'distribution'
  if (normalized === 'technology' || normalized === 'technology_partner') return 'technology'
  if (normalized === 'customer' || normalized.includes('customer')) return 'customer'
  if (normalized === 'channel' || /(?:reseller|_var|^var_|msp|mssp|system_integrator|service_provider)/.test(normalized)) return 'channel'
  return 'partnership'
}

function normalizeInput(input: EcosystemRelationshipInput) {
  const from_entity_type = validateEntityType(input.from_entity_type)
  const to_entity_type = validateEntityType(input.to_entity_type)
  if (from_entity_type === to_entity_type && input.from_entity_id === input.to_entity_id) {
    throw new Error('A relationship cannot connect an entity to itself.')
  }
  if (!input.relationship_type?.trim()) throw new Error('Relationship type is required.')

  const from_role = validateRole(input.from_role)
  const to_role = validateRole(input.to_role)
  const relationship_category = input.relationship_category
    ? validateCategory(input.relationship_category)
    : deriveCategory(input.relationship_type, from_role, to_role)

  const lifecycle_stage = input.lifecycle_stage ? validateLifecycle(input.lifecycle_stage) : 'identified'
  const status = input.status ? validateStatus(input.status) : 'active'

  const from_ecosystem_organization_id =
    input.from_ecosystem_organization_id ??
    (from_entity_type === 'organization' ? input.from_entity_id : null)
  const to_ecosystem_organization_id =
    input.to_ecosystem_organization_id ??
    (to_entity_type === 'organization' ? input.to_entity_id : null)

  return {
    from_entity_type,
    from_entity_id: input.from_entity_id,
    to_entity_type,
    to_entity_id: input.to_entity_id,
    from_ecosystem_organization_id,
    to_ecosystem_organization_id,
    from_role,
    to_role,
    relationship_type: relationship_category,
    relationship_category,
    lifecycle_stage,
    status,
    owner_id: input.owner_id ?? null,
    market: input.market ?? null,
    territory: input.territory ?? null,
    started_at: input.started_at ?? null,
    last_interaction_at: input.last_interaction_at ?? null,
    next_action_at: input.next_action_at ?? null,
    health_score: input.health_score ?? null,
    confidence: input.confidence ?? null,
    source_type: input.source_type?.trim() || 'manual',
    source_reference: input.source_reference ?? null,
    source_connection_id: input.source_connection_id ?? null,
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
    relationshipCategory?: string
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
  if (filters.relationshipCategory) query = query.eq('relationship_category', validateCategory(filters.relationshipCategory))
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
    from_ecosystem_organization_id: updates.from_ecosystem_organization_id ?? existing.from_ecosystem_organization_id,
    to_ecosystem_organization_id: updates.to_ecosystem_organization_id ?? existing.to_ecosystem_organization_id,
    from_role: updates.from_role ?? existing.from_role,
    to_role: updates.to_role ?? existing.to_role,
    relationship_type: updates.relationship_type ?? existing.relationship_type,
    relationship_category: updates.relationship_category ?? existing.relationship_category,
    lifecycle_stage: updates.lifecycle_stage ?? existing.lifecycle_stage,
    status: updates.status ?? existing.status,
    owner_id: updates.owner_id === undefined ? existing.owner_id : updates.owner_id,
    market: updates.market === undefined ? existing.market : updates.market,
    territory: updates.territory === undefined ? existing.territory : updates.territory,
    started_at: updates.started_at === undefined ? existing.started_at : updates.started_at,
    last_interaction_at: updates.last_interaction_at === undefined ? existing.last_interaction_at : updates.last_interaction_at,
    next_action_at: updates.next_action_at === undefined ? existing.next_action_at : updates.next_action_at,
    health_score: updates.health_score === undefined ? existing.health_score : updates.health_score,
    confidence: updates.confidence === undefined ? existing.confidence : updates.confidence,
    source_type: updates.source_type ?? existing.source_type,
    source_reference: updates.source_reference === undefined ? existing.source_reference : updates.source_reference,
    source_connection_id: updates.source_connection_id === undefined ? existing.source_connection_id : updates.source_connection_id,
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
