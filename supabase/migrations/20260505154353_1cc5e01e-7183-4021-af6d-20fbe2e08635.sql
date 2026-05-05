CREATE OR REPLACE FUNCTION public.join_squad_by_id(_squad_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _exists uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO _exists FROM public.squads WHERE id = _squad_id LIMIT 1;
  IF _exists IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;
  UPDATE public.squads
    SET members = ARRAY(SELECT DISTINCT unnest(members || _uid))
    WHERE id = _squad_id;
  UPDATE public.profiles SET squad_id = _squad_id WHERE id = _uid;
  RETURN _squad_id;
END; $$;