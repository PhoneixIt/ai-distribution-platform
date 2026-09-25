-- Fix RLS policies created after the helper functions were moved into the private schema.
-- The public helper functions are intentionally not executable by authenticated clients.
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
        coalesce(qual, '') ~ '(^|[^.[:alnum:]_])is_org_member\\('
        or coalesce(with_check, '') ~ '(^|[^.[:alnum:]_])is_org_member\\('
        or coalesce(qual, '') ~ '(^|[^.[:alnum:]_])is_org_admin\\('
        or coalesce(with_check, '') ~ '(^|[^.[:alnum:]_])is_org_admin\\('
        or coalesce(qual, '') ~ '(^|[^.[:alnum:]_])is_org_owner\\('
        or coalesce(with_check, '') ~ '(^|[^.[:alnum:]_])is_org_owner\\('
      )
  loop
    new_qual := policy_row.qual;
    new_check := policy_row.with_check;

    if new_qual is not null then
      new_qual := regexp_replace(new_qual, '(^|[^.[:alnum:]_])is_org_member\\(', '\\1private.is_org_member(', 'g');
      new_qual := regexp_replace(new_qual, '(^|[^.[:alnum:]_])is_org_admin\\(', '\\1private.is_org_admin(', 'g');
      new_qual := regexp_replace(new_qual, '(^|[^.[:alnum:]_])is_org_owner\\(', '\\1private.is_org_owner(', 'g');
      execute format('alter policy %I on public.%I using (%s)', policy_row.policyname, policy_row.tablename, new_qual);
    end if;

    if new_check is not null then
      new_check := regexp_replace(new_check, '(^|[^.[:alnum:]_])is_org_member\\(', '\\1private.is_org_member(', 'g');
      new_check := regexp_replace(new_check, '(^|[^.[:alnum:]_])is_org_admin\\(', '\\1private.is_org_admin(', 'g');
      new_check := regexp_replace(new_check, '(^|[^.[:alnum:]_])is_org_owner\\(', '\\1private.is_org_owner(', 'g');
      execute format('alter policy %I on public.%I with check (%s)', policy_row.policyname, policy_row.tablename, new_check);
    end if;
  end loop;
end $$;

-- Expand the mission state machine so empty/partial discovery is represented explicitly.
alter table public.missions drop constraint if exists missions_current_stage_check;
alter table public.missions
  add constraint missions_current_stage_check
  check (current_stage in (
    'defined','planning','discovering','researching','verifying','qualifying','scoring',
    'matching','preparing_actions','dossier_ready','contacts_researched','draft_ready',
    'waiting_approval','approved','executing','sent','tracking','completed','no_results',
    'blocked','failed'
  ));

alter table public.missions drop constraint if exists missions_status_check;
alter table public.missions
  add constraint missions_status_check
  check (status in (
    'draft','planning','running','waiting_approval','completed','no_results','blocked',
    'failed','cancelled'
  ));
