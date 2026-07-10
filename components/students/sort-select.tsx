"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const SORT_OPTIONS = [
  { value: "oldest", label: "Oldest added" },
  { value: "newest", label: "Newest added" },
  { value: "scored", label: "Recently scored" },
  { value: "name", label: "Name A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((option) => option.value);

export function SortSelect({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSort = searchParams.get("sort");
  const sort: SortValue = SORT_VALUES.includes(rawSort ?? "") ? (rawSort as SortValue) : "oldest";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    if (e.target.value === "oldest") params.delete("sort");
    else params.set("sort", e.target.value);
    router.replace(`/students?${params.toString()}`);
  }

  return (
    <select
      value={sort}
      onChange={handleChange}
      aria-label="Sort students"
      className={cn(
        "h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        className
      )}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
