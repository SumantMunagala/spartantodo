import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  due_at: z.string().optional().nullable(),
  course_name: z.string().max(300).optional().nullable(),
  link: z.string().url().optional().or(z.literal("")).nullable(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ") || "Validation failed";
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    const { title, due_at, course_name, link } = parsed.data;
    const externalId = `manual-${crypto.randomUUID()}`;
    let dueAtIso: string | null = null;
    if (due_at?.trim()) {
      const d = new Date(due_at.trim());
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { message: "Invalid due date/time" },
          { status: 400 }
        );
      }
      dueAtIso = d.toISOString();
    }

    const { data, error } = await supabase
      .from("assignments")
      .insert({
        user_id: user.id,
        source: "manual",
        external_id: externalId,
        title: title.trim(),
        due_at: dueAtIso,
        course_name: course_name?.trim() || null,
        link: link?.trim() || null,
        completed_at: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create assignment error:", error);
      return NextResponse.json(
        { message: "Failed to create assignment", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Assignments POST error:", err);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
