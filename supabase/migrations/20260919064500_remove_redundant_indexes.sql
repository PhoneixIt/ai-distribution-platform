-- Remove redundant single-column indexes created during readiness hardening.
drop index if exists public.distributor_partners_distributor_idx;
drop index if exists public.distributor_partners_partner_idx;
drop index if exists public.opportunity_products_opportunity_idx;
drop index if exists public.opportunity_products_product_idx;
drop index if exists public.opportunity_products_pricing_idx;
drop index if exists public.org_vendors_vendor_idx;
drop index if exists public.pricing_records_vendor_idx;
drop index if exists public.vendor_contacts_vendor_idx;
