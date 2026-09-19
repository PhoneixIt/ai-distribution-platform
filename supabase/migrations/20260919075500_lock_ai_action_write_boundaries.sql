-- Only the guarded RPC may create or decide executable AI actions.

revoke insert on public.agent_action_queue from authenticated;
drop policy if exists agent_action_queue_admin_insert on public.agent_action_queue;

revoke all on function private.decide_agent_approval(uuid,text,text) from public, anon, authenticated;

create or replace function public.decide_agent_approval(
  p_approval_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.decide_agent_approval(p_approval_id, p_action, p_notes);
$$;

revoke all on function public.decide_agent_approval(uuid,text,text) from public, anon;
grant execute on function public.decide_agent_approval(uuid,text,text) to authenticated;
