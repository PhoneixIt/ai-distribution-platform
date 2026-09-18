-- Live RLS verification is performed against the production schema before release.
-- These checks document the contract for the tenant-owned business foundation.
-- The project currently has remote migration history that is not fully mirrored
-- in Git, so this test is intentionally kept as a contract until the migration
-- baseline is reconciled and the full pgTAP suite can run from a clean database.

-- Required tables:
-- org_vendors, vendor_contacts, distributor_partners, activities, meetings,
-- tasks, pricing_records, partner_performance, business_notes

-- Required properties:
-- * RLS enabled on every table.
-- * authenticated-only grants.
-- * org member SELECT/INSERT/UPDATE.
-- * owner/admin DELETE.
-- * non-member reads/writes denied.
-- * business changes produce audit_log rows.
