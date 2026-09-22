-- Phase 2A-2: canonical ecosystem relationship storage.
-- Non-destructive: additive columns, compatibility backfill, and indexes only.

alter table public.ecosystem_relationships
  add column if not exists from_ecosystem_organization_id uuid references public.ecosystem_organizations(id) on delete restrict,
  add column if not exists to_ecosystem_organization_id uuid references public.ecosystem_organizations(id) on delete restrict,
  add column if not exists from_role text,
  add column if not exists to_role text,
  add column if not exists relationship_category text,
  add column if not exists confidence numeric(5,4),
  add column if not exists source_connection_id uuid references public.ecosystem_connections(id) on delete set null;

update public.ecosystem_relationships
set
  from_ecosystem_organization_id = case
    when from_entity_type = 'organization'
      and exists (select 1 from public.ecosystem_organizations eo where eo.id = from_entity_id)
    then from_entity_id
    else from_ecosystem_organization_id
  end,
  to_ecosystem_organization_id = case
    when to_entity_type = 'organization'
      and exists (select 1 from public.ecosystem_organizations eo where eo.id = to_entity_id)
    then to_entity_id
    else to_ecosystem_organization_id
  end,
  relationship_category = case
    when relationship_category is not null then relationship_category
    when relationship_type in ('vendor_distributor','distributor_vendor','distribution') then 'distribution'
    when relationship_type in ('technology','technology_partner') then 'technology'
    when relationship_type = 'customer' then 'customer'
    when relationship_type = 'channel' then 'channel'
    when relationship_type in ('partnership','partner') then 'partnership'
    when relationship_type like '%customer%' then 'customer'
    when relationship_type like '%distributor%' then 'distribution'
    when relationship_type like '%technology%' then 'technology'
    when relationship_type like '%reseller%'
      or relationship_type like '%var%'
      or relationship_type like '%msp%'
      or relationship_type like '%mssp%'
      or relationship_type like '%system_integrator%'
      or relationship_type like '%service_provider%'
    then 'channel'
    else 'partnership'
  end,
  from_role = case
    when from_role is not null then from_role
    when relationship_type = 'vendor_distributor' then 'vendor'
    when relationship_type = 'distributor_vendor' then 'distributor'
    when relationship_type like 'vendor_%' then 'vendor'
    when relationship_type like 'distributor_%' then 'distributor'
    else from_role
  end,
  to_role = case
    when to_role is not null then to_role
    when relationship_type = 'vendor_distributor' then 'distributor'
    when relationship_type = 'distributor_vendor' then 'vendor'
    when relationship_type like 'vendor_%' then regexp_replace(relationship_type, '^vendor_', '')
    when relationship_type like 'distributor_%' then regexp_replace(relationship_type, '^distributor_', '')
    else to_role
  end;

create index if not exists ecosystem_relationships_from_canonical_idx
  on public.ecosystem_relationships (from_ecosystem_organization_id);

create index if not exists ecosystem_relationships_to_canonical_idx
  on public.ecosystem_relationships (to_ecosystem_organization_id);

create index if not exists ecosystem_relationships_category_idx
  on public.ecosystem_relationships (org_id, relationship_category, status);

create index if not exists ecosystem_relationships_source_connection_idx
  on public.ecosystem_relationships (source_connection_id)
  where source_connection_id is not null;

create unique index if not exists ecosystem_relationships_canonical_unique
  on public.ecosystem_relationships (
    org_id,
    from_ecosystem_organization_id,
    to_ecosystem_organization_id,
    coalesce(from_role, ''),
    coalesce(to_role, ''),
    coalesce(relationship_category, '')
  )
  where from_ecosystem_organization_id is not null
    and to_ecosystem_organization_id is not null;

alter table public.ecosystem_relationships
  drop constraint if exists ecosystem_relationships_confidence_check;

alter table public.ecosystem_relationships
  add constraint ecosystem_relationships_confidence_check
  check (confidence is null or (confidence >= 0 and confidence <= 1));

alter table public.ecosystem_relationships
  drop constraint if exists ecosystem_relationships_category_check;

alter table public.ecosystem_relationships
  add constraint ecosystem_relationships_category_check
  check (
    relationship_category is null
    or relationship_category in ('distribution','channel','partnership','technology','customer')
  );
