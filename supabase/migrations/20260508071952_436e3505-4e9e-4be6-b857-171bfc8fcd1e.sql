
-- Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  date date,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Squad members read meetings" ON public.meetings FOR SELECT TO authenticated USING (squad_id = public.user_squad(auth.uid()));
CREATE POLICY "Squad members create meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (squad_id = public.user_squad(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "Creator updates meeting" ON public.meetings FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator deletes meeting" ON public.meetings FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Extend expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS meeting_id uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'split';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS custom_amounts jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS settled_users uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Allow expense creator to update their own expenses
DROP POLICY IF EXISTS "Creator updates expense" ON public.expenses;
CREATE POLICY "Creator updates expense" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
