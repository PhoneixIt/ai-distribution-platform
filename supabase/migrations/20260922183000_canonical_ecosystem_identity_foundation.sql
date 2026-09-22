-- Phase 2A-1: canonical ecosystem identity + connectivity foundation.
-- Non-destructive: additive columns/tables only; no legacy data is deleted or rewritten.

alter table public.ecosystem_organizations
  add column if not exists legal_name text,
  add column if not exists primary_domain text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state_region text,
  add column if not exists postal_code text,
  add column if not exists phone text,
  add column if not exists linkedin_url text,
  add column if not exists created_in_org_id uuid references public.organizations(id);

create index if not exists ecosystem_organizations_primary_domain_idx
  on public.ecosystem_organizations (lower(primary_domain))
  where primary_domain is not null;

create index if not exists ecosystem_organizations_created_in_org_idx
  on public.ecosystem_organizations (created_in_org_id);

drop policy if exists ecosystem_organizations_insert_member on public.ecosystem_organizations;
create policy ecosystem_organizations_insert_member
  on public.ecosystem_organizations for insert to authenticated
  with check (
    coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false
    and created_in_org_id is not null
    and public.is_org_member(created_in_org_id)
  );

create table if not exists public.ecosystem_organization_aliases (
  id uuid primary key default gen_random_uuid(),
  ecosystem_organization_id uuid not null references public.ecosystem_organizations(id) on delete cascade,
  alias text not null,
  alias_type text not null default 'alternate_name',
  source_type text not null default 'manual',
  source_reference text,
  source_org_id uuid references public.organizations(id) on delete cascade,
  verified boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_org_alias_type_check
    check (alias_type in ('legal_name','alternate_name','trading_name','former_name','localized_name','other')),
  constraint ecosystem_org_alias_visibility_check
    check (source_org_id is not null or source_type in ('public_web','company_website','research','system'))
);

create index if not exists ecosystem_org_aliases_org_idx
  on public.ecosystem_organization_aliases (ecosystem_organization_id);

create index if not exists ecosystem_org_aliases_normalized_idx
  on public.ecosystem_organization_aliases (lower(alias));

alter table public.ecosystem_organization_aliases enable row level security;
revoke all on table public.ecosystem_organization_aliases from anon;
grant select, insert, update, delete on table public.ecosystem_organization_aliases to authenticated;

create policy ecosystem_org_aliases_select
  on public.ecosystem_organization_aliases for select to authenticated
  using (
    source_org_id is null
    or public.is_org_member(source_org_id)
  );

create policy ecosystem_org_aliases_insert
  on public.ecosystem_organization_aliases for insert to authenticated
  with check (
    source_org_id is not null
    and public.is_org_member(source_org_id)
    and created_by = auth.uid()
  );

create policy ecosystem_org_aliases_update
  on public.ecosystem_organization_aliases for update to authenticated
  using (
    created_by = auth.uid()
    and (source_org_id is null or public.is_org_member(source_org_id))
  )
  with check (
    created_by = auth.uid()
    and (source_org_id is null or public.is_org_member(source_org_id))
  );

create policy ecosystem_org_aliases_delete
  on public.ecosystem_organization_aliases for delete to authenticated
  using (created_by = auth.uid());

create table if not exists public.ecosystem_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  connection_type text not null default 'api',
  display_name text not null,
  status text not null default 'active',
  sync_direction text not null default 'inbound',
  sync_status text not null default 'never',
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_connections_status_check
    check (status in ('active','paused','disconnected','error')),
  constraint ecosystem_connections_sync_direction_check
    check (sync_direction in ('inbound','outbound','bidirectional')),
  constraint ecosystem_connections_sync_status_check
    check (sync_status in ('never','pending','running','completed','partial','failed'))
);

create index if not exists ecosystem_connections_org_idx
  on public.ecosystem_connections (org_id);

create index if not exists ecosystem_connections_provider_idx
  on public.ecosystem_connections (provider, status);

alter table public.ecosystem_connections enable row level security;
revoke all on table public.ecosystem_connections from anon;
grant select, insert, update, delete on table public.ecosystem_connections to authenticated;

create policy ecosystem_connections_select
  on public.ecosystem_connections for select to authenticated
  using (public.is_org_member(org_id));

create policy ecosystem_connections_insert
  on public.ecosystem_connections for insert to authenticated
  with check (public.is_org_member(org_id) and created_by = auth.uid());

create policy ecosystem_connections_update
  on public.ecosystem_connections for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy ecosystem_connections_delete
  on public.ecosystem_connections for delete to authenticated
  using (public.is_org_member(org_id));

create table if not exists public.ecosystem_external_identities (
  id uuid primary key default gen_random_uuid(),
  ecosystem_organization_id uuid not null references public.ecosystem_organizations(id) on delete cascade,
  connection_id uuid not null references public.ecosystem_connections(id) on delete cascade,
  provider text not null,
  external_record_type text not null default 'organization',
  external_record_id text not null,
  external_name text,
  external_domain text,
  match_method text not null default 'candidate',
  match_confidence numeric(5,4),
  status text not null default 'candidate',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_external_identity_match_confidence_check
    check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
  constraint ecosystem_external_identity_status_check
    check (status in ('candidate','confirmed','rejected','stale','disconnected')),
  constraint ecosystem_external_identity_match_method_check
    check (match_method in ('exact_external_id','exact_domain','verified_domain','legal_name','normalized_name','name_and_country','name_and_address','manual_confirmation','ai_assessment','candidate')),
  constraint ecosystem_external_identity_unique_record
    unique (connection_id, external_record_type, external_record_id)
);

create index if not exists ecosystem_external_identities_org_idx
  on public.ecosystem_external_identities (ecosystem_organization_id);

create index if not exists ecosystem_external_identities_connection_idx
  on public.ecosystem_external_identities (connection_id);

create index if not exists ecosystem_external_identities_lookup_idx
  on public.ecosystem_external_identities (provider, external_record_type, external_record_id);

alter table public.ecosystem_external_identities enable row level security;
revoke all on table public.ecosystem_external_identities from anon;
grant select, insert, update, delete on table public.ecosystem_external_identities to authenticated;

create policy ecosystem_external_identities_select
  on public.ecosystem_external_identities for select to authenticated
  using (
    exists (
      select 1 from public.ecosystem_connections c
      where c.id = ecosystem_external_identities.connection_id
        and public.is_org_member(c.org_id)
    )
  );

create policy ecosystem_external_identities_insert
  on public.ecosystem_external_identities for insert to authenticated
  with check (
    exists (
      select 1 from public.ecosystem_connections c
      where c.id = ecosystem_external_identities.connection_id
        and public.is_org_member(c.org_id)
    )
  );

create policy ecosystem_external_identities_update
  on public.ecosystem_external_identities for update to authenticated
  using (
    exists (
      select 1 from public.ecosystem_connections c
      where c.id = ecosystem_external_identities.connection_id
        and public.is_org_member(c.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.ecosystem_connections c
      where c.id = ecosystem_external_identities.connection_id
        and public.is_org_member(c.org_id)
    )
  );

create policy ecosystem_external_identities_delete
  on public.ecosystem_external_identities for delete to authenticated
  using (
    exists (
      select 1 from public.ecosystem_connections c
      where c.id = ecosystem_external_identities.connection_id
        and public.is_org_member(c.org_id)
    )
  );

alter table public.vendors
  add column if not exists ecosystem_organization_id uuid references public.ecosystem_organizations(id);

alter table public.partners
  add column if not exists ecosystem_organization_id uuid references public.ecosystem_organizations(id);

alter table public.distributors
  add column if not exists ecosystem_organization_id uuid references public.ecosystem_organizations(id);

alter table public.customers
  add column if not exists ecosystem_organization_id uuid references public.ecosystem_organizations(id);

create index if not exists vendors_ecosystem_organization_idx on public.vendors (ecosystem_organization_id) where ecosystem_organization_id is not null;
create index if not exists partners_ecosystem_organization_idx on public.partners (ecosystem_organization_id) where ecosystem_organization_id is not null;
create index if not exists distributors_ecosystem_organization_idx on public.distributors (ecosystem_organization_id) where ecosystem_organization_id is not null;
create index if not exists customers_ecosystem_organization_idx on public.customers (ecosystem_organization_id) where ecosystem_organization_id is not null;
