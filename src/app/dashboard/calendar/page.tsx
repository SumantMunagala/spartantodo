import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AssignmentRow } from "@/lib/types/assignment";
import { resolveAssignmentLink } from "@/lib/assignment-link";
import {
  getCourseOptions,
  filterAssignmentsByCourse,
} from "@/lib/course-filter";
import { CalendarView } from "../_components/CalendarView";
import { CourseFilter } from "../_components/CourseFilter";
import { SyncButton } from "../_components/SyncButton";

type PageProps = {
  searchParams: Promise<{ course?: string }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: rows, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("user_id", user.id)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Calendar assignments load error:", error);
  }

  const rawAssignments = (rows ?? []) as AssignmentRow[];
  const params = await searchParams;
  const courseParam = params.course ?? "";
  const filtered = filterAssignmentsByCourse(rawAssignments, courseParam);
  const assignments = filtered.map((a) => ({
    ...a,
    link: resolveAssignmentLink(a) ?? a.link,
  }));
  const courseOptions = getCourseOptions(rawAssignments);

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Calendar
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <CourseFilter
              options={courseOptions}
              selectedValue={courseParam}
              basePath="/dashboard/calendar"
            />
            <SyncButton />
          </div>
        </div>

        <CalendarView assignments={assignments} />

        {assignments.length === 0 && (
          <p className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            {courseParam && rawAssignments.length > 0
              ? "No assignments for this course."
              : "No assignments to show. Connect Canvas or Gradescope in Settings and sync to see due dates on the calendar."}
          </p>
        )}
      </div>
    </div>
  );
}
