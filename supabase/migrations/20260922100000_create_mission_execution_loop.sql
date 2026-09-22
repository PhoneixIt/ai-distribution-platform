create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  objective text not null,
  vendor_name text,
  product_name text,
  market text,
  country text,
  partner_types text[] not null default '{}',
  technology_focus text,
  customer_segment text,
  status text not null default 'draft' check (status in ('draft','running','waiting_approval','completed','failed','cancelled')),
  current_stage text not null default 'defined' check (current_stage in ('defined','discovering','researching','scored','dossier_ready','draft_ready','waiting_approval','sent','tracking','completed','failed')),
  discovery_run_id uuid references public.discovery_runs(id) on delete set null,
  ai_run_id uuid references public.agent_runs(id) on delete set null,
  candidate_count integer not null default 0,
  result_summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists missions_org_created_idx on public.missions(org_id, created_at desc);
create index if not exists missions_status_idx on public.missions(org_id, status, updated_at desc);
create index if not exists missions_discovery_run_idx on public.missions(discovery_run_id);

alter table public.missions enable row level security;

revoke all on table public.missions from anon, authenticated;
grant select, insert, update on table public.missions to authenticated;

drop policy if exists "missions_members_select" on public.missions;
create policy "missions_members_select"
  on public.missions for select to authenticated
  using ((select public.is_org_member(org_id)));

drop policy if exists "missions_members_insert" on public.missions;
create policy "missions_members_insert"
  on public.missions for insert to authenticated
  with check ((select public.is_org_member(org_id)) and created_by = (select auth.uid()));

drop policy if exists "missions_members_update" on public.missions;
create policy "missions_members_update"
  on public.missions for update to authenticated
  using ((select public.is_org_member(org_id)))
  with check ((select public.is_org_member(org_id)));

drop policy if exists "missions_deny_anonymous" on public.missions;
create policy "missions_deny_anonymous"
  on public.missions as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);

drop trigger if exists missions_updated_at on public.missions;
create trigger missions_updated_at
  before update on public.missions
  for each row execute function private.set_business_updated_at();
