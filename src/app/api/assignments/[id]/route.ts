import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateAssignmentSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).max(500).optional(),
  due_at: z.string().optional().nullable(),
  course_name: z.string().max(300).optional().nullable(),
  link: z.string().url().optional().or(z.literal("")).nullable(),
});

async function getAssignment(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("id, source, completed_at")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const assignment = await getAssignment(supabase, id, user.id);
    if (!assignment) {
      return NextResponse.json({ message: "Assignment not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors.map((e) => e.message).join("; ") || "Validation failed" },
        { status: 400 }
      );
    }

    const { completed, title, due_at, course_name, link } = parsed.data;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof completed === "boolean") {
      updates.completed_at = completed ? new Date().toISOString() : null;
    }

    if (assignment.source === "manual") {
      if (title !== undefined) updates.title = title.trim();
      if (due_at !== undefined) {
        if (due_at === null || due_at === "") {
          updates.due_at = null;
        } else {
          const d = new Date(due_at.trim());
          if (Number.isNaN(d.getTime())) {
            return NextResponse.json({ message: "Invalid due date/time" }, { status: 400 });
          }
          updates.due_at = d.toISOString();
        }
      }
      if (course_name !== undefined) updates.course_name = course_name?.trim() || null;
      if (link !== undefined) updates.link = link?.trim() || null;
    }

    const { error } = await supabase
      .from("assignments")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Update assignment error:", error);
      return NextResponse.json(
        { message: "Failed to update", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Assignments PATCH error:", err);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const assignment = await getAssignment(supabase, id, user.id);
    if (!assignment) {
      return NextResponse.json({ message: "Assignment not found" }, { status: 404 });
    }

    if (assignment.source !== "manual") {
      return NextResponse.json(
        { message: "Only manual assignments can be deleted" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete assignment error:", error);
      return NextResponse.json(
        { message: "Failed to delete", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Assignments DELETE error:", err);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
