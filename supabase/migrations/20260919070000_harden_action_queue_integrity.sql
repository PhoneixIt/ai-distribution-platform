-- Keep the action queue append-only to authenticated clients.
-- Approved actions are queued durably; only a trusted external executor should change execution state.
revoke update on public.agent_action_queue from authenticated;
drop policy if exists agent_action_queue_admin_update on public.agent_action_queue;

drop trigger if exists agent_action_queue_audit on public.agent_action_queue;
create trigger agent_action_queue_audit
  after insert on public.agent_action_queue
  for each row execute function private.audit_business_change();

drop trigger if exists agent_runs_audit on public.agent_runs;
create trigger agent_runs_audit
  after insert or update on public.agent_runs
  for each row execute function private.audit_business_change();
