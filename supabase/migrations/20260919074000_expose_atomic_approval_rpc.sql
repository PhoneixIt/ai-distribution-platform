-- Narrow public RPC wrapper for approval decisions.
-- The implementation lives in the private schema; anonymous callers are explicitly denied.

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
