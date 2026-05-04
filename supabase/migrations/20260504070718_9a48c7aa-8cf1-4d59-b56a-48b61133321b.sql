-- Drop old objects
DROP TABLE IF EXISTS public.live_locations CASCADE;
DROP TABLE IF EXISTS public.member_status CASCADE;
DROP TABLE IF EXISTS public.squad_members CASCADE;
DROP TABLE IF EXISTS public.squads CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.is_squad_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.find_squad_by_invite(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer,
  bio text,
  avatar_choice text,
  squad_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Squads
CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  members uuid[] NOT NULL DEFAULT '{}',
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squads readable by authenticated"
  ON public.squads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own squad"
  ON public.squads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Members update squad"
  ON public.squads FOR UPDATE TO authenticated USING (auth.uid() = ANY(members));

-- Helper: get current user's squad
CREATE OR REPLACE FUNCTION public.user_squad(_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT squad_id FROM public.profiles WHERE id = _user $$;

-- Join squad by invite code (security definer to bypass squad UPDATE RLS for non-members)
CREATE OR REPLACE FUNCTION public.join_squad(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO _id FROM public.squads WHERE invite_code = upper(_code) LIMIT 1;
  IF _id IS NULL THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;
  UPDATE public.squads
    SET members = ARRAY(SELECT DISTINCT unnest(members || _uid))
    WHERE id = _id;
  UPDATE public.profiles SET squad_id = _id WHERE id = _uid;
  RETURN _id;
END; $$;

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  paid_by uuid NOT NULL,
  split_with uuid[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (squad_id = public.user_squad(auth.uid()));
CREATE POLICY "Squad members insert expense"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (squad_id = public.user_squad(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "Creator deletes expense"
  ON public.expenses FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Late events
CREATE TABLE public.late_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  minutes integer NOT NULL CHECK (minutes >= 0),
  event_name text NOT NULL,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.late_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read late"
  ON public.late_events FOR SELECT TO authenticated
  USING (squad_id = public.user_squad(auth.uid()));
CREATE POLICY "Squad members insert late"
  ON public.late_events FOR INSERT TO authenticated
  WITH CHECK (squad_id = public.user_squad(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "Creator deletes late"
  ON public.late_events FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX idx_expenses_squad ON public.expenses(squad_id);
CREATE INDEX idx_late_squad ON public.late_events(squad_id);
CREATE INDEX idx_profiles_squad ON public.profiles(squad_id);