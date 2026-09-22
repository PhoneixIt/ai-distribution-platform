-- PortAi ecosystem identity foundation
-- Non-destructive: adds organization identity and AI autonomy preferences.
alter table public.organizations
  add column if not exists organization_type text,
  add column if not exists organization_roles text[] not null default '{}',
  add column if not exists onboarding_status text not null default 'needs_setup',
  add column if not exists ai_autonomy_level text not null default 'balanced';

alter table public.organizations
  drop constraint if exists organizations_organization_type_check;
alter table public.organizations
  add constraint organizations_organization_type_check
  check (
    organization_type is null
    or organization_type in (
      'vendor',
      'distributor',
      'reseller',
      'var',
      'msp',
      'mssp',
      'system_integrator',
      'technology_partner',
      'service_provider',
      'customer',
      'other'
    )
  );

alter table public.organizations
  drop constraint if exists organizations_onboarding_status_check;
alter table public.organizations
  add constraint organizations_onboarding_status_check
  check (onboarding_status in ('needs_setup','in_progress','completed'));

alter table public.organizations
  drop constraint if exists organizations_ai_autonomy_level_check;
alter table public.organizations
  add constraint organizations_ai_autonomy_level_check
  check (ai_autonomy_level in ('conservative','balanced','autonomous'));

comment on column public.organizations.organization_type is
  'Primary ecosystem role used to determine onboarding, workspace, navigation, features, settings and AI behavior.';
comment on column public.organizations.organization_roles is
  'Additional ecosystem roles/capabilities the organization can operate as.';
comment on column public.organizations.onboarding_status is
  'Controls whether the role-aware workspace setup is complete.';
comment on column public.organizations.ai_autonomy_level is
  'Controls allowed automation boundaries; internal workflow remains automatic at every level.';
