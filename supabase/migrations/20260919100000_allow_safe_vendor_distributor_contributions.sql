
alter table public.vendors
  add column if not exists created_by uuid references auth.users(id);
alter table public.vendors
  alter column created_by set default auth.uid();

alter table public.distributors
  add column if not exists created_by uuid references auth.users(id);
alter table public.distributors
  alter column created_by set default auth.uid();

create index if not exists vendors_created_by_idx on public.vendors (created_by);
create index if not exists distributors_created_by_idx on public.distributors (created_by);

drop policy if exists vendors_members_insert on public.vendors;
create policy vendors_members_insert
  on public.vendors for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and source_type = 'manual'
  );

drop policy if exists vendors_own_update on public.vendors;
create policy vendors_own_update
  on public.vendors for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists vendors_own_delete on public.vendors;
create policy vendors_own_delete
  on public.vendors for delete to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists distributors_members_insert on public.distributors;
create policy distributors_members_insert
  on public.distributors for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and source_type = 'manual'
  );

drop policy if exists distributors_own_update on public.distributors;
create policy distributors_own_update
  on public.distributors for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists distributors_own_delete on public.distributors;
create policy distributors_own_delete
  on public.distributors for delete to authenticated
  using (created_by = (select auth.uid()));

create unique index if not exists vendors_website_unique_idx
  on public.vendors (lower(website))
  where website is not null;

create unique index if not exists distributors_website_unique_idx
  on public.distributors (lower(website))
  where website is not null;

