"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import type { AssignmentRow } from "@/lib/types/assignment";
import { ExternalLink } from "lucide-react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getAssignmentsForDay(assignments: AssignmentRow[], day: Date): AssignmentRow[] {
  return assignments.filter((a) => {
    if (!a.due_at) return false;
    try {
      const due = parseISO(a.due_at);
      return isSameDay(due, day);
    } catch {
      return false;
    }
  });
}

export function CalendarView({ assignments }: { assignments: AssignmentRow[] }) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const assignmentsByDay = useMemo(() => {
    const map = new Map<string, AssignmentRow[]>();
    for (const day of calendarDays) {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, getAssignmentsForDay(assignments, day));
    }
    return map;
  }, [assignments, calendarDays]);

  const selectedDayAssignments = selectedDate
    ? assignmentsByDay.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-700">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="border-r border-zinc-200 py-2 text-center text-xs font-medium uppercase text-zinc-500 last:border-r-0 dark:border-zinc-700 dark:text-zinc-400"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAssignments = assignmentsByDay.get(key) ?? [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`min-h-[4.5rem] border-r border-b border-zinc-200 p-2 text-left last:border-r-0 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700/50 ${
                  !isCurrentMonth ? "bg-zinc-50/50 dark:bg-zinc-900/30" : ""
                } ${isSelected ? "ring-2 ring-inset ring-zinc-400 dark:ring-zinc-500" : ""}`}
              >
                <span
                  className={`text-sm font-medium ${
                    !isCurrentMonth
                      ? "text-zinc-400 dark:text-zinc-500"
                      : isToday(day)
                        ? "rounded-full bg-zinc-900 px-1.5 py-0.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayAssignments.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayAssignments.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                        title={a.title}
                      />
                    ))}
                    {dayAssignments.length > 3 && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        +{dayAssignments.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {format(selectedDate, "EEEE, MMM d")}
          </h3>
          {selectedDayAssignments.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No assignments due this day.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedDayAssignments.map((a) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 font-medium text-zinc-900 dark:text-zinc-100">
                        {a.title}
                      </span>
                      {a.link && (
                        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                      )}
                    </div>
                    {a.course_name && (
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {a.course_name}
                      </p>
                    )}
                    {a.due_at && (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Due {format(parseISO(a.due_at), "h:mm a")}
                      </p>
                    )}
                  </>
                );
                return (
                  <li key={a.id}>
                    {a.link ? (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded border border-zinc-200 bg-zinc-50/50 p-3 transition-colors hover:bg-zinc-100/50 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/50"
                      >
                        {content}
                      </a>
                    ) : (
                      <div className="rounded border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-600 dark:bg-zinc-800/50">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
