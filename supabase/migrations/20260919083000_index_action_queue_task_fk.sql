-- Cover the action queue task foreign key for durable execution lookups.
create index if not exists agent_action_queue_task_idx
  on public.agent_action_queue(task_id);
