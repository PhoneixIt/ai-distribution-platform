revoke execute on function public.is_org_admin(uuid) from public, anon, authenticated;
revoke execute on function public.is_org_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_org_owner(uuid) from public, anon, authenticated;
revoke execute on function public.save_assessment_recommendations(uuid, uuid, jsonb) from public, anon, authenticated;
