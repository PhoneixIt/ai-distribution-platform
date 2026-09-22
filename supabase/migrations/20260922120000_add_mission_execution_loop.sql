alter table public.missions drop constraint if exists missions_current_stage_check;
alter table public.missions
  add constraint missions_current_stage_check
  check (current_stage in (
    'defined','discovering','researching','scored','dossier_ready',
    'contacts_researched','draft_ready','waiting_approval','approved',
    'sent','tracking','completed','failed'
  ));

create table if not exists public.mission_dossiers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  candidate_id uuid references public.discovery_candidates(id) on delete set null,
  company jsonb not null default '{}'::jsonb,
  commercial jsonb not null default '{}'::jsonb,
  intelligence jsonb not null default '{}'::jsonb,
  people jsonb not null default '[]'::jsonb,
  recommended_action jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('ready','contacts_researched','draft_ready')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, candidate_id)
);

create index if not exists mission_dossiers_mission_idx on public.mission_dossiers(mission_id, created_at);
alter table public.mission_dossiers enable row level security;
revoke all on table public.mission_dossiers from anon, authenticated;
grant select, insert, update on table public.mission_dossiers to authenticated;
create policy "mission_dossiers_members_select" on public.mission_dossiers for select to authenticated using ((select public.is_org_member(org_id)));
create policy "mission_dossiers_members_insert" on public.mission_dossiers for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "mission_dossiers_members_update" on public.mission_dossiers for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));

create table if not exists public.mission_external_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  provider text not null,
  operation text not null,
  entity_count integer not null default 0,
  estimated_credits numeric(12,2) not null default 0,
  credits_consumed numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists mission_external_usage_mission_idx on public.mission_external_usage(mission_id, created_at);
alter table public.mission_external_usage enable row level security;
revoke all on table public.mission_external_usage from anon, authenticated;
grant select, insert on table public.mission_external_usage to authenticated;
create policy "mission_external_usage_members_select" on public.mission_external_usage for select to authenticated using ((select public.is_org_member(org_id)));
create policy "mission_external_usage_members_insert" on public.mission_external_usage for insert to authenticated with check ((select public.is_org_member(org_id)));

create table if not exists public.mission_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  dossier_id uuid not null references public.mission_dossiers(id) on delete cascade,
  contact jsonb not null default '{}'::jsonb,
  subject text not null,
  body text not null,
  personalization_evidence jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','sent','tracking','failed')),
  send_result jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mission_outreach_drafts_mission_idx on public.mission_outreach_drafts(mission_id, created_at);
alter table public.mission_outreach_drafts enable row level security;
revoke all on table public.mission_outreach_drafts from anon, authenticated;
grant select, insert, update on table public.mission_outreach_drafts to authenticated;
create policy "mission_outreach_drafts_members_select" on public.mission_outreach_drafts for select to authenticated using ((select public.is_org_member(org_id)));
create policy "mission_outreach_drafts_members_insert" on public.mission_outreach_drafts for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "mission_outreach_drafts_members_update" on public.mission_outreach_drafts for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));

create table if not exists public.mission_approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  draft_id uuid not null unique references public.mission_outreach_drafts(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists mission_approvals_mission_idx on public.mission_approvals(mission_id, requested_at desc);
alter table public.mission_approvals enable row level security;
revoke all on table public.mission_approvals from anon, authenticated;
grant select on table public.mission_approvals to authenticated;
create policy "mission_approvals_members_select" on public.mission_approvals for select to authenticated using ((select public.is_org_member(org_id)));

create or replace function private.decide_mission_approval(p_approval_id uuid, p_action text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.mission_approvals%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception using message = 'Authentication required.'; end if;
  if p_action not in ('approve','reject') then raise exception using message = 'Action must be approve or reject.'; end if;

  select * into v from public.mission_approvals where id = p_approval_id and status = 'pending' for update;
  if not found then raise exception using message = 'Pending mission approval not found.'; end if;

  if not exists (
    select 1 from public.org_members m
    where m.org_id = v.org_id and m.user_id = v_user and m.status = 'active' and m.role in ('owner','admin')
  ) then raise exception using message = 'Workspace admin approval is required.'; end if;

  update public.mission_approvals
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        decided_by = v_user, decided_at = now(),
        notes = nullif(left(coalesce(p_notes,''),2000),'')
  where id = v.id;

  update public.mission_outreach_drafts
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end
  where id = v.draft_id;

  update public.missions
    set current_stage = case when p_action = 'approve' then 'approved' else 'draft_ready' end,
        status = case when p_action = 'approve' then 'waiting_approval' else 'waiting_approval' end,
        updated_at = now()
  where id = v.mission_id;

  return jsonb_build_object('approval', to_jsonb((select a from public.mission_approvals a where a.id = v.id)));
end;
$$;

create or replace function public.decide_mission_approval(p_approval_id uuid, p_action text, p_notes text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.decide_mission_approval(p_approval_id,p_action,p_notes);
$$;

revoke all on function private.decide_mission_approval(uuid,text,text) from public, anon;
grant execute on function private.decide_mission_approval(uuid,text,text) to authenticated;
revoke all on function public.decide_mission_approval(uuid,text,text) from public, anon;
grant execute on function public.decide_mission_approval(uuid,text,text) to authenticated;