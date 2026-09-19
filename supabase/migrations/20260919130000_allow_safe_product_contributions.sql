alter table public.products add column if not exists created_by uuid references auth.users(id);
alter table public.products alter column created_by set default auth.uid();
create index if not exists products_created_by_idx on public.products (created_by);
create unique index if not exists products_vendor_name_unique_idx on public.products (vendor_id, lower(name));
drop policy if exists products_members_insert on public.products;
create policy products_members_insert on public.products for insert to authenticated
  with check (created_by = (select auth.uid()) and source_type in ('manual', 'ai-discovery'));
drop policy if exists products_own_update on public.products;
create policy products_own_update on public.products for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
drop policy if exists products_own_delete on public.products;
create policy products_own_delete on public.products for delete to authenticated
  using (created_by = (select auth.uid()));
