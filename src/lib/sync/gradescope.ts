import type { AssignmentInsert } from "@/lib/types/assignment";
import { toDueAt } from "./normalize";

export interface FetchGradescopeResult {
  assignments: AssignmentInsert[];
  error?: string;
}

function getEventDate(evt: {
  start?: unknown;
  due?: unknown;
  end?: unknown;
}): string | null {
  return toDueAt(evt.due ?? evt.start ?? evt.end);
}

function getEventSummary(evt: { summary?: unknown }): string {
  const raw = evt.summary;
  if (typeof raw === "string") return raw.trim() || "Untitled";
  if (raw && typeof raw === "object" && "val" in raw && typeof (raw as { val: string }).val === "string") {
    return (raw as { val: string }).val.trim() || "Untitled";
  }
  return "Untitled";
}

const GRADESCOPE_BASE = "https://www.gradescope.com";

function getEventUrl(evt: { url?: unknown }): string | null {
  let val: string | null = null;
  const raw = evt.url;
  if (typeof raw === "string") val = raw.trim();
  else if (raw && typeof raw === "object" && "val" in raw && typeof (raw as { val: string }).val === "string") {
    val = (raw as { val: string }).val.trim();
  }
  if (!val) return null;
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  if (val.startsWith("/")) return `${GRADESCOPE_BASE}${val}`;
  return `${GRADESCOPE_BASE}/${val}`;
}

/**
 * Fetch ICS from URL, parse with node-ical, map VEVENT/VTODO to AssignmentInsert.
 * Server-only: fetches URL server-side.
 */
export async function fetchGradescopeAssignments(
  userId: string,
  icsUrl: string
): Promise<FetchGradescopeResult> {
  let body: string;
  try {
    const res = await fetch(icsUrl, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return {
        assignments: [],
        error: `Gradescope ICS ${res.status}: ${res.statusText}`,
      };
    }
    body = await res.text();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gradescope fetch failed";
    return { assignments: [], error: message };
  }

  let data: Record<string, { type?: string; uid?: string; url?: unknown; start?: unknown; due?: unknown; end?: unknown; summary?: unknown }>;
  try {
    const ical = await import("node-ical");
    const parse = ical.default?.parseICS ?? ical.parseICS;
    data = parse(body) as typeof data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid ICS";
    return { assignments: [], error: msg };
  }

  const assignments: AssignmentInsert[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(data)) {
    const evt = data[key];
    if (!evt || typeof evt !== "object") continue;
    const type = (evt as { type?: string }).type;
    if (type !== "VEVENT" && type !== "VTODO") continue;

    const uid = (evt as { uid?: string }).uid ?? key;
    if (seen.has(uid)) continue;
    seen.add(uid);

    const dueAt = getEventDate(evt as { start?: unknown; due?: unknown; end?: unknown });
    const title = getEventSummary(evt as { summary?: unknown });
    const link = getEventUrl(evt as { url?: unknown });

    assignments.push({
      user_id: userId,
      source: "gradescope",
      external_id: uid,
      title,
      due_at: dueAt,
      course_name: null,
      link,
    });
  }

  return { assignments };
}
