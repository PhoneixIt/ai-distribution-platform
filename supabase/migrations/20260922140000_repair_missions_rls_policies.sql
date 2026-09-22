grant select, insert, update on table public.missions to authenticated;

drop policy if exists "missions_members_select" on public.missions;
create policy "missions_members_select"
  on public.missions for select to authenticated
  using ((select public.is_org_member(org_id)));

drop policy if exists "missions_members_insert" on public.missions;
create policy "missions_members_insert"
  on public.missions for insert to authenticated
  with check ((select public.is_org_member(org_id)) and created_by = (select auth.uid()));

drop policy if exists "missions_members_update" on public.missions;
create policy "missions_members_update"
  on public.missions for update to authenticated
  using ((select public.is_org_member(org_id)))
  with check ((select public.is_org_member(org_id)));

drop policy if exists "missions_deny_anonymous" on public.missions;
create policy "missions_deny_anonymous"
  on public.missions as restrictive
  for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) = false);
