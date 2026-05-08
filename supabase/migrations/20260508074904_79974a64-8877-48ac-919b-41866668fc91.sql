DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='meetings' AND column_name='name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='meetings' AND column_name='event_name') THEN
    ALTER TABLE public.meetings RENAME COLUMN name TO event_name;
  END IF;
END $$;

ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS event_members uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS kicked_members uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS notifications jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS seen_by uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS summaries_seen uuid[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meetings' AND policyname='Creator updates meeting') THEN
    DROP POLICY "Creator updates meeting" ON public.meetings;
  END IF;
END $$;

CREATE POLICY "Squad members update meeting"
ON public.meetings FOR UPDATE
TO authenticated
USING (squad_id = public.user_squad(auth.uid()))
WITH CHECK (squad_id = public.user_squad(auth.uid()));
