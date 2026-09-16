create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  initiated_by uuid references auth.users(id) on delete set null,
  objective text not null,
  status text not null default 'queued' check (status in ('queued','running','waiting_approval','completed','partial','failed','cancelled')),
  root_task_id uuid,
  provider text not null default 'openai_agents',
  model text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  parent_task_id uuid references public.agent_tasks(id) on delete set null,
  assigned_agent text not null,
  task_type text not null,
  title text not null,
  instructions text,
  status text not null default 'queued' check (status in ('queued','running','waiting','completed','failed','cancelled')),
  priority integer not null default 50 check (priority between 0 and 100),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  evidence_ids uuid[] not null default '{}'::uuid[],
  depends_on_task_ids uuid[] not null default '{}'::uuid[],
  requires_approval boolean not null default false,
  approval_status text not null default 'not_required' check (approval_status in ('not_required','pending','approved','rejected')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_runs add constraint agent_runs_root_task_fk foreign key (root_task_id) references public.agent_tasks(id) on delete set null;

create index if not exists agent_runs_org_status_idx on public.agent_runs(org_id, status, created_at desc);
create index if not exists agent_tasks_run_status_idx on public.agent_tasks(run_id, status, priority desc, created_at);
create index if not exists agent_tasks_org_status_idx on public.agent_tasks(org_id, status, created_at desc);
create index if not exists agent_tasks_parent_idx on public.agent_tasks(parent_task_id);

alter table public.agent_runs enable row level security;
alter table public.agent_tasks enable row level security;

create policy "agent_runs_members_select" on public.agent_runs
  for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = agent_runs.org_id and m.user_id = (select auth.uid()) and m.status = 'active'));

create policy "agent_runs_members_insert" on public.agent_runs
  for insert to authenticated
  with check (exists (select 1 from public.org_members m where m.org_id = agent_runs.org_id and m.user_id = (select auth.uid()) and m.status = 'active'));

create policy "agent_runs_members_update" on public.agent_runs
  for update to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = agent_runs.org_id and m.user_id = (select auth.uid()) and m.status = 'active'))
  with check (exists (select 1 from public.org_members m where m.org_id = agent_runs.org_id and m.user_id = (select auth.uid()) and m.status = 'active'));

create policy "agent_tasks_members_select" on public.agent_tasks
  for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = agent_tasks.org_id and m.user_id = (select auth.uid()) and m.status = 'active'));

create policy "agent_tasks_members_insert" on public.agent_tasks
  for insert to authenticated
  with check (exists (select 1 from public.org_members m where m.org_id = agent_tasks.org_id and m.user_id = (select auth.uid()) and m.status = 'active'));

create policy "agent_tasks_members_update" on public.agent_tasks
  for update to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = agent_tasks.org_id and m.user_id = (select auth.uid()) and m.status = 'active'))
  with check (exists (select 1 from public.org_members m where m.org_id = agent_tasks.org_id and m.user_id = (select auth.uid()) and m.status = 'active'));

create or replace function public.set_agent_workforce_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agent_runs_updated_at on public.agent_runs;
create trigger agent_runs_updated_at before update on public.agent_runs for each row execute function public.set_agent_workforce_updated_at();

drop trigger if exists agent_tasks_updated_at on public.agent_tasks;
create trigger agent_tasks_updated_at before update on public.agent_tasks for each row execute function public.set_agent_workforce_updated_at();
