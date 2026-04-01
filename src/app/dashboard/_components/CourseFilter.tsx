"use client";

import { useRouter } from "next/navigation";
import type { CourseOption } from "@/lib/course-filter";
import { Filter } from "lucide-react";

export function CourseFilter({
  options,
  selectedValue,
  basePath,
}: {
  options: CourseOption[];
  selectedValue: string;
  basePath: string;
}) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const query = value ? `?course=${encodeURIComponent(value)}` : "";
    const url = `${basePath}${query}`;
    router.replace(url);
  };

  if (options.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <select
        value={selectedValue}
        onChange={handleChange}
        aria-label="Filter by course"
        className="rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
      >
        {options.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
