import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const PostBodySchema = z.object({
  canvasToken: z.string().optional(),
  gradescopeIcsUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("integrations")
    .select("canvas_token, gradescope_ics_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Integrations GET error:", error);
    return NextResponse.json(
      { message: "Failed to load integrations" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    hasCanvas: Boolean(row?.canvas_token),
    hasGradescope: Boolean(row?.gradescope_ics_url),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof PostBodySchema>;
  try {
    body = PostBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { message: "Invalid body: canvasToken and gradescopeIcsUrl are optional" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("integrations")
    .select("canvas_token, gradescope_ics_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const canvasToken =
    body.canvasToken !== undefined
      ? body.canvasToken || null
      : existing?.canvas_token ?? null;
  const gradescopeIcsUrl =
    body.gradescopeIcsUrl !== undefined
      ? body.gradescopeIcsUrl || null
      : existing?.gradescope_ics_url ?? null;

  const { error } = await supabase.from("integrations").upsert(
    {
      user_id: user.id,
      canvas_token: canvasToken,
      gradescope_ics_url: gradescopeIcsUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Integrations POST error:", error);
    return NextResponse.json(
      { message: "Failed to save integrations" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
