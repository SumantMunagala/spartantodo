-- SpartanTodo MVP: integrations + assignments
-- Run this in Supabase Dashboard → SQL Editor (or via Supabase CLI).

-- =============================================================================
-- integrations: one row per user (Canvas token, Gradescope ICS URL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  canvas_token text,
  gradescope_ics_url text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations"
  ON public.integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- assignments: unified from Canvas + Gradescope
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('canvas', 'gradescope')),
  external_id text NOT NULL,
  title text NOT NULL,
  due_at timestamptz,
  course_name text,
  link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, source, external_id)
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own assignments"
  ON public.assignments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_assignments_user_due
  ON public.assignments (user_id, due_at);
