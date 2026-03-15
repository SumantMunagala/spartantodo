/**
 * Shared types for assignments table and sync pipeline.
 * Matches supabase/migrations/001_initial_schema.sql.
 */

export type AssignmentSource = "canvas" | "gradescope" | "manual";

/** Row from public.assignments (as returned by Supabase). */
export interface AssignmentRow {
  id: string;
  user_id: string;
  source: AssignmentSource;
  external_id: string;
  title: string;
  due_at: string | null;
  course_name: string | null;
  link: string | null;
  completed_at: string | null; // set when user marks complete; preserved across sync
  created_at: string;
  updated_at: string;
}

/** Shape for insert/upsert (sync pipeline output). */
export interface AssignmentInsert {
  user_id: string;
  source: AssignmentSource;
  external_id: string;
  title: string;
  due_at: string | null;
  course_name: string | null;
  link: string | null;
  completed_at?: string | null;
}
