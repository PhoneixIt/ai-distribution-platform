create table if not exists public.org_distributors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  distributor_id uuid not null references public.distributors(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  regions text[] not null default '{}',
  start_date date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id),
  unique (org_id, distributor_id),
  check (status in ('prospect','onboarding','active','paused','inactive','terminated'))
);

create index if not exists org_distributors_distributor_id_idx on public.org_distributors(distributor_id);

alter table public.org_distributors enable row level security;

revoke all on public.org_distributors from anon;
grant select, insert, update, delete on public.org_distributors to authenticated;

drop policy if exists org_distributors_members_select on public.org_distributors;
create policy org_distributors_members_select on public.org_distributors
  for select to authenticated
  using (private.is_org_member(org_id));

drop policy if exists org_distributors_admin_insert on public.org_distributors;
create policy org_distributors_admin_insert on public.org_distributors
  for insert to authenticated
  with check (private.is_org_admin(org_id) and owner_id = auth.uid());

drop policy if exists org_distributors_admin_update on public.org_distributors;
create policy org_distributors_admin_update on public.org_distributors
  for update to authenticated
  using (private.is_org_admin(org_id))
  with check (private.is_org_admin(org_id));

drop policy if exists org_distributors_admin_delete on public.org_distributors;
create policy org_distributors_admin_delete on public.org_distributors
  for delete to authenticated
  using (private.is_org_admin(org_id));

