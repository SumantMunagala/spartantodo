-- Add completed_at so assignments can be marked complete (shown in Completed section)
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_completed_at
  ON public.assignments (user_id, completed_at)
  WHERE completed_at IS NOT NULL;
