
-- Restrict profile reads to self or same-squad members
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable to self or squadmates"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (squad_id IS NOT NULL AND squad_id = public.user_squad(auth.uid()))
  );

-- Restrict squad reads to members or creator only (hides invite_code from outsiders)
DROP POLICY IF EXISTS "Squads readable by authenticated" ON public.squads;
CREATE POLICY "Squads readable by members"
  ON public.squads FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(members)
    OR auth.uid() = created_by
  );

-- Prevent expense creators from moving an expense to a different squad
DROP POLICY IF EXISTS "Creator updates expense" ON public.expenses;
CREATE POLICY "Creator updates expense"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by
    AND squad_id = public.user_squad(auth.uid())
  );

-- Lock down SECURITY DEFINER function execution to the roles that actually need them
REVOKE ALL ON FUNCTION public.join_squad(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_squad(text) TO authenticated;

REVOKE ALL ON FUNCTION public.join_squad_by_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_squad_by_id(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_squad(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_squad(uuid) TO authenticated;
