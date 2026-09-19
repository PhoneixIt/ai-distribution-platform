-- Keep the public RPC invoker-only; privileged work remains behind the private,
-- admin-checked SECURITY DEFINER implementation.
grant execute on function private.decide_agent_approval(uuid,text,text) to authenticated;

create or replace function public.decide_agent_approval(
  p_approval_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.decide_agent_approval(p_approval_id, p_action, p_notes);
$$;

revoke all on function public.decide_agent_approval(uuid,text,text) from public, anon;
grant execute on function public.decide_agent_approval(uuid,text,text) to authenticated;
