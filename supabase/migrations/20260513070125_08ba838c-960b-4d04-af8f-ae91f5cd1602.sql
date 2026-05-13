
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS meeting_time time,
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision;

CREATE TABLE IF NOT EXISTS public.live_locations (
  user_id uuid NOT NULL PRIMARY KEY,
  squad_id uuid NOT NULL,
  event_id uuid,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  is_sharing boolean NOT NULL DEFAULT true,
  last_updated timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read live_locations"
  ON public.live_locations FOR SELECT
  TO authenticated
  USING (squad_id = public.user_squad(auth.uid()));

CREATE POLICY "Users insert own live_location"
  ON public.live_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND squad_id = public.user_squad(auth.uid()));

CREATE POLICY "Users update own live_location"
  ON public.live_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own live_location"
  ON public.live_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
ALTER TABLE public.live_locations REPLICA IDENTITY FULL;
