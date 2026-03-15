import type { AssignmentInsert } from "@/lib/types/assignment";
import { toDueAt, toStringOrNull } from "./normalize";

const CANVAS_BASE_URL =
  process.env.CANVAS_BASE_URL ?? "https://sjsu.instructure.com";

/** Look back ~4 months so we include overdue items from start of semester (e.g. Feb quizzes). */
const PLANNER_WEEKS_BACK = 16;
const PLANNER_WEEKS_AHEAD = 26;

export interface FetchCanvasResult {
  assignments: AssignmentInsert[];
  error?: string;
}

function getPlannerDateRange(): { start_date: string; end_date: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - PLANNER_WEEKS_BACK * 7);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + PLANNER_WEEKS_AHEAD * 7);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

/** Canvas API often returns relative URLs (e.g. /courses/1/assignments/2). Convert to absolute. */
function toAbsoluteUrl(baseUrl: string, href: unknown): string | null {
  const s = href != null && typeof href === "string" ? href.trim() : "";
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const base = baseUrl.replace(/\/$/, "");
  return s.startsWith("/") ? `${base}${s}` : `${base}/${s}`;
}

/**
 * Fetch planner items from Canvas (coursework only).
 * Uses filter=incomplete_items so submitted/completed assignments are excluded from sync.
 */
export async function fetchCanvasAssignments(
  userId: string,
  canvasToken: string
): Promise<FetchCanvasResult> {
  const baseUrl = CANVAS_BASE_URL.replace(/\/$/, "");
  const { start_date, end_date } = getPlannerDateRange();
  const startMs = new Date(start_date).getTime();
  const endMs = new Date(end_date).getTime();

  const params = new URLSearchParams({
    start_date,
    end_date,
    per_page: "100",
    filter: "incomplete_items",
  });
  const url = `${baseUrl}/api/v1/planner/items?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${canvasToken}`,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Canvas request failed";
    return { assignments: [], error: message };
  }

  if (!res.ok) {
    return {
      assignments: [],
      error: `Canvas API ${res.status}: ${res.statusText}`,
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { assignments: [], error: "Invalid Canvas response" };
  }

  let items: unknown[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object" && "planner_items" in data && Array.isArray((data as { planner_items: unknown[] }).planner_items)) {
    items = (data as { planner_items: unknown[] }).planner_items;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const arrKey = ["data", "results", "items"].find((k) => Array.isArray(obj[k]));
    if (arrKey) items = obj[arrKey] as unknown[];
  }
  console.log("[Canvas] Raw API returned", items.length, "planner items");
  if (items.length > 0 && items[0]) {
    const first = items[0] as Record<string, unknown>;
    console.log("[Canvas] First item plannable_type:", first.plannable_type, "context_name:", first.context_name);
  }

  const assignments: AssignmentInsert[] = [];
  let skippedType = 0;
  let skippedContext = 0;
  let skippedId = 0;
  let skippedDate = 0;

  const ALLOWED_TYPES = new Set(["assignment", "quiz", "discussion_topic", "wiki_page"]);
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rawType = (item as Record<string, unknown>).plannable_type as string | undefined;
    if (rawType && !ALLOWED_TYPES.has(rawType.toLowerCase())) {
      skippedType++;
      continue;
    }

    const plannable = (item as Record<string, unknown>).plannable as
      | Record<string, unknown>
      | undefined;
    const context = (item as Record<string, unknown>).context_name as
      | string
      | undefined;
    if (!context?.trim()) {
      skippedContext++;
      continue;
    }
    const id =
      (item as Record<string, unknown>).plannable_id ??
      (plannable?.id as string | number | undefined) ??
      (item as Record<string, unknown>).id;
    const title =
      (plannable?.title as string | undefined) ??
      (item as Record<string, unknown>).title ??
      "";
    const dueAt =
      (plannable?.due_at as string | undefined) ??
      (item as Record<string, unknown>).due_at;
    const rawHtmlUrl =
      (plannable?.html_url as string | undefined) ??
      (item as Record<string, unknown>).html_url;
    const link = toAbsoluteUrl(baseUrl, rawHtmlUrl);

    const externalId = String(id ?? "");
    if (!externalId) {
      skippedId++;
      continue;
    }

    const dueAtIso = toDueAt(dueAt);
    if (dueAtIso) {
      const dueMs = new Date(dueAtIso).getTime();
      if (dueMs < startMs || dueMs > endMs) {
        skippedDate++;
        continue;
      }
    }

    assignments.push({
      user_id: userId,
      source: "canvas",
      external_id: externalId,
      title: toStringOrNull(title) ?? "Untitled",
      due_at: dueAtIso,
      course_name: toStringOrNull(context),
      link,
    });
  }

  if (items.length > 0 && assignments.length === 0) {
    console.log("[Canvas] Filtered all out — skipped type:", skippedType, "context:", skippedContext, "id:", skippedId, "date:", skippedDate);
  }

  // Fallback: if planner returned nothing, try the Todo API (upcoming assignments)
  if (assignments.length === 0) {
    const todoResult = await fetchCanvasTodo(userId, baseUrl, canvasToken, startMs, endMs);
    if (todoResult.length > 0) {
      console.log("[Canvas] Todo API returned", todoResult.length, "items (used as fallback)");
      return { assignments: todoResult };
    }
  }

  return { assignments };
}

/**
 * Fallback: Canvas Todo API returns upcoming assignments when planner is empty or disabled.
 * GET /api/v1/users/self/todo
 */
async function fetchCanvasTodo(
  userId: string,
  baseUrl: string,
  canvasToken: string,
  startMs: number,
  endMs: number
): Promise<AssignmentInsert[]> {
  const url = `${baseUrl}/api/v1/users/self/todo?per_page=100`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${canvasToken}`,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : [];
  const out: AssignmentInsert[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    // Skip if already submitted (Canvas may include these in todo for "grading" etc.)
    const sub = row.submission as Record<string, unknown> | undefined;
    if (sub && (sub.submitted_at || sub.workflow_state === "submitted" || sub.state === "submitted")) continue;
    const assignmentId = row.assignment_id ?? row.id;
    const externalId = String(assignmentId ?? "");
    if (!externalId) continue;
    const dueAtIso = toDueAt(row.due_at);
    if (dueAtIso) {
      const dueMs = new Date(dueAtIso).getTime();
      if (dueMs < startMs || dueMs > endMs) continue;
    }
    const title = toStringOrNull(row.title) ?? "Untitled";
    const context = toStringOrNull(row.context_name);
    const link = toAbsoluteUrl(baseUrl, row.html_url);
    out.push({
      user_id: userId,
      source: "canvas",
      external_id: externalId,
      title,
      due_at: dueAtIso,
      course_name: context,
      link,
    });
  }
  return out;
}
