import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSyncForUser } from "@/lib/sync/runSync";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7) === secret;
  }
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("integrations")
      .select("user_id")
      .or("canvas_token.not.is.null,gradescope_ics_url.not.is.null");

    if (error) {
      console.error("[Cron] Integrations query error:", error);
      return NextResponse.json(
        { message: "Failed to load integrations", details: error.message },
        { status: 500 }
      );
    }

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    let synced = 0;

    for (const userId of userIds) {
      try {
        const result = await runSyncForUser(supabase, userId);
        if (result.success) synced += 1;
        else console.warn("[Cron] Sync failed for user", userId, result.message);
      } catch (e) {
        console.warn("[Cron] Sync error for user", userId, e);
      }
    }

    return NextResponse.json({ synced, total: userIds.length });
  } catch (err) {
    console.error("[Cron] Sync route error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Cron sync failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
