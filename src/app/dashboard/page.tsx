import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { startOfDay } from "date-fns";
import type { AssignmentRow } from "@/lib/types/assignment";
import {
  getCourseOptions,
  filterAssignmentsByCourse,
} from "@/lib/course-filter";
import { SyncButton } from "./_components/SyncButton";
import { AddAssignmentForm } from "./_components/AddAssignmentForm";
import { AssignmentCardWithActions } from "./_components/AssignmentCardWithActions";
import { CourseFilter } from "./_components/CourseFilter";
import { Calendar, AlertCircle, ListTodo, CheckCircle2 } from "lucide-react";

type PageProps = {
  searchParams: Promise<{ course?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
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
    console.error("Dashboard assignments load error:", error);
  }

  const allAssignments = (rows ?? []) as AssignmentRow[];
  const params = await searchParams;
  const courseParam = params.course ?? "";
  const assignments = filterAssignmentsByCourse(allAssignments, courseParam);
  const courseOptions = getCourseOptions(allAssignments);
  const todayStart = startOfDay(new Date());

  const incomplete = assignments.filter((a) => !a.completed_at);
  const completed = assignments.filter((a) => a.completed_at).sort((a, b) => {
    const tA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const tB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return tB - tA;
  });

  const overdue = incomplete.filter((a) => {
    if (!a.due_at) return false;
    return new Date(a.due_at) < todayStart;
  });
  const upcoming = incomplete.filter((a) => {
    if (!a.due_at) return true;
    return new Date(a.due_at) >= todayStart;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Assignments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Canvas and Gradescope in one place
          </p>
        </div>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <AddAssignmentForm />
          </div>
          <CourseFilter
            options={courseOptions}
            selectedValue={courseParam}
            basePath="/dashboard"
          />
          <SyncButton />
        </div>

        {assignments.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ListTodo className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {courseParam && allAssignments.length > 0
                ? "No assignments for this course"
                : "No assignments yet"}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {courseParam && allAssignments.length > 0
                ? "Try another course or clear the filter."
                : "Connect Canvas or Gradescope in Settings, then click Sync to pull in your assignments."}
            </p>
          </div>
        )}

        {assignments.length > 0 && (
          <div className="space-y-10">
            {overdue.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Overdue
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {overdue.length} {overdue.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {overdue.map((a) => (
                    <li key={a.id}>
                      <AssignmentCardWithActions assignment={a} variant="overdue" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Upcoming
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {upcoming.length}{" "}
                      {upcoming.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {upcoming.map((a) => (
                    <li key={a.id}>
                      <AssignmentCardWithActions assignment={a} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Completed
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {completed.length}{" "}
                      {completed.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {completed.map((a) => (
                    <li key={a.id}>
                      <AssignmentCardWithActions assignment={a} variant="completed" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
