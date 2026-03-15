"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay } from "date-fns";
import { Plus, Calendar as CalendarIcon } from "lucide-react";

export function AddAssignmentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendarOpen && dueDate) setCalendarMonth(dueDate);
  }, [calendarOpen, dueDate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [calendarOpen]);

  const submit = async () => {
    setError("");
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Enter a title");
      return;
    }
    setSubmitting(true);
    try {
      const due_at = dueDate ? startOfDay(dueDate).toISOString() : null;
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, due_at }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Failed to add");
        return;
      }
      setTitle("");
      setDueDate(null);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay();
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex w-full items-center gap-2 rounded-xl border border-input bg-background py-1.5 pl-3 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-ring">
        <Plus className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add assignment…"
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          aria-label="Assignment title"
        />
        <div className="relative flex shrink-0 items-center" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setCalendarOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Choose due date"
            aria-expanded={calendarOpen}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>{dueDate ? format(dueDate, "MMM d") : "Due"}</span>
          </button>
          {calendarOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[260px] rounded-xl border border-border bg-card p-3 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <span className="min-w-[120px] text-center text-sm font-medium text-foreground">
                  {format(calendarMonth, "MMMM yyyy")}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d) => (
                  <div
                    key={d}
                    className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: startPad }, (_, i) => (
                  <div key={`pad-${i}`} className="h-8" />
                ))}
                {days.map((day) => {
                  const selected = dueDate && isSameDay(day, dueDate);
                  const currentMonth = isSameMonth(day, calendarMonth);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => {
                        setDueDate(day);
                        setCalendarOpen(false);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : currentMonth
                            ? "text-foreground hover:bg-muted"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDueDate(null);
                  setCalendarOpen(false);
                }}
                className="mt-3 w-full rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
