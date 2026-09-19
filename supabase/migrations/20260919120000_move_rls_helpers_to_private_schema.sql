
create or replace function private.is_org_admin(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.org_members
    where public.org_members.org_id = p_org_id
      and public.org_members.user_id = auth.uid()
      and public.org_members.status = 'active'
      and public.org_members.role in ('owner','admin')
  );
$$;

create or replace function private.is_org_owner(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.org_members
    where public.org_members.org_id = p_org_id
      and public.org_members.user_id = auth.uid()
      and public.org_members.status = 'active'
      and public.org_members.role = 'owner'
  );
$$;

grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.is_org_owner(uuid) to authenticated;

do $$
declare
  policy_row record;
  new_qual text;
  new_check text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%is_org_admin(%'
        or coalesce(with_check, '') like '%is_org_admin(%'
        or coalesce(qual, '') like '%is_org_owner(%'
        or coalesce(with_check, '') like '%is_org_owner(%'
        or coalesce(qual, '') like '%is_org_member(%'
        or coalesce(with_check, '') like '%is_org_member(%'
      )
  loop
    new_qual := policy_row.qual;
    new_check := policy_row.with_check;

    if new_qual is not null then
      new_qual := replace(new_qual, 'private.is_org_member(', 'is_org_member(');
      new_qual := replace(new_qual, 'private.is_org_admin(', 'is_org_admin(');
      new_qual := replace(new_qual, 'private.is_org_owner(', 'is_org_owner(');
      new_qual := replace(new_qual, 'is_org_member(', 'private.is_org_member(');
      new_qual := replace(new_qual, 'is_org_admin(', 'private.is_org_admin(');
      new_qual := replace(new_qual, 'is_org_owner(', 'private.is_org_owner(');
      execute format('alter policy %I on public.%I using (%s)', policy_row.policyname, policy_row.tablename, new_qual);
    end if;

    if new_check is not null then
      new_check := replace(new_check, 'private.is_org_member(', 'is_org_member(');
      new_check := replace(new_check, 'private.is_org_admin(', 'is_org_admin(');
      new_check := replace(new_check, 'private.is_org_owner(', 'is_org_owner(');
      new_check := replace(new_check, 'is_org_member(', 'private.is_org_member(');
      new_check := replace(new_check, 'is_org_admin(', 'private.is_org_admin(');
      new_check := replace(new_check, 'is_org_owner(', 'private.is_org_owner(');
      execute format('alter policy %I on public.%I with check (%s)', policy_row.policyname, policy_row.tablename, new_check);
    end if;
  end loop;
end $$;

