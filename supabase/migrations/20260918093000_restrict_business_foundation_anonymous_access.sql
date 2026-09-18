do $$
declare t text;
begin
  foreach t in array array[
    'org_vendors','vendor_contacts','distributor_partners','activities',
    'meetings','tasks','pricing_records','partner_performance','business_notes','recommendations'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_deny_anonymous', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select coalesce((auth.jwt()->>''is_anonymous'')::boolean,false)) = false) with check ((select coalesce((auth.jwt()->>''is_anonymous'')::boolean,false)) = false)',
      t || '_deny_anonymous', t
    );
  end loop;
end $$;
