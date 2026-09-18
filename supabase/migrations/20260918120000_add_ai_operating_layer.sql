-- Structured AI operating layer on top of the business foundation.
-- The model may reason, but server-side tools remain the authorization boundary.

create table if not exists public.agent_definitions (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null unique,
  name text not null,
  role text not null,
  instructions text not null,
  allowed_tools text[] not null default '{}',
  access_scope jsonb not null default '{}'::jsonb,
  sensitive_action_policy text not null default 'approval_required',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  agent_key text not null,
  tool_name text not null,
  classification text not null check (classification in ('fact','inference','recommendation','action','approval')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  status text not null default 'completed' check (status in ('requested','completed','failed','blocked','pending_approval')),
  requires_approval boolean not null default false,
  approval_id uuid,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  tool_call_id uuid references public.agent_tool_calls(id) on delete set null,
  action_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  notes text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_key text not null,
  memory_key text not null,
  content jsonb not null default '{}'::jsonb,
  confidence numeric(5,4),
  source_run_id uuid references public.agent_runs(id) on delete set null,
  source_task_id uuid references public.agent_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, agent_key, memory_key),
  check (confidence is null or (confidence between 0 and 1))
);

alter table public.agent_runs
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists confidence numeric(5,4),
  add column if not exists updated_at timestamptz not null default now();

alter table public.agent_tasks
  add column if not exists classification text not null default 'action'
    check (classification in ('fact','inference','recommendation','action','approval')),
  add column if not exists confidence numeric(5,4);

alter table public.agent_tool_calls
  add constraint agent_tool_calls_approval_fk
  foreign key (approval_id) references public.agent_approvals(id) on delete set null;

create index if not exists agent_definitions_enabled_idx
  on public.agent_definitions(enabled, agent_key);

create index if not exists agent_tool_calls_run_idx
  on public.agent_tool_calls(run_id, created_at);

create index if not exists agent_tool_calls_org_idx
  on public.agent_tool_calls(org_id, created_at desc);

create index if not exists agent_approvals_org_status_idx
  on public.agent_approvals(org_id, status, requested_at desc);

create index if not exists agent_approvals_run_idx
  on public.agent_approvals(run_id, requested_at desc);

create index if not exists agent_memories_org_agent_idx
  on public.agent_memories(org_id, agent_key, updated_at desc);

alter table public.agent_definitions enable row level security;
alter table public.agent_tool_calls enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_memories enable row level security;

revoke all on table public.agent_definitions from anon, authenticated;
revoke all on table public.agent_tool_calls from anon, authenticated;
revoke all on table public.agent_approvals from anon, authenticated;
revoke all on table public.agent_memories from anon, authenticated;

grant select on table public.agent_definitions to authenticated;
grant select, insert on table public.agent_tool_calls to authenticated;
grant select, insert, update on table public.agent_approvals to authenticated;
grant select, insert, update on table public.agent_memories to authenticated;

drop policy if exists "agent_definitions_authenticated_select" on public.agent_definitions;
create policy "agent_definitions_authenticated_select"
  on public.agent_definitions for select to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);

drop policy if exists "agent_tool_calls_members_select" on public.agent_tool_calls;
create policy "agent_tool_calls_members_select"
  on public.agent_tool_calls for select to authenticated
  using ((select public.is_org_member(org_id)));

drop policy if exists "agent_tool_calls_members_insert" on public.agent_tool_calls;
create policy "agent_tool_calls_members_insert"
  on public.agent_tool_calls for insert to authenticated
  with check ((select public.is_org_member(org_id)));

drop policy if exists "agent_approvals_members_select" on public.agent_approvals;
create policy "agent_approvals_members_select"
  on public.agent_approvals for select to authenticated
  using ((select public.is_org_member(org_id)));

drop policy if exists "agent_approvals_members_insert" on public.agent_approvals;
create policy "agent_approvals_members_insert"
  on public.agent_approvals for insert to authenticated
  with check ((select public.is_org_member(org_id)));

drop policy if exists "agent_approvals_admin_update" on public.agent_approvals;
create policy "agent_approvals_admin_update"
  on public.agent_approvals for update to authenticated
  using ((select public.is_org_admin(org_id)))
  with check ((select public.is_org_admin(org_id)));

drop policy if exists "agent_memories_members_select" on public.agent_memories;
create policy "agent_memories_members_select"
  on public.agent_memories for select to authenticated
  using ((select public.is_org_member(org_id)));

drop policy if exists "agent_memories_members_insert" on public.agent_memories;
create policy "agent_memories_members_insert"
  on public.agent_memories for insert to authenticated
  with check ((select public.is_org_member(org_id)));

drop policy if exists "agent_memories_members_update" on public.agent_memories;
create policy "agent_memories_members_update"
  on public.agent_memories for update to authenticated
  using ((select public.is_org_member(org_id)))
  with check ((select public.is_org_member(org_id)));

drop policy if exists "agent_tool_calls_deny_anonymous" on public.agent_tool_calls;
create policy "agent_tool_calls_deny_anonymous"
  on public.agent_tool_calls as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);

drop policy if exists "agent_approvals_deny_anonymous" on public.agent_approvals;
create policy "agent_approvals_deny_anonymous"
  on public.agent_approvals as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);

drop policy if exists "agent_memories_deny_anonymous" on public.agent_memories;
create policy "agent_memories_deny_anonymous"
  on public.agent_memories as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);

drop trigger if exists agent_definitions_updated_at on public.agent_definitions;
create trigger agent_definitions_updated_at
  before update on public.agent_definitions
  for each row execute function private.set_business_updated_at();

drop trigger if exists agent_memories_updated_at on public.agent_memories;
create trigger agent_memories_updated_at
  before update on public.agent_memories
  for each row execute function private.set_business_updated_at();

drop trigger if exists agent_approvals_audit on public.agent_approvals;
create trigger agent_approvals_audit
  after insert or update on public.agent_approvals
  for each row execute function private.audit_business_change();

drop trigger if exists agent_runs_updated_at on public.agent_runs;
create trigger agent_runs_updated_at
  before update on public.agent_runs
  for each row execute function public.set_agent_workforce_updated_at();

insert into public.agent_definitions
  (agent_key, name, role, instructions, allowed_tools, access_scope, sensitive_action_policy)
values
  ('ceo_orchestrator', 'Distributor CEO / Orchestrator',
   'Owns the overall business objective, delegates bounded work, combines results, identifies priorities and stops at approval boundaries.',
   'Understand the objective, choose the smallest useful specialist set, require evidence, preserve uncertainty, never perform unrestricted external actions.',
   array['query_partners','query_vendors','query_products','query_customers','query_opportunities','query_activities','query_tasks','query_pricing','search_market','analyze_opportunity','create_task','generate_recommendation','request_human_approval'],
   '{"read_scope":"workspace","write_scope":"recommendations_and_tasks","external_actions":"approval_required"}'::jsonb,
   'approval_required'),
  ('vendor_manager', 'Vendor Manager Agent',
   'Researches vendors and products, tracks vendor relationships and identifies vendor onboarding opportunities and missing information.',
   'Prefer verified vendor/product records. Use market search only when the workspace data is insufficient. Separate verified facts from inference.',
   array['query_vendors','query_products','search_market','create_task','generate_recommendation'],
   '{"read_scope":["vendors","products","org_vendors","vendor_contacts","market"],"write_scope":"recommendations_and_tasks","external_actions":"approval_required"}'::jsonb,
   'approval_required'),
  ('partner_manager', 'Partner Manager Agent',
   'Analyzes reseller and partner accounts, dormancy, activation opportunities, recruitment and partner health.',
   'Use activity and performance signals before recommending reactivation. Never invent partner health data.',
   array['query_partners','query_tasks','create_task','generate_recommendation'],
   '{"read_scope":["partners","distributor_partners","partner_performance","activities","tasks"],"write_scope":"recommendations_and_tasks","external_actions":"approval_required"}'::jsonb,
   'approval_required'),
  ('sales_agent', 'Sales Agent',
   'Analyzes leads and opportunities, prioritizes prospects, prepares next actions, outreach drafts and meeting briefs.',
   'Use opportunity and customer state as source of truth. Draft communication from verified facts only. Never send it.',
   array['query_opportunities','query_customers','query_partners','analyze_opportunity','create_task','generate_recommendation','request_human_approval'],
   '{"read_scope":["opportunities","opportunity_products","customers","partners","activities"],"write_scope":"recommendations_and_tasks","external_actions":"approval_required"}'::jsonb,
   'approval_required'),
  ('market_intelligence', 'Market Intelligence Agent',
   'Analyzes competitors, products, markets and external signals while separating verified information from assumptions.',
   'Cite or preserve source URLs for external claims. Do not present an inference as a fact.',
   array['search_market','query_vendors','query_products','query_partners','create_task','generate_recommendation'],
   '{"read_scope":["market","vendors","products","partners"],"write_scope":"recommendations_and_tasks","external_actions":"approval_required"}'::jsonb,
   'approval_required'),
  ('commercial_agent', 'Commercial Agent',
   'Analyzes pricing, margins, discounts and deal structures and prepares commercial recommendations.',
   'Use stored pricing and opportunity product data. Never commit pricing, discount or contractual terms.',
   array['query_pricing','query_opportunities','analyze_opportunity','create_task','generate_recommendation','request_human_approval'],
   '{"read_scope":["pricing_records","opportunity_products","opportunities"],"write_scope":"recommendations_and_tasks","external_actions":"approval_required"}'::jsonb,
   'approval_required'),
  ('operations_agent', 'Operations Agent',
   'Monitors tasks, missing information, overdue activities and workflow bottlenecks.',
   'Prioritize overdue and blocked work. Do not silently close or alter work unless explicitly approved.',
   array['query_tasks','query_opportunities','query_partners','create_task','generate_recommendation'],
   '{"read_scope":["tasks","activities","meetings","opportunities","partners"],"write_scope":"recommendations_and_tasks","external_actions":"approval_required"}'::jsonb,
   'approval_required')
on conflict (agent_key) do update
set name = excluded.name,
    role = excluded.role,
    instructions = excluded.instructions,
    allowed_tools = excluded.allowed_tools,
    access_scope = excluded.access_scope,
    sensitive_action_policy = excluded.sensitive_action_policy,
    enabled = true,
    updated_at = now();

-- Harden the existing workforce tables against anonymous JWTs.
drop policy if exists "agent_runs_deny_anonymous" on public.agent_runs;
create policy "agent_runs_deny_anonymous"
  on public.agent_runs as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);

drop policy if exists "agent_tasks_deny_anonymous" on public.agent_tasks;
create policy "agent_tasks_deny_anonymous"
  on public.agent_tasks as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);
