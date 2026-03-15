import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { fetchCanvasAssignments } from "@/lib/sync/canvas";
import { fetchGradescopeAssignments } from "@/lib/sync/gradescope";
import type { AssignmentInsert } from "@/lib/types/assignment";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: row, error: rowError } = await supabase
      .from("integrations")
      .select("canvas_token, gradescope_ics_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (rowError) {
      console.error("Sync integrations load error:", rowError);
      return NextResponse.json(
        { message: "Failed to load integrations" },
        { status: 500 }
      );
    }

    const allAssignments: AssignmentInsert[] = [];

    if (row?.canvas_token) {
      try {
        const result = await fetchCanvasAssignments(user.id, row.canvas_token);
        if (result.error) console.warn("[Sync] Canvas:", result.error);
        allAssignments.push(...result.assignments);
        console.log("[Sync] Canvas returned", result.assignments.length, "assignments");
      } catch (e) {
        console.warn("[Sync] Canvas error:", e);
      }
    }

    if (row?.gradescope_ics_url) {
      try {
        const result = await fetchGradescopeAssignments(
          user.id,
          row.gradescope_ics_url
        );
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
      .eq("user_id", user.id)
      .in("source", ["canvas", "gradescope"]);

    const completedByKey = new Map<string, string | null>();
    for (const row of existingRows ?? []) {
      const key = `${row.source}:${row.external_id}`;
      completedByKey.set(key, row.completed_at ?? null);
    }

    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("user_id", user.id)
      .in("source", ["canvas", "gradescope"]);

    if (deleteError) {
      console.error("Sync delete error:", deleteError);
      return NextResponse.json(
        { message: "Failed to clear old assignments", details: deleteError.message },
        { status: 500 }
      );
    }

    if (allAssignments.length === 0) {
      console.log("[Sync] Total 0 assignments; nothing to upsert");
      return NextResponse.json({ synced: 0 });
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

    const { error: upsertError } = await supabase.from("assignments").upsert(
      upsertPayload,
      {
        onConflict: "user_id,source,external_id",
        ignoreDuplicates: false,
      }
    );

    if (upsertError) {
      console.error("Sync upsert error:", upsertError);
      return NextResponse.json(
        { message: "Failed to save assignments", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ synced: allAssignments.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("Sync route error:", err);
    return NextResponse.json(
      { message: "Sync failed", details: message },
      { status: 500 }
    );
  }
}
