-- The RLS-safe helper lives in the private schema. The legacy public
-- SECURITY DEFINER helper is not part of the application API surface.
revoke execute on function public.is_org_member(uuid) from public, anon, authenticated;
