-- Production readiness hardening for security, performance and durable AI execution control.

revoke usage on schema private from public;
grant usage on schema private to authenticated;

revoke execute on function private.is_org_admin(uuid) from public, anon;
revoke execute on function private.is_org_member(uuid) from public, anon;
revoke execute on function private.is_org_owner(uuid) from public, anon;
grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_owner(uuid) to authenticated;

revoke all on all tables in schema public from anon;
revoke references, trigger, truncate on all tables in schema public from authenticated;

do $$
declare
  p record;
  q text;
  c text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname='public'
      and (
        coalesce(qual,'') like '%auth.uid()%'
        or coalesce(with_check,'') like '%auth.uid()%'
        or coalesce(qual,'') like '%auth.jwt()%'
        or coalesce(with_check,'') like '%auth.jwt()%'
      )
  loop
    q := p.qual;
    c := p.with_check;

    if q is not null and q like '%auth.uid()%' and q not like '%SELECT auth.uid()%' then
      q := replace(q, 'auth.uid()', '(select auth.uid())');
    end if;
    if q is not null and q like '%auth.jwt()%' and q not like '%SELECT auth.jwt()%' then
      q := replace(q, 'auth.jwt()', '(select auth.jwt())');
    end if;
    if c is not null and c like '%auth.uid()%' and c not like '%SELECT auth.uid()%' then
      c := replace(c, 'auth.uid()', '(select auth.uid())');
    end if;
    if c is not null and c like '%auth.jwt()%' and c not like '%SELECT auth.jwt()%' then
      c := replace(c, 'auth.jwt()', '(select auth.jwt())');
    end if;

    if q is not null and q <> p.qual then
      execute format('alter policy %I on public.%I using (%s)', p.policyname, p.tablename, q);
    end if;
    if c is not null and c <> p.with_check then
      execute format('alter policy %I on public.%I with check (%s)', p.policyname, p.tablename, c);
    end if;
  end loop;
end $$;

drop policy if exists demo_company_profiles_deny_all on public.demo_company_profiles;
create policy demo_company_profiles_deny_all
  on public.demo_company_profiles as restrictive
  for all to authenticated
  using (false)
  with check (false);

drop index if exists public.idx_sessions_token;
drop index if exists public.idx_assessment_recs_assessment;
drop index if exists public.idx_assessments_org_id;
drop index if exists public.idx_relationships_from;
drop index if exists public.idx_relationships_to;
drop index if exists public.idx_discovery_candidates_run_rank;
drop index if exists public.idx_recs_session;

create index if not exists agent_approvals_task_idx
  on public.agent_approvals(task_id);
create index if not exists agent_approvals_tool_call_idx
  on public.agent_approvals(tool_call_id);
create index if not exists agent_approvals_requested_by_idx
  on public.agent_approvals(requested_by);
create index if not exists agent_approvals_decided_by_idx
  on public.agent_approvals(decided_by);
create index if not exists agent_tool_calls_task_idx
  on public.agent_tool_calls(task_id);
create index if not exists agent_runs_org_idx
  on public.agent_runs(org_id, created_at desc);
create index if not exists agent_runs_initiated_by_idx
  on public.agent_runs(initiated_by);
create index if not exists agent_tasks_parent_idx
  on public.agent_tasks(parent_task_id);
create index if not exists agent_memories_source_run_idx
  on public.agent_memories(source_run_id);
create index if not exists agent_memories_source_task_idx
  on public.agent_memories(source_task_id);
create index if not exists tasks_org_due_idx
  on public.tasks(org_id, due_at);
create index if not exists opportunity_products_opportunity_idx
  on public.opportunity_products(opportunity_id);
create index if not exists opportunity_products_product_idx
  on public.opportunity_products(product_id);
create index if not exists opportunity_products_pricing_idx
  on public.opportunity_products(pricing_record_id);
create index if not exists pricing_records_product_idx
  on public.pricing_records(product_id);
create index if not exists pricing_records_vendor_idx
  on public.pricing_records(vendor_id);
create index if not exists distributor_partners_partner_idx
  on public.distributor_partners(partner_id);
create index if not exists distributor_partners_distributor_idx
  on public.distributor_partners(distributor_id);
create index if not exists vendor_contacts_vendor_idx
  on public.vendor_contacts(vendor_id);
create index if not exists org_vendors_vendor_idx
  on public.org_vendors(vendor_id);
create index if not exists org_vendors_owner_idx
  on public.org_vendors(owner_id);
create index if not exists org_distributors_owner_idx
  on public.org_distributors(owner_id);

create table if not exists public.agent_action_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  approval_id uuid not null unique references public.agent_approvals(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  provider text not null default 'unconfigured',
  status text not null default 'queued'
    check (status in ('queued','processing','completed','failed','cancelled')),
  idempotency_key text not null unique,
  attempts integer not null default 0 check (attempts >= 0),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  executed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_action_queue_org_status_idx
  on public.agent_action_queue(org_id, status, scheduled_at);
create index if not exists agent_action_queue_run_idx
  on public.agent_action_queue(run_id, created_at desc);

alter table public.agent_action_queue enable row level security;
revoke all on public.agent_action_queue from anon;
revoke all on public.agent_action_queue from authenticated;
grant select, insert, update on public.agent_action_queue to authenticated;

drop policy if exists agent_action_queue_members_select on public.agent_action_queue;
create policy agent_action_queue_members_select
  on public.agent_action_queue for select to authenticated
  using ((select private.is_org_member(org_id)));

drop policy if exists agent_action_queue_admin_insert on public.agent_action_queue;
create policy agent_action_queue_admin_insert
  on public.agent_action_queue for insert to authenticated
  with check ((select private.is_org_admin(org_id)));

drop policy if exists agent_action_queue_admin_update on public.agent_action_queue;
create policy agent_action_queue_admin_update
  on public.agent_action_queue for update to authenticated
  using ((select private.is_org_admin(org_id)))
  with check ((select private.is_org_admin(org_id)));

drop trigger if exists agent_action_queue_updated_at on public.agent_action_queue;
create trigger agent_action_queue_updated_at
  before update on public.agent_action_queue
  for each row execute function private.set_business_updated_at();
