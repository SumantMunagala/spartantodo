"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { AssignmentRow, AssignmentSource } from "@/lib/types/assignment";
import { resolveAssignmentLink } from "@/lib/assignment-link";
import {
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  PenSquare,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import { EditAssignmentForm } from "./EditAssignmentForm";

const SOURCE_CONFIG: Record<
  AssignmentSource,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string; barClass: string }
> = {
  canvas: {
    label: "Canvas",
    icon: BookOpen,
    badgeClass:
      "bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
    barClass: "bg-blue-500",
  },
  gradescope: {
    label: "Gradescope",
    icon: ClipboardCheck,
    badgeClass:
      "bg-amber-500/10 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    barClass: "bg-amber-500",
  },
  manual: {
    label: "Manual",
    icon: PenSquare,
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    barClass: "bg-emerald-500",
  },
};

export function AssignmentCardWithActions({
  assignment,
  variant = "default",
}: {
  assignment: AssignmentRow;
  variant?: "default" | "overdue" | "completed";
}) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const config = SOURCE_CONFIG[assignment.source];
  const Icon = config.icon;
  const href = resolveAssignmentLink(assignment);
  const dueLabel = assignment.due_at
    ? format(new Date(assignment.due_at), "MMM d, h:mm a")
    : "No due date";
  const isCompleted = !!assignment.completed_at;

  const handleToggleComplete = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !isCompleted }),
        credentials: "include",
      });
      if (res.ok) router.refresh();
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const meta = [assignment.course_name, dueLabel].filter(Boolean).join(" · ");

  const baseClass = `relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow dark:border-white/10 ${
    variant === "overdue"
      ? "border-red-200/60 dark:border-red-500/20"
      : "border-border"
  } ${isCompleted ? "opacity-80" : "hover:shadow-md"}`;

  return (
    <>
      <div className={baseClass}>
        <div className={`absolute left-0 top-0 h-full w-0.5 shrink-0 ${config.barClass}`} />
        <div className="flex items-center gap-2 p-2.5 pl-3">
          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={toggling}
            className={`shrink-0 rounded border p-1 transition-colors hover:bg-muted disabled:opacity-50 ${
              isCompleted
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
            title={isCompleted ? "Mark incomplete" : "Mark complete"}
            aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`truncate text-sm font-medium text-foreground underline-offset-1 hover:underline ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {assignment.title}
                </a>
              ) : (
                <span
                  className={`truncate text-sm font-medium text-foreground ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                >
                  {assignment.title}
                </span>
              )}
              {href && (
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span
                className={`inline-flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${config.badgeClass}`}
              >
                <Icon className="h-2.5 w-2.5" />
                {config.label}
              </span>
            </div>
            {meta && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {assignment.source === "manual" && (
              <>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Edit"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <EditAssignmentForm
          assignment={assignment}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
