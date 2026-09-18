create table if not exists public.opportunity_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  pricing_record_id uuid references public.pricing_records(id) on delete set null,
  quantity numeric(18,4) not null default 1,
  unit_price numeric(18,4) not null,
  discount_percent numeric(7,4) not null default 0,
  currency text not null default 'USD',
  line_revenue numeric(18,2) not null,
  status text not null default 'proposed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, product_id),
  check (quantity > 0),
  check (unit_price >= 0),
  check (discount_percent between 0 and 100),
  check (line_revenue >= 0),
  check (status in ('proposed','active','won','lost','cancelled'))
);

create index if not exists opportunity_products_org_id_idx
  on public.opportunity_products(org_id);
create index if not exists opportunity_products_opportunity_id_idx
  on public.opportunity_products(opportunity_id);
create index if not exists opportunity_products_product_id_idx
  on public.opportunity_products(product_id);
create index if not exists opportunity_products_pricing_record_id_idx
  on public.opportunity_products(pricing_record_id);

alter table public.opportunity_products enable row level security;

revoke all on table public.opportunity_products from anon, authenticated;
grant select, insert, update, delete on table public.opportunity_products to authenticated;

create policy "opportunity_products_members_select"
  on public.opportunity_products for select to authenticated
  using ((select public.is_org_member(org_id)));

create policy "opportunity_products_members_insert"
  on public.opportunity_products for insert to authenticated
  with check ((select public.is_org_member(org_id)));

create policy "opportunity_products_members_update"
  on public.opportunity_products for update to authenticated
  using ((select public.is_org_member(org_id)))
  with check ((select public.is_org_member(org_id)));

create policy "opportunity_products_admin_delete"
  on public.opportunity_products for delete to authenticated
  using ((select public.is_org_admin(org_id)));

create policy "opportunity_products_deny_anonymous"
  on public.opportunity_products as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);

create trigger opportunity_products_updated_at
  before update on public.opportunity_products
  for each row execute function private.set_business_updated_at();

create trigger opportunity_products_audit
  after insert or update or delete on public.opportunity_products
  for each row execute function private.audit_business_change();
