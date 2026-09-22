-- Keep mission execution active until outcome tracking is actually implemented.
create or replace function private.decide_mission_approval(p_approval_id uuid, p_action text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.mission_approvals%rowtype;
  v_user uuid := auth.uid();
  v_new_status text;
begin
  if v_user is null then raise exception using message = 'Authentication required.'; end if;
  if p_action not in ('approve','reject') then raise exception using message = 'Action must be approve or reject.'; end if;

  select * into v from public.mission_approvals where id = p_approval_id and status = 'pending' for update;
  if not found then raise exception using message = 'Pending mission approval not found.'; end if;

  if not exists (
    select 1 from public.org_members m
    where m.org_id = v.org_id and m.user_id = v_user and m.status = 'active' and m.role in ('owner','admin')
  ) then raise exception using message = 'Workspace admin approval is required.'; end if;

  update public.mission_approvals
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        decided_by = v_user, decided_at = now(),
        notes = nullif(left(coalesce(p_notes,''),2000),'')
  where id = v.id;

  update public.mission_outreach_drafts
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end
  where id = v.draft_id;

  v_new_status := case when p_action = 'approve' then 'running' else 'waiting_approval' end;
  update public.missions
    set current_stage = case when p_action = 'approve' then 'approved' else 'draft_ready' end,
        status = v_new_status,
        updated_at = now()
  where id = v.mission_id;

  return jsonb_build_object('approval', to_jsonb((select a from public.mission_approvals a where a.id = v.id)));
end;
$$;