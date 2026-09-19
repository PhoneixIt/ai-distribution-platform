-- Atomic approval decision + durable action enqueue.
-- The RPC is the only client-facing write boundary for approval decisions.

create or replace function private.decide_agent_approval(
  p_approval_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_approval public.agent_approvals%rowtype;
  v_org_id uuid;
  v_queue public.agent_action_queue%rowtype;
  v_remaining integer;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using message = 'Authentication required.';
  end if;

  if p_action not in ('approve','reject') then
    raise exception using message = 'Action must be approve or reject.';
  end if;

  select a.*
    into v_approval
  from public.agent_approvals a
  where a.id = p_approval_id
    and a.status = 'pending'
  for update;

  if not found then
    raise exception using message = 'Pending approval not found.';
  end if;

  v_org_id := v_approval.org_id;

  if not exists (
    select 1
    from public.org_members m
    where m.org_id = v_org_id
      and m.user_id = v_user_id
      and m.status = 'active'
      and m.role in ('owner','admin')
  ) then
    raise exception using message = 'Workspace admin approval is required.';
  end if;

  update public.agent_approvals
     set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
         decided_by = v_user_id,
         decided_at = now(),
         notes = nullif(left(coalesce(p_notes,''), 2000), '')
   where id = p_approval_id;

  if p_action = 'approve' then
    insert into public.agent_action_queue (
      org_id,
      approval_id,
      run_id,
      task_id,
      action_type,
      payload,
      provider,
      status,
      idempotency_key
    )
    values (
      v_approval.org_id,
      v_approval.id,
      v_approval.run_id,
      v_approval.task_id,
      v_approval.action_type,
      coalesce(v_approval.payload, '{}'::jsonb),
      'unconfigured',
      'queued',
      'approval:' || v_approval.id::text
    )
    on conflict (approval_id) do update
      set updated_at = now()
    returning * into v_queue;

    if v_approval.task_id is not null then
      update public.agent_tasks
         set approval_status = 'approved',
             status = 'waiting',
             completed_at = null,
             error_message = null
       where id = v_approval.task_id
         and org_id = v_org_id;
    end if;
  else
    if v_approval.task_id is not null then
      update public.agent_tasks
         set approval_status = 'rejected',
             status = 'completed',
             completed_at = now(),
             error_message = 'Human approval rejected.'
       where id = v_approval.task_id
         and org_id = v_org_id;
    end if;
  end if;

  select count(*)
    into v_remaining
  from public.agent_approvals a
  where a.run_id = v_approval.run_id
    and a.org_id = v_org_id
    and a.status = 'pending';

  if v_remaining = 0 then
    update public.agent_runs
       set status = case when p_action = 'approve' then 'partial' else 'completed' end
     where id = v_approval.run_id
       and org_id = v_org_id;
  end if;

  return jsonb_build_object(
    'approval', to_jsonb((select a from public.agent_approvals a where a.id = p_approval_id)),
    'queue', case when p_action = 'approve' then to_jsonb(v_queue) else null end,
    'remaining_pending', v_remaining,
    'execution_status', case when p_action = 'approve' then 'awaiting_execution' else 'rejected' end
  );
end;
$$;

revoke all on function private.decide_agent_approval(uuid,text,text) from public, anon;
grant execute on function private.decide_agent_approval(uuid,text,text) to authenticated;

revoke update on public.agent_approvals from authenticated;
drop policy if exists agent_approvals_admin_update on public.agent_approvals;
