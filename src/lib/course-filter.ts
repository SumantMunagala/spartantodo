import type { AssignmentRow } from "@/lib/types/assignment";

export const NO_COURSE_VALUE = "__none__";

/** Option for the course filter dropdown. */
export interface CourseOption {
  value: string;
  label: string;
}

/**
 * Build dropdown options from assignments: "All courses" plus distinct course names,
 * and "No course" if any assignment has null course_name.
 */
export function getCourseOptions(assignments: AssignmentRow[]): CourseOption[] {
  const options: CourseOption[] = [{ value: "", label: "All courses" }];
  const names = new Set<string>();
  let hasNoCourse = false;
  for (const a of assignments) {
    if (a.course_name?.trim()) {
      names.add(a.course_name.trim());
    } else {
      hasNoCourse = true;
    }
  }
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  for (const name of sorted) {
    options.push({ value: name, label: name });
  }
  if (hasNoCourse) {
    options.push({ value: NO_COURSE_VALUE, label: "No course" });
  }
  return options;
}

/**
 * Filter assignments by course query param.
 * "" or undefined = all; "__none__" = only null course_name; else exact course_name match.
 */
export function filterAssignmentsByCourse(
  assignments: AssignmentRow[],
  courseParam: string | undefined | null
): AssignmentRow[] {
  if (!courseParam?.trim()) return assignments;
  const value = courseParam.trim();
  if (value === NO_COURSE_VALUE) {
    return assignments.filter((a) => !a.course_name?.trim());
  }
  return assignments.filter((a) => a.course_name?.trim() === value);
}
