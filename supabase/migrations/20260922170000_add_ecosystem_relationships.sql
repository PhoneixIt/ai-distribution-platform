-- PortAi ecosystem relationship foundation
-- Phase 2A: additive only. Existing relationship/intelligence tables remain intact.

create table if not exists public.ecosystem_relationships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  from_entity_type text not null,
  from_entity_id uuid not null,
  to_entity_type text not null,
  to_entity_id uuid not null,
  relationship_type text not null,
  lifecycle_stage text not null default 'identified',
  status text not null default 'active',
  owner_id uuid references auth.users(id) on delete set null,
  market text,
  territory text,
  started_at timestamptz,
  last_interaction_at timestamptz,
  next_action_at timestamptz,
  health_score numeric(5,2),
  source_type text not null default 'manual',
  source_reference text,
  evidence_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ecosystem_relationships_from_entity_type_check
    check (from_entity_type in ('organization','vendor','distributor','partner','customer')),

  constraint ecosystem_relationships_to_entity_type_check
    check (to_entity_type in ('organization','vendor','distributor','partner','customer')),

  constraint ecosystem_relationships_lifecycle_stage_check
    check (lifecycle_stage in (
      'identified','prospect','engaged','qualified','application',
      'approved','onboarding','enabled','active','growing','at_risk',
      'dormant','reactivated','closed'
    )),

  constraint ecosystem_relationships_status_check
    check (status in ('active','inactive','pending','blocked','closed')),

  constraint ecosystem_relationships_health_score_check
    check (health_score is null or (health_score >= 0 and health_score <= 100)),

  constraint ecosystem_relationships_not_self_check
    check (not (from_entity_type = to_entity_type and from_entity_id = to_entity_id))
);

create index if not exists ecosystem_relationships_org_idx
  on public.ecosystem_relationships (org_id);

create index if not exists ecosystem_relationships_from_idx
  on public.ecosystem_relationships (from_entity_type, from_entity_id);

create index if not exists ecosystem_relationships_to_idx
  on public.ecosystem_relationships (to_entity_type, to_entity_id);

create index if not exists ecosystem_relationships_type_status_idx
  on public.ecosystem_relationships (relationship_type, status);

create index if not exists ecosystem_relationships_next_action_idx
  on public.ecosystem_relationships (org_id, next_action_at)
  where next_action_at is not null;

create unique index if not exists ecosystem_relationships_unique_edge_idx
  on public.ecosystem_relationships (
    org_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relationship_type
  );

alter table public.ecosystem_relationships enable row level security;

drop policy if exists ecosystem_relationships_deny_anonymous on public.ecosystem_relationships;
create policy ecosystem_relationships_deny_anonymous
  on public.ecosystem_relationships
  as restrictive
  for all
  to authenticated
  using ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false))
  with check ((select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false));

drop policy if exists ecosystem_relationships_member_select on public.ecosystem_relationships;
create policy ecosystem_relationships_member_select
  on public.ecosystem_relationships
  for select
  to authenticated
  using ((select public.is_org_member(org_id)));

drop policy if exists ecosystem_relationships_member_insert on public.ecosystem_relationships;
create policy ecosystem_relationships_member_insert
  on public.ecosystem_relationships
  for insert
  to authenticated
  with check (
    (select public.is_org_member(org_id))
    and created_by = (select auth.uid())
  );

drop policy if exists ecosystem_relationships_member_update on public.ecosystem_relationships;
create policy ecosystem_relationships_member_update
  on public.ecosystem_relationships
  for update
  to authenticated
  using ((select public.is_org_member(org_id)))
  with check ((select public.is_org_member(org_id)));

drop policy if exists ecosystem_relationships_member_delete on public.ecosystem_relationships;
create policy ecosystem_relationships_member_delete
  on public.ecosystem_relationships
  for delete
  to authenticated
  using ((select public.is_org_member(org_id)));

comment on table public.ecosystem_relationships is
  'Tenant-scoped PortAi ecosystem relationship graph. Additive foundation for vendor, distributor, partner, customer and organization relationships.';
comment on column public.ecosystem_relationships.org_id is
  'Workspace tenant that owns the relationship record.';
comment on column public.ecosystem_relationships.lifecycle_stage is
  'Relationship lifecycle independent of the requested business relationship type.';
comment on column public.ecosystem_relationships.health_score is
  'Optional normalized relationship health score from 0 to 100.';
