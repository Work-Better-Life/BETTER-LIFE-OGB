"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DeltaIndicator } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { TrendGraphPoint } from "@/lib/trend-points";

export type { TrendGraphPoint, TrendGraphSubject } from "@/lib/trend-points";

const BASE_WIDTH = 760;
// Floor spacing between points, so the chart never gets cramped once there
// are many test dates — it stretches to fill the panel below this point
// count, and switches to a horizontally scrollable fixed spacing above it.
const MIN_STEP_X = 56;
const HEIGHT = 300;
const PAD_LEFT = 45;
const PAD_RIGHT = 15;
const PAD_TOP = 20;
const PAD_BOTTOM = 35;
const GRID_VALUES = [0, 25, 50, 75, 100];
const CARD_WIDTH = 260;
const CARD_GAP = 16;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAxisLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TrendGraph({ studentId, points }: { studentId: string; points: TrendGraphPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties | null>(null);

  const baseInnerWidth = BASE_WIDTH - PAD_LEFT - PAD_RIGHT;
  const requiredInnerWidth = points.length > 1 ? MIN_STEP_X * (points.length - 1) : baseInnerWidth;
  const innerWidth = Math.max(baseInnerWidth, requiredInnerWidth);
  const chartWidth = innerWidth + PAD_LEFT + PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  // Once there are enough points to force horizontal scrolling, default to
  // showing the most recent dates rather than the oldest.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [chartWidth]);

  // Recompute the hover/pin card's measured position on resize (the DOM
  // rects it's based on change) — scroll bumps the same tick via onScroll.
  useEffect(() => {
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const coords = points.map((p, i) => ({
    x: PAD_LEFT + i * stepX,
    y: PAD_TOP + (1 - p.average / 100) * innerHeight,
    point: p,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${coords[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`
      : "";

  function handleMove(evt: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (evt.clientX - rect.left) / rect.width;
    const targetX = fraction * chartWidth;
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - targetX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const activeIndex = pinnedIndex ?? hoverIndex;
  const active = activeIndex !== null ? coords[activeIndex] : null;
  const isPinned = pinnedIndex !== null;

  function handleDotClick(i: number) {
    setPinnedIndex((prev) => (prev === i ? null : i));
  }

  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  // Measured in px (not viewBox %) so the card can be a sibling of the
  // scrollable chart — living outside it means it's never clipped by the
  // scroll container's overflow, no matter where the point sits. Reading
  // layout via getBoundingClientRect and syncing it to state is the standard
  // escape hatch for this (same technique popover/tooltip libraries use) —
  // it can't be computed during render since refs aren't readable there.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeIndex === null) {
      setCardStyle(null);
      return;
    }
    const svgRect = svgRef.current?.getBoundingClientRect();
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    if (!svgRect || !wrapperRect) {
      setCardStyle(null);
      return;
    }
    const point = coords[activeIndex];
    const leftPx = svgRect.left - wrapperRect.left + (point.x / chartWidth) * svgRect.width;
    const topPx = svgRect.top - wrapperRect.top + (point.y / HEIGHT) * svgRect.height;
    const bottomPx = wrapperRect.height - topPx + CARD_GAP;
    const translate =
      leftPx < CARD_WIDTH / 2 ? "0%" : leftPx > wrapperRect.width - CARD_WIDTH / 2 ? "-100%" : "-50%";
    setCardStyle({ left: leftPx, bottom: bottomPx, transform: `translateX(${translate})` });
    // `coords` is a fresh array every render, fully derived from `points` +
    // `chartWidth` — depending on those instead avoids re-running (and thus
    // re-setting state) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, chartWidth, points, tick]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex flex-col gap-4">
      <div ref={wrapperRef} className="relative">
      <div ref={scrollRef} className="overflow-x-auto" onScroll={() => setTick((t) => t + 1)}>
        <div style={{ width: "100%", minWidth: chartWidth }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${HEIGHT}`}
          className="block w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="student-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {GRID_VALUES.map((pct) => {
            const y = PAD_TOP + (1 - pct / 100) * innerHeight;
            return (
              <g key={pct}>
                <line
                  x1={PAD_LEFT}
                  x2={chartWidth - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  opacity={0.6}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--color-foreground-muted)"
                  className="font-medium"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#student-trend-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {active && (
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--color-primary)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          )}

          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === activeIndex ? 6 : 3}
              fill={pinnedIndex === i ? "var(--color-primary-strong, var(--color-primary))" : "var(--color-primary)"}
              stroke={pinnedIndex === i ? "var(--color-surface)" : "none"}
              strokeWidth={pinnedIndex === i ? 2 : 0}
              className="cursor-pointer"
              style={{ transition: "r 120ms var(--ease-out, ease-out)" }}
              onClick={() => handleDotClick(i)}
            />
          ))}

          {coords.map((c, i) => {
            if (!(i === 0 || i === coords.length - 1 || i % labelStep === 0)) return null;
            return (
              <text
                key={`label-${i}`}
                x={c.x}
                y={HEIGHT - PAD_BOTTOM + 18}
                textAnchor={i === 0 ? "start" : i === coords.length - 1 ? "end" : "middle"}
                fontSize={10}
                fill="var(--color-foreground-muted)"
                className="font-medium"
              >
                {formatAxisLabel(c.point.date)}
              </text>
            );
          })}
        </svg>
        </div>
      </div>

      {active && cardStyle && (
          <div
            className={cn(
              "absolute w-65 rounded-lg border border-border bg-surface shadow-floating",
              isPinned ? "pointer-events-auto z-20" : "pointer-events-none"
            )}
            style={cardStyle}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-foreground">{formatDate(active.point.date)}</p>
                <p className="text-[11px] text-foreground-muted">
                  Average <span className="font-semibold text-primary-strong">{active.point.average.toFixed(1)}%</span>
                </p>
              </div>
              {isPinned && (
                <button
                  type="button"
                  onClick={() => setPinnedIndex(null)}
                  className="rounded p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              )}
            </div>
            <ul className="flex flex-col gap-0.5 p-2">
              {active.point.subjects.map((s) =>
                isPinned ? (
                  <li key={s.subjectId}>
                    <Link
                      href={`/students/${studentId}/subjects/${s.subjectId}`}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-surface-muted"
                    >
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-foreground-muted">{s.percentage.toFixed(0)}%</span>
                        <DeltaIndicator value={s.delta} pill />
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={s.subjectId} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-foreground-muted">{s.percentage.toFixed(0)}%</span>
                      <DeltaIndicator value={s.delta} pill />
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
      )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
        <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
        </svg>
        Hover a point to preview that date &middot; click it to pin the card open &middot; click a subject inside to view its page
      </p>
    </div>
  );
}
