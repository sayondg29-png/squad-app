
UPDATE public.squads SET invite_code = upper(invite_code) WHERE invite_code <> upper(invite_code);

CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL,
  minutes integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (squad_id, user_id)
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read checkins"
  ON public.checkins FOR SELECT TO authenticated
  USING (squad_id = public.user_squad(auth.uid()));

CREATE POLICY "Users insert own checkin"
  ON public.checkins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND squad_id = public.user_squad(auth.uid()));

CREATE POLICY "Users update own checkin"
  ON public.checkins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND squad_id = public.user_squad(auth.uid()));

CREATE POLICY "Users delete own checkin"
  ON public.checkins FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
ALTER TABLE public.checkins REPLICA IDENTITY FULL;
