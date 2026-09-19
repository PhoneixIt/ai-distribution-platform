
DO $$
DECLARE
  table_name text;
  protected_tables text[] := ARRAY[
    'advisory_sessions',
    'assessment_recommendations',
    'assessments',
    'audit_log',
    'company_contacts',
    'company_evidence',
    'company_relationships',
    'customer_notes',
    'customers',
    'discovery_candidates',
    'discovery_runs',
    'leads',
    'opportunities',
    'opportunity_partners',
    'org_members',
    'organizations',
    'partner_capabilities',
    'partner_matches',
    'products',
    'research_runs',
    'subscriptions',
    'technology_categories',
    'vendor_distributors',
    'vendor_partners',
    'partners',
    'vendors',
    'distributors'
  ];
BEGIN
  FOREACH table_name IN ARRAY protected_tables LOOP
    EXECUTE format('drop policy if exists %I on public.%I', table_name || '_deny_anonymous', table_name);
    EXECUTE format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false) = false)) with check ((select coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false) = false))',
      table_name || '_deny_anonymous',
      table_name
    );
  END LOOP;
END $$;

