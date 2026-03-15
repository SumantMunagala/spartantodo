import type { AssignmentInsert } from "@/lib/types/assignment";

/**
 * Normalize a date to ISO string for DB storage, or null if invalid/missing.
 */
export function toDueAt(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
}

/**
 * Ensure a value is a non-empty string or null.
 */
export function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export type { AssignmentInsert };
