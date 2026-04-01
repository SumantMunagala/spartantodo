import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { runSyncForUser } from "@/lib/sync/runSync";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = await runSyncForUser(supabase, user.id);

    if (!result.success) {
      return NextResponse.json(
        { message: result.message, details: result.details },
        { status: 500 }
      );
    }

    return NextResponse.json({ synced: result.synced });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("Sync route error:", err);
    return NextResponse.json(
      { message: "Sync failed", details: message },
      { status: 500 }
    );
  }
}
