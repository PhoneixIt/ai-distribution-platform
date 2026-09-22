create table if not exists public.ecosystem_organizations (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  display_name text not null,
  normalized_name text not null,
  website text,
  country text,
  organization_roles text[] not null default '{}',
  description text,
  source_type text not null default 'manual',
  source_reference text,
  verified boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_organizations_normalized_name_key unique (normalized_name)
);

create index if not exists ecosystem_organizations_roles_idx
  on public.ecosystem_organizations using gin (organization_roles);

alter table public.ecosystem_organizations enable row level security;

create policy ecosystem_organizations_deny_anonymous
  on public.ecosystem_organizations as restrictive for all to authenticated
  using (coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
  with check (coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

create policy ecosystem_organizations_select_authenticated
  on public.ecosystem_organizations for select to authenticated
  using (coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

create policy ecosystem_organizations_insert_member
  on public.ecosystem_organizations for insert to authenticated
  with check (
    coalesce(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false
    and public.is_org_member((select id from public.organizations where owner_id = auth.uid() limit 1))
  );

create policy ecosystem_organizations_update_creator
  on public.ecosystem_organizations for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy ecosystem_organizations_delete_creator
  on public.ecosystem_organizations for delete to authenticated
  using (created_by = auth.uid());
