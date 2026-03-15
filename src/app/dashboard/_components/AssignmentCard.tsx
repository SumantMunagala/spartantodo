import { format } from "date-fns";
import type { AssignmentRow, AssignmentSource } from "@/lib/types/assignment";
import { resolveAssignmentLink } from "@/lib/assignment-link";
import { BookOpen, ClipboardCheck, ExternalLink, PenSquare } from "lucide-react";

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

export function AssignmentCard({
  assignment,
  variant = "default",
}: {
  assignment: AssignmentRow;
  variant?: "default" | "overdue";
}) {
  const config = SOURCE_CONFIG[assignment.source];
  const Icon = config.icon;
  const href = resolveAssignmentLink(assignment);
  const dueLabel = assignment.due_at
    ? format(new Date(assignment.due_at), "MMM d, h:mm a")
    : "No due date";
  const meta = [assignment.course_name, dueLabel].filter(Boolean).join(" · ");

  const cardContent = (
    <>
      <div className={`absolute left-0 top-0 h-full w-0.5 shrink-0 ${config.barClass}`} />
      <div className="flex items-center gap-2 p-2.5 pl-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {assignment.title}
            </span>
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
      </div>
    </>
  );

  const baseClass = `relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md dark:border-white/10 ${
    variant === "overdue"
      ? "border-red-200/60 dark:border-red-500/20"
      : "border-border"
  }`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ${baseClass} hover:bg-muted/30`}
      >
        {cardContent}
      </a>
    );
  }

  return <div className={baseClass}>{cardContent}</div>;
}
