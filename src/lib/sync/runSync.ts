import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCanvasAssignments } from "@/lib/sync/canvas";
import { fetchGradescopeAssignments } from "@/lib/sync/gradescope";
import type { AssignmentInsert } from "@/lib/types/assignment";

export type RunSyncResult =
  | { success: true; synced: number }
  | { success: false; message: string; details?: string };

/**
 * Run sync for a single user: load integrations, fetch Canvas/Gradescope,
 * preserve completed_at, delete old canvas/gradescope rows, upsert new ones.
 * Uses the provided Supabase client (session or service role).
 */
export async function runSyncForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<RunSyncResult> {
  const { data: row, error: rowError } = await supabase
    .from("integrations")
    .select("canvas_token, gradescope_ics_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (rowError) {
    console.error("Sync integrations load error:", rowError);
    return { success: false, message: "Failed to load integrations", details: rowError.message };
  }

  const allAssignments: AssignmentInsert[] = [];

  if (row?.canvas_token) {
    try {
      const result = await fetchCanvasAssignments(userId, row.canvas_token);
      if (result.error) console.warn("[Sync] Canvas:", result.error);
      allAssignments.push(...result.assignments);
      console.log("[Sync] Canvas returned", result.assignments.length, "assignments");
    } catch (e) {
      console.warn("[Sync] Canvas error:", e);
    }
  }

  if (row?.gradescope_ics_url) {
    try {
      const result = await fetchGradescopeAssignments(userId, row.gradescope_ics_url);
      if (result.error) console.warn("[Sync] Gradescope:", result.error);
      allAssignments.push(...result.assignments);
      console.log("[Sync] Gradescope returned", result.assignments.length, "assignments");
    } catch (e) {
      console.warn("[Sync] Gradescope error:", e);
    }
  }

  const { data: existingRows } = await supabase
    .from("assignments")
    .select("source, external_id, completed_at")
    .eq("user_id", userId)
    .in("source", ["canvas", "gradescope"]);

  const completedByKey = new Map<string, string | null>();
  for (const r of existingRows ?? []) {
    const key = `${r.source}:${r.external_id}`;
    completedByKey.set(key, r.completed_at ?? null);
  }

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .eq("user_id", userId)
    .in("source", ["canvas", "gradescope"]);

  if (deleteError) {
    console.error("Sync delete error:", deleteError);
    return {
      success: false,
      message: "Failed to clear old assignments",
      details: deleteError.message,
    };
  }

  if (allAssignments.length === 0) {
    console.log("[Sync] Total 0 assignments; nothing to upsert");
    return { success: true, synced: 0 };
  }

  console.log("[Sync] Upserting", allAssignments.length, "assignments");

  const upsertPayload = allAssignments.map((a) => {
    const key = `${a.source}:${a.external_id}`;
    const completed_at = completedByKey.get(key) ?? null;
    return {
      ...a,
      updated_at: new Date().toISOString(),
      completed_at,
    };
  });

  const { error: upsertError } = await supabase.from("assignments").upsert(upsertPayload, {
    onConflict: "user_id,source,external_id",
    ignoreDuplicates: false,
  });

  if (upsertError) {
    console.error("Sync upsert error:", upsertError);
    return {
      success: false,
      message: "Failed to save assignments",
      details: upsertError.message,
    };
  }

  return { success: true, synced: allAssignments.length };
}
