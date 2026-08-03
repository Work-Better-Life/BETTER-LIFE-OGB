"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { TopicCard } from "@/components/students/topic-card";
import { averagePercentage, latestDelta } from "@/lib/scoring";
import { cn } from "@/lib/cn";

type Entry = { id: string; value: number; maxScore: number; note: string | null; recordedAt: Date };
type Topic = { id: string; name: string; entries: Entry[] };

type PerfFilter = "all" | "best" | "poor";

export function SubjectExplorer({ studentId, topics }: { studentId: string; topics: Topic[] }) {
  const [query, setQuery] = useState("");
  const [perf, setPerf] = useState<PerfFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const withStats = topics.map((t) => {
    const sorted = [...t.entries].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    return {
      ...t,
      entries: sorted,
      average: averagePercentage(sorted) ?? 0,
      delta: latestDelta(sorted),
      latestDate: sorted[sorted.length - 1].recordedAt,
    };
  });

  const sortedByAvg = [...withStats].sort((a, b) => b.average - a.average);
  const thirdSize = Math.max(1, Math.floor(withStats.length / 3));
  const bestIds = new Set(sortedByAvg.slice(0, thirdSize).map((t) => t.id));
  const poorIds = new Set(sortedByAvg.slice(-thirdSize).map((t) => t.id));

  const sortedByRecent = [...withStats].sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());

  const filtered = sortedByRecent
    .filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    .filter((t) => perf === "all" || (perf === "best" && bestIds.has(t.id)) || (perf === "poor" && poorIds.has(t.id)));

  const visible = expanded ? filtered : filtered.slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      {/* Filter bar */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
            {(
              [
                ["all", "All topics"],
                ["best", "Strongest"],
                ["poor", "Needs work"],
              ] as [PerfFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPerf(value)}
                className={cn(
                  "rounded px-3 py-1.5 text-[13px] font-medium transition-colors",
                  perf === value ? "bg-primary text-primary-foreground" : "text-foreground-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            className="h-9 w-full max-w-60 text-[13px]"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-foreground-muted">
            No topics match this filter.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visible.map((t) => (
                <TopicCard key={t.id} studentId={studentId} topicName={t.name} entries={t.entries} delta={t.delta} />
              ))}
            </div>
            {filtered.length > 4 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="self-start text-sm font-medium text-primary-strong hover:underline"
              >
                {expanded ? "Show less" : `See more (${filtered.length - 4} more)`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
