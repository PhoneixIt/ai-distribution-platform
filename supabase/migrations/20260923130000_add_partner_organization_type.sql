-- Add the generic partner workspace type while keeping legacy partner types valid.
alter table public.organizations
  drop constraint if exists organizations_organization_type_check;

alter table public.organizations
  add constraint organizations_organization_type_check
  check (
    organization_type is null
    or organization_type in (
      'vendor',
      'distributor',
      'partner',
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
