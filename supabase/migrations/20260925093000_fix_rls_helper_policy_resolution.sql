-- PortAi RLS helper hardening
-- The legacy public SECURITY DEFINER is intentionally not executable.
-- All exposed-table policies must resolve org membership helpers through private.

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
        (coalesce(qual, '') like '%is_org_member(%' and coalesce(qual, '') not like '%private.is_org_member(%')
        or (coalesce(with_check, '') like '%is_org_member(%' and coalesce(with_check, '') not like '%private.is_org_member(%')
        or (coalesce(qual, '') like '%is_org_admin(%' and coalesce(qual, '') not like '%private.is_org_admin(%')
        or (coalesce(with_check, '') like '%is_org_admin(%' and coalesce(with_check, '') not like '%private.is_org_admin(%')
        or (coalesce(qual, '') like '%is_org_owner(%' and coalesce(qual, '') not like '%private.is_org_owner(%')
        or (coalesce(with_check, '') like '%is_org_owner(%' and coalesce(with_check, '') not like '%private.is_org_owner(%')
      )
  loop
    if policy_row.qual is not null then
      new_qual := replace(replace(replace(policy_row.qual, 'is_org_member(', 'private.is_org_member('), 'is_org_admin(', 'private.is_org_admin('), 'is_org_owner(', 'private.is_org_owner(');
      new_qual := replace(new_qual, 'private.private.', 'private.');
      execute format('alter policy %I on public.%I using (%s)', policy_row.policyname, policy_row.tablename, new_qual);
    end if;
    if policy_row.with_check is not null then
      new_check := replace(replace(replace(policy_row.with_check, 'is_org_member(', 'private.is_org_member('), 'is_org_admin(', 'private.is_org_admin('), 'is_org_owner(', 'private.is_org_owner(');
      new_check := replace(new_check, 'private.private.', 'private.');
      execute format('alter policy %I on public.%I with check (%s)', policy_row.policyname, policy_row.tablename, new_check);
    end if;
  end loop;
end $$;

revoke execute on function public.is_org_member(uuid) from public, anon, authenticated;
