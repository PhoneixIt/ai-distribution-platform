create schema if not exists private;

create table if not exists public.org_vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  relationship_type text not null default 'vendor',
  status text not null default 'prospect',
  regions text[] not null default '{}',
  agreement_status text,
  start_date date,
  end_date date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, vendor_id),
  check (status in ('prospect','onboarding','active','paused','inactive','terminated'))
);

create table if not exists public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  full_name text not null,
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  is_primary boolean not null default false,
  status text not null default 'active',
  source_reference text,
  last_verified timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('active','inactive','unverified'))
);

create unique index if not exists vendor_contacts_org_vendor_email_uq
  on public.vendor_contacts(org_id, vendor_id, lower(email))
  where email is not null;

create table if not exists public.distributor_partners (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  distributor_id uuid not null references public.distributors(id) on delete restrict,
  partner_id uuid not null references public.partners(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  relationship_type text not null default 'reseller',
  tier text,
  status text not null default 'prospect',
  regions text[] not null default '{}',
  start_date date,
  end_date date,
  last_activity_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, distributor_id, partner_id),
  check (status in ('prospect','onboarding','active','dormant','paused','inactive','terminated'))
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  activity_type text not null,
  status text not null default 'completed',
  subject text not null,
  body text,
  occurred_at timestamptz not null default now(),
  due_at timestamptz,
  vendor_id uuid references public.vendors(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  vendor_contact_id uuid references public.vendor_contacts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (activity_type in ('call','email','meeting','note','status_change','research','other')),
  check (status in ('planned','completed','cancelled'))
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  status text not null default 'scheduled',
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  meeting_url text,
  vendor_id uuid references public.vendors(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  notes text,
  outcome text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('scheduled','completed','cancelled','no_show'))
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open',
  priority integer not null default 3,
  due_at timestamptz,
  completed_at timestamptz,
  vendor_id uuid references public.vendors(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  meeting_id uuid references public.meetings(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('open','in_progress','blocked','completed','cancelled')),
  check (priority between 1 and 5)
);

create table if not exists public.pricing_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  partner_id uuid references public.partners(id) on delete set null,
  price_type text not null default 'cost',
  currency text not null default 'USD',
  unit_price numeric(18,4) not null,
  discount_percent numeric(7,4),
  margin_percent numeric(7,4),
  min_quantity numeric(18,4),
  valid_from date not null default current_date,
  valid_to date,
  status text not null default 'active',
  pricing_model text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_type in ('list','cost','reseller','customer','special')),
  check (status in ('draft','active','expired','superseded')),
  check (unit_price >= 0),
  check (discount_percent is null or discount_percent between 0 and 100),
  check (margin_percent is null or margin_percent between -100 and 100),
  check (valid_to is null or valid_to >= valid_from)
);

create table if not exists public.partner_performance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  revenue numeric(18,2) not null default 0,
  pipeline_value numeric(18,2) not null default 0,
  opportunities_created integer not null default 0,
  opportunities_won integer not null default 0,
  activity_count integer not null default 0,
  last_activity_at timestamptz,
  health_score numeric(5,2),
  health_status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, partner_id, period_start, period_end),
  check (period_end >= period_start),
  check (revenue >= 0),
  check (pipeline_value >= 0),
  check (opportunities_created >= 0),
  check (opportunities_won >= 0),
  check (activity_count >= 0),
  check (health_score is null or health_score between 0 and 100)
);

create table if not exists public.business_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  title text,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (entity_type in ('vendor','product','partner','customer','opportunity','meeting','task'))
);

alter table public.recommendations
  alter column session_id drop not null,
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists status text not null default 'proposed',
  add column if not exists requires_approval boolean not null default true,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists executed_at timestamptz,
  add column if not exists action_type text;

alter table public.recommendations
  add constraint recommendations_status_check
  check (status in ('proposed','approved','rejected','executed','expired'));

alter table public.recommendations
  add constraint recommendations_entity_type_check
  check (entity_type is null or entity_type in ('vendor','product','partner','customer','opportunity','activity','meeting','task'));

alter table public.recommendations
  add constraint recommendations_context_check
  check (org_id is not null or session_id is not null);

create or replace function private.set_business_updated_at()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_business_updated_at() from public, anon, authenticated;

create or replace function private.audit_business_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  row_data jsonb;
  old_data jsonb;
  new_data jsonb;
  row_org_id uuid;
  row_entity_id uuid;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
    old_data := to_jsonb(old);
    new_data := null;
  else
    row_data := to_jsonb(new);
    old_data := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    new_data := to_jsonb(new);
  end if;

  row_org_id := nullif(row_data ->> 'org_id', '')::uuid;
  row_entity_id := nullif(row_data ->> 'id', '')::uuid;

  if row_org_id is not null then
    insert into public.audit_log (org_id, user_id, action, entity_type, entity_id, metadata)
    values (
      row_org_id,
      auth.uid(),
      lower(tg_op),
      tg_table_name,
      row_entity_id,
      jsonb_build_object('before', old_data, 'after', new_data)
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.audit_business_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'org_vendors','vendor_contacts','distributor_partners','activities',
    'meetings','tasks','pricing_records','partner_performance','business_notes'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function private.set_business_updated_at()', t, t);
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.audit_business_change()', t, t);
  end loop;
end $$;

drop trigger if exists recommendations_audit on public.recommendations;
create trigger recommendations_audit after insert or update or delete on public.recommendations
for each row execute function private.audit_business_change();

revoke all on table public.org_vendors, public.vendor_contacts, public.distributor_partners,
  public.activities, public.meetings, public.tasks, public.pricing_records,
  public.partner_performance, public.business_notes, public.recommendations from anon;

grant select, insert, update, delete on table
  public.org_vendors, public.vendor_contacts, public.distributor_partners,
  public.activities, public.meetings, public.tasks, public.pricing_records,
  public.partner_performance, public.business_notes, public.recommendations to authenticated;

alter table public.org_vendors enable row level security;
alter table public.vendor_contacts enable row level security;
alter table public.distributor_partners enable row level security;
alter table public.activities enable row level security;
alter table public.meetings enable row level security;
alter table public.tasks enable row level security;
alter table public.pricing_records enable row level security;
alter table public.partner_performance enable row level security;
alter table public.business_notes enable row level security;
alter table public.recommendations enable row level security;

create policy "org_vendors_members_select" on public.org_vendors for select to authenticated using ((select public.is_org_member(org_id)));
create policy "org_vendors_members_insert" on public.org_vendors for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "org_vendors_members_update" on public.org_vendors for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "org_vendors_admin_delete" on public.org_vendors for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "vendor_contacts_members_select" on public.vendor_contacts for select to authenticated using ((select public.is_org_member(org_id)));
create policy "vendor_contacts_members_insert" on public.vendor_contacts for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "vendor_contacts_members_update" on public.vendor_contacts for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "vendor_contacts_admin_delete" on public.vendor_contacts for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "distributor_partners_members_select" on public.distributor_partners for select to authenticated using ((select public.is_org_member(org_id)));
create policy "distributor_partners_members_insert" on public.distributor_partners for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "distributor_partners_members_update" on public.distributor_partners for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "distributor_partners_admin_delete" on public.distributor_partners for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "activities_members_select" on public.activities for select to authenticated using ((select public.is_org_member(org_id)));
create policy "activities_members_insert" on public.activities for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "activities_members_update" on public.activities for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "activities_admin_delete" on public.activities for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "meetings_members_select" on public.meetings for select to authenticated using ((select public.is_org_member(org_id)));
create policy "meetings_members_insert" on public.meetings for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "meetings_members_update" on public.meetings for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "meetings_admin_delete" on public.meetings for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "tasks_members_select" on public.tasks for select to authenticated using ((select public.is_org_member(org_id)));
create policy "tasks_members_insert" on public.tasks for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "tasks_members_update" on public.tasks for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "tasks_admin_delete" on public.tasks for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "pricing_records_members_select" on public.pricing_records for select to authenticated using ((select public.is_org_member(org_id)));
create policy "pricing_records_members_insert" on public.pricing_records for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "pricing_records_members_update" on public.pricing_records for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "pricing_records_admin_delete" on public.pricing_records for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "partner_performance_members_select" on public.partner_performance for select to authenticated using ((select public.is_org_member(org_id)));
create policy "partner_performance_members_insert" on public.partner_performance for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "partner_performance_members_update" on public.partner_performance for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "partner_performance_admin_delete" on public.partner_performance for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "business_notes_members_select" on public.business_notes for select to authenticated using ((select public.is_org_member(org_id)));
create policy "business_notes_members_insert" on public.business_notes for insert to authenticated with check ((select public.is_org_member(org_id)));
create policy "business_notes_members_update" on public.business_notes for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "business_notes_admin_delete" on public.business_notes for delete to authenticated using ((select public.is_org_admin(org_id)));

create policy "recommendations_members_select" on public.recommendations for select to authenticated using (org_id is not null and (select public.is_org_member(org_id)));
create policy "recommendations_members_insert" on public.recommendations for insert to authenticated with check (org_id is not null and (select public.is_org_member(org_id)));
create policy "recommendations_members_update" on public.recommendations for update to authenticated using (org_id is not null and (select public.is_org_member(org_id))) with check (org_id is not null and (select public.is_org_member(org_id)));
create policy "recommendations_admin_delete" on public.recommendations for delete to authenticated using (org_id is not null and (select public.is_org_admin(org_id)));

create index if not exists org_vendors_org_id_idx on public.org_vendors(org_id);
create index if not exists org_vendors_vendor_id_idx on public.org_vendors(vendor_id);
create index if not exists vendor_contacts_org_id_idx on public.vendor_contacts(org_id);
create index if not exists vendor_contacts_vendor_id_idx on public.vendor_contacts(vendor_id);
create index if not exists distributor_partners_org_id_idx on public.distributor_partners(org_id);
create index if not exists distributor_partners_partner_id_idx on public.distributor_partners(partner_id);
create index if not exists distributor_partners_distributor_id_idx on public.distributor_partners(distributor_id);
create index if not exists activities_org_id_occurred_at_idx on public.activities(org_id, occurred_at desc);
create index if not exists activities_opportunity_id_idx on public.activities(opportunity_id);
create index if not exists activities_partner_id_idx on public.activities(partner_id);
create index if not exists activities_customer_id_idx on public.activities(customer_id);
create index if not exists meetings_org_id_start_at_idx on public.meetings(org_id, start_at);
create index if not exists meetings_opportunity_id_idx on public.meetings(opportunity_id);
create index if not exists tasks_org_id_status_due_idx on public.tasks(org_id, status, due_at);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists pricing_records_org_id_product_id_idx on public.pricing_records(org_id, product_id);
create index if not exists pricing_records_vendor_id_idx on public.pricing_records(vendor_id);
create index if not exists partner_performance_org_partner_period_idx on public.partner_performance(org_id, partner_id, period_start desc);
create index if not exists business_notes_org_entity_idx on public.business_notes(org_id, entity_type, entity_id);
create index if not exists recommendations_org_entity_idx on public.recommendations(org_id, entity_type, entity_id);
