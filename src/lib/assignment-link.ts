import type { AssignmentSource } from "@/lib/types/assignment";

const CANVAS_BASE =
  process.env.CANVAS_BASE_URL ?? "https://sjsu.instructure.com";
const GRADESCOPE_BASE = "https://www.gradescope.com";

/**
 * Resolve assignment link to an absolute URL so it opens on Canvas/Gradescope
 * instead of the current origin. Use when rendering links (server or client with
 * NEXT_PUBLIC_ env).
 */
export function resolveAssignmentLink(assignment: {
  source: AssignmentSource;
  link: string | null;
}): string | null {
  const link = assignment.link?.trim();
  if (!link) return null;
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  if (assignment.source === "manual") return null; // manual links must be full URLs
  const base =
    assignment.source === "canvas"
      ? CANVAS_BASE.replace(/\/$/, "")
      : GRADESCOPE_BASE;
  return link.startsWith("/") ? `${base}${link}` : `${base}/${link}`;
}
