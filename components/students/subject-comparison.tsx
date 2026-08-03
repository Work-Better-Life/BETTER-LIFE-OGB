"use client";

import { useState } from "react";
import { CompareChart } from "@/components/students/compare-chart";
import { averagePercentage, consistencyScore, latestDelta, toPercentage } from "@/lib/scoring";

type Entry = { value: number; maxScore: number; recordedAt: Date };
type Subject = { id: string; name: string; entries: Entry[] };

const COLOR_A = "var(--color-primary)";
const COLOR_B = "#f59e0b";

export function SubjectComparison({ subjects }: { subjects: Subject[] }) {
  const [aId, setAId] = useState(subjects[0]?.id ?? "");
  const [bId, setBId] = useState(subjects[1]?.id ?? subjects[0]?.id ?? "");

  const a = subjects.find((s) => s.id === aId) ?? subjects[0];
  const b = subjects.find((s) => s.id === bId) ?? subjects[0];

  function statsFor(s: Subject) {
    const sorted = [...s.entries].sort((x, y) => x.recordedAt.getTime() - y.recordedAt.getTime());
    const percentages = sorted.map(toPercentage);
    return {
      latest: percentages[percentages.length - 1],
      average: averagePercentage(sorted) ?? 0,
      best: Math.max(...percentages),
      consistency: consistencyScore(sorted),
      delta: latestDelta(sorted),
      sorted,
    };
  }

  if (!a || !b) return null;

  const statsA = statsFor(a);
  const statsB = statsFor(b);

  const rows: [string, string, string][] = [
    ["Latest", `${statsA.latest.toFixed(0)}%`, `${statsB.latest.toFixed(0)}%`],
    ["Average", `${statsA.average.toFixed(1)}%`, `${statsB.average.toFixed(1)}%`],
    ["Best", `${statsA.best.toFixed(0)}%`, `${statsB.best.toFixed(0)}%`],
    [
      "Consistency",
      statsA.consistency !== null ? statsA.consistency.toFixed(0) : "—",
      statsB.consistency !== null ? statsB.consistency.toFixed(0) : "—",
    ],
    [
      "Trend",
      statsA.delta !== null ? `${statsA.delta >= 0 ? "+" : ""}${statsA.delta.toFixed(1)}%` : "—",
      statsB.delta !== null ? `${statsB.delta >= 0 ? "+" : ""}${statsB.delta.toFixed(1)}%` : "—",
    ],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={aId}
          onChange={(e) => setAId(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-[13px] text-foreground"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-foreground-muted">vs</span>
        <select
          value={bId}
          onChange={(e) => setBId(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-[13px] text-foreground"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-3/5">
          <CompareChart
            topics={[
              { id: a.id, name: a.name, color: COLOR_A, entries: statsA.sorted },
              { id: b.id, name: b.name, color: COLOR_B, entries: statsB.sorted },
            ]}
          />
        </div>
        <div className="lg:w-2/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-muted">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium" style={{ color: COLOR_A }}>
                  {a.name}
                </th>
                <th className="pb-2 font-medium" style={{ color: COLOR_B }}>
                  {b.name}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(([label, va, vb]) => (
                <tr key={label}>
                  <td className="py-1.5 text-foreground-muted">{label}</td>
                  <td className="py-1.5 font-semibold text-foreground">{va}</td>
                  <td className="py-1.5 font-semibold text-foreground">{vb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
