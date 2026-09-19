alter table public.partners
  add column if not exists created_by uuid references auth.users(id);

alter table public.partners
  alter column created_by set default auth.uid();

create index if not exists partners_created_by_idx
  on public.partners (created_by);

drop policy if exists partners_members_insert on public.partners;
create policy partners_members_insert
  on public.partners
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and is_verified = false
    and verification_status = 'pending'
    and source_type in ('manual', 'ai-discovery')
  );

drop policy if exists partners_own_update on public.partners;
create policy partners_own_update
  on public.partners
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (
    created_by = (select auth.uid())
    and is_verified = false
    and verification_status = 'pending'
  );

drop policy if exists partners_own_delete on public.partners;
create policy partners_own_delete
  on public.partners
  for delete
  to authenticated
  using (created_by = (select auth.uid()));

create unique index if not exists partners_website_unique_idx
  on public.partners (lower(website))
  where website is not null;
