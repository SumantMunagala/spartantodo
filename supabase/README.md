# Supabase

## Running the schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **SQL Editor**.
3. Copy the contents of `migrations/001_initial_schema.sql` and paste into the editor.
4. Click **Run**.

This creates the `integrations` and `assignments` tables with RLS so each user only sees their own data.
