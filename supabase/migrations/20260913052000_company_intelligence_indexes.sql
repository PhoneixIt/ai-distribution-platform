create index if not exists idx_discovery_runs_user_created on public.discovery_runs (user_id, created_at desc);
create index if not exists idx_discovery_candidates_run_rank on public.discovery_candidates (discovery_run_id, rank);
create index if not exists idx_discovery_candidates_website on public.discovery_candidates (website) where website is not null;
create index if not exists idx_company_evidence_company_confidence on public.company_evidence (company_type, company_id, confidence desc);
create index if not exists idx_company_contacts_company_confidence on public.company_contacts (company_type, company_id, confidence desc);
create index if not exists idx_company_relationships_from on public.company_relationships (from_company_type, from_company_id);
create index if not exists idx_company_relationships_to on public.company_relationships (to_company_type, to_company_id);
create index if not exists idx_partner_website on public.partners (website) where website is not null;
