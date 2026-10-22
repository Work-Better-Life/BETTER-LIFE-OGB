"use client";

import { plotPercent } from "@/lib/scoring";
import { useState } from "react";
import { toPercentage } from "@/lib/scoring";
import { cn } from "@/lib/cn";

export type CompareSeries = {
  id: string;
  name: string;
  color: string;
  entries: { value: number; maxScore: number; recordedAt: Date }[];
};

const WIDTH = 560;
const HEIGHT = 190;
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const GRID_VALUES = [0, 50, 100];

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildLine(entries: CompareSeries["entries"]) {
  const percentages = entries.map(toPercentage);
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  if (percentages.length === 1) {
    const y = PAD_TOP + (1 - plotPercent(percentages[0]) / 100) * innerHeight;
    return { path: "", dots: [{ x: WIDTH / 2, y, percentage: percentages[0], entry: entries[0] }] };
  }
  const stepX = (WIDTH - PAD_X * 2) / (percentages.length - 1);
  const dots = percentages.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + (1 - plotPercent(p) / 100) * innerHeight,
    percentage: p,
    entry: entries[i],
  }));
  const path = dots.map((d, i) => `${i === 0 ? "M" : "L"}${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" ");
  return { path, dots };
}

export function CompareChart({ topics }: { topics: [CompareSeries, CompareSeries] }) {
  const [hover, setHover] = useState<{ seriesIdx: number; pointIdx: number } | null>(null);
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const lines = topics.map((t) => buildLine(t.entries));

  const hovered = hover ? lines[hover.seriesIdx].dots[hover.pointIdx] : null;
  const hoveredTopic = hover ? topics[hover.seriesIdx] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {topics.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
            {t.name}
          </span>
        ))}
      </div>
      <div className="relative w-full">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full overflow-visible" preserveAspectRatio="xMidYMid meet">
          {GRID_VALUES.map((pct) => {
            const y = PAD_TOP + (1 - plotPercent(pct) / 100) * innerHeight;
            return (
              <g key={pct}>
                <line x1={PAD_X} x2={WIDTH - PAD_X} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.6} />
                <text x={PAD_X} y={y - 3} fontSize={9} fill="var(--color-foreground-muted)">
                  {pct}%
                </text>
              </g>
            );
          })}

          {lines.map((line, i) => (
            <g key={topics[i].id}>
              {line.path && (
                <path d={line.path} fill="none" stroke={topics[i].color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
              )}
              {line.dots.map((d, di) => {
                const isHovered = hover?.seriesIdx === i && hover?.pointIdx === di;
                return (
                  <circle
                    key={di}
                    cx={d.x}
                    cy={d.y}
                    r={isHovered ? 5.5 : 3}
                    fill={topics[i].color}
                    stroke={isHovered ? "var(--color-surface)" : "none"}
                    strokeWidth={isHovered ? 2 : 0}
                    className="cursor-pointer"
                    style={{ transition: "r 120ms var(--ease-out, ease-out)" }}
                    onMouseEnter={() => setHover({ seriesIdx: i, pointIdx: di })}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </g>
          ))}
        </svg>

        {hovered && hoveredTopic && (
          <div
            className={cn(
              "pointer-events-none absolute w-44 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-floating"
            )}
            style={{
              left: `${(hovered.x / WIDTH) * 100}%`,
              bottom: `calc(${100 - (hovered.y / HEIGHT) * 100}% + 14px)`,
              transform:
                (hovered.x / WIDTH) * 100 < 25
                  ? "translateX(0%)"
                  : (hovered.x / WIDTH) * 100 > 75
                  ? "translateX(-100%)"
                  : "translateX(-50%)",
            }}
          >
            <p className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hoveredTopic.color }} />
              {hoveredTopic.name}
            </p>
            <p className="mt-1 text-foreground-muted">{formatDate(hovered.entry.recordedAt)}</p>
            <p className="mt-0.5 text-foreground-muted">
              Score{" "}
              <span className="font-semibold text-foreground">
                {hovered.entry.value}/{hovered.entry.maxScore}
              </span>{" "}
              &middot; <span className="font-semibold text-foreground">{hovered.percentage.toFixed(0)}%</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
