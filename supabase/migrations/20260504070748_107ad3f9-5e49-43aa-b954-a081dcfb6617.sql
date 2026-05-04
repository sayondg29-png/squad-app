REVOKE EXECUTE ON FUNCTION public.join_squad(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_squad(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_squad(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_squad(uuid) TO authenticated;