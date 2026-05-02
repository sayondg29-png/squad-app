
-- ============ ENUMS ============
CREATE TYPE public.squad_role AS ENUM ('owner', 'member');
CREATE TYPE public.status_kind AS ENUM ('idle', 'here', 'otw', 'late', 'not_coming');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Friend',
  avatar_color TEXT NOT NULL DEFAULT '#1A1AFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ SQUADS ============
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- ============ SQUAD MEMBERS ============
CREATE TABLE public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.squad_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- ============ Security definer helper (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_squad_member(_user UUID, _squad UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE user_id = _user AND squad_id = _squad
  )
$$;

CREATE OR REPLACE FUNCTION public.find_squad_by_invite(_code TEXT)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.squads WHERE invite_code = upper(_code) LIMIT 1
$$;

-- Squad RLS
CREATE POLICY "Members read their squads"
  ON public.squads FOR SELECT TO authenticated
  USING (public.is_squad_member(auth.uid(), id));
CREATE POLICY "Authenticated create squads"
  ON public.squads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner updates squad"
  ON public.squads FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owner deletes squad"
  ON public.squads FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Squad members RLS
CREATE POLICY "Members read squad roster"
  ON public.squad_members FOR SELECT TO authenticated
  USING (public.is_squad_member(auth.uid(), squad_id));
CREATE POLICY "User joins squad as themselves"
  ON public.squad_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User leaves own membership"
  ON public.squad_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ MEMBER STATUS ============
CREATE TABLE public.member_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.status_kind NOT NULL DEFAULT 'idle',
  eta_minutes INT,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);
ALTER TABLE public.member_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read status"
  ON public.member_status FOR SELECT TO authenticated
  USING (public.is_squad_member(auth.uid(), squad_id));
CREATE POLICY "User upserts own status"
  ON public.member_status FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_squad_member(auth.uid(), squad_id));
CREATE POLICY "User updates own status"
  ON public.member_status FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "User deletes own status"
  ON public.member_status FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ LIVE LOCATIONS (only while OTW) ============
CREATE TABLE public.live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read locations"
  ON public.live_locations FOR SELECT TO authenticated
  USING (public.is_squad_member(auth.uid(), squad_id));
CREATE POLICY "User writes own location"
  ON public.live_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_squad_member(auth.uid(), squad_id));
CREATE POLICY "User updates own location"
  ON public.live_locations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "User deletes own location"
  ON public.live_locations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_squads_touch BEFORE UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_status_touch BEFORE UPDATE ON public.member_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_loc_touch BEFORE UPDATE ON public.live_locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Friend')
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ REALTIME ============
ALTER TABLE public.live_locations REPLICA IDENTITY FULL;
ALTER TABLE public.member_status REPLICA IDENTITY FULL;
ALTER TABLE public.squad_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
