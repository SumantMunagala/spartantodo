-- Allow manually added assignments (source = 'manual')
ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_source_check;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_source_check
  CHECK (source IN ('canvas', 'gradescope', 'manual'));
