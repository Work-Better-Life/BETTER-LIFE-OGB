"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Unit = "day" | "week" | "month";
type Point = {
  date: Date;
  averagePercentage: number | null;
  entryCount: number;
};

type Comparison = {
  current: number | null;
  previous: number | null;
  delta: number | null;
};

function formatLabel(date: Date, unit: Unit) {
  if (unit === "month")
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLabelShort(date: Date, unit: Unit) {
  if (unit === "month")
    return date.toLocaleDateString("en-US", { month: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const WIDTH = 600;
const HEIGHT = 260;
const PAD_LEFT = 45;
const PAD_RIGHT = 15;
const PAD_TOP = 20;
const PAD_BOTTOM = 35;

export function TrendChart({
  data,
  unit,
  comparison,
}: {
  data: Point[];
  unit: Unit;
  priorPercentage?: number | null;
  comparison?: Comparison;
}) {
  const [revealed, setRevealed] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRevealed(false);
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [data]);

  const hasAnyData = data.some((p) => p.entryCount > 0);

  if (!hasAnyData) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-foreground-muted">
        No scores recorded yet — add a score to start seeing trends here.
      </div>
    );
  }

  // Calculate coordinates and geometry
  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = innerWidth / data.length;

  // Choose labels to show (avoid clutter)
  const maxLabels = 8;
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

  // Determine pillar geometry dynamically based on count
  const pillarWidth = Math.min(26, stepX * 0.45);
  const w = pillarWidth / 2;
  const h_skew = w * 0.4; // maintains consistent isometric look

  const GRID_VALUES = [0, 25, 50, 75, 100];

  const hoveredPoint = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div ref={containerRef} className="flex flex-col gap-5 w-full">
      {/* Premium Stats Header (Inspired by the upload design) */}
      {comparison && comparison.current !== null && (
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight text-foreground font-display">
            Overall {comparison.current.toFixed(1)}%
          </span>
          {comparison.delta !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 transition-colors",
                comparison.delta >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
            >
              {comparison.delta >= 0 ? "+" : ""}
              {comparison.delta.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* Interactive Chart Area */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Blur Filter for Drop Shadows */}
          <defs>
            <filter id="shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* Minty Chart Background (Inspired by the upload design) */}
          <rect
            x={PAD_LEFT}
            y={PAD_TOP}
            width={innerWidth}
            height={innerHeight}
            fill="#f3faf7"
            rx={4}
          />

          {/* Vertical Grid Lines (Minty green, centered with data points) */}
          {data.map((_, i) => {
            const x = PAD_LEFT + (i + 0.5) * stepX;
            return (
              <line
                key={`v-grid-${i}`}
                x1={x}
                x2={x}
                y1={PAD_TOP}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="#e3f3eb"
                strokeWidth={1}
              />
            );
          })}

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {GRID_VALUES.map((pct) => {
            const y = PAD_TOP + (1 - pct / 100) * innerHeight;
            return (
              <g key={`h-grid-${pct}`}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="#d4ece0"
                  strokeWidth={1}
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

          {/* Render Pillars */}
          {data.map((point, i) => {
            if (point.entryCount === 0 || point.averagePercentage === null) return null;

            const x = PAD_LEFT + (i + 0.5) * stepX;
            const y_bottom = HEIGHT - PAD_BOTTOM;
            
            // Calculate scale animation height
            const value = point.averagePercentage;
            const targetY = PAD_TOP + (1 - value / 100) * innerHeight;
            
            // If not revealed yet, animate height from 0 (at bottom)
            const y_val = revealed
              ? targetY
              : y_bottom;

            const isHovered = hoverIndex === i;

            // Colors for 3D Faces:
            // Left Face: vibrant purple
            // Right Face: deeper purple
            // Top Face: lighter lavender/purple
            const leftColor = isHovered ? "#9d5eff" : "#884bfd";
            const rightColor = isHovered ? "#6f37e4" : "#602cd2";
            const topColor = isHovered ? "#b897ff" : "#ab85ff";

            return (
              <g
                key={`pillar-${i}`}
                className="transition-all duration-300"
                style={{
                  transformOrigin: `${x}px ${y_bottom}px`,
                }}
              >
                {/* 3D Soft Drop Shadow at the base */}
                <ellipse
                  cx={x}
                  cy={y_bottom}
                  rx={w * 0.9}
                  ry={h_skew * 0.8}
                  fill="rgba(96, 44, 210, 0.18)"
                  filter="url(#shadow-blur)"
                  opacity={revealed ? 1 : 0}
                  className="transition-opacity duration-500"
                />

                {/* Left Face Polygon */}
                <polygon
                  points={`
                    ${x - w},${y_val - h_skew}
                    ${x},${y_val}
                    ${x},${y_bottom}
                    ${x - w},${y_bottom - h_skew}
                  `}
                  fill={leftColor}
                  stroke={leftColor}
                  strokeWidth={0.5}
                  style={{
                    transition: "y_val 600ms cubic-bezier(0.34, 1.56, 0.64, 1), fill 150ms ease",
                  }}
                />

                {/* Right Face Polygon */}
                <polygon
                  points={`
                    ${x},${y_val}
                    ${x + w},${y_val - h_skew}
                    ${x + w},${y_bottom - h_skew}
                    ${x},${y_bottom}
                  `}
                  fill={rightColor}
                  stroke={rightColor}
                  strokeWidth={0.5}
                  style={{
                    transition: "y_val 600ms cubic-bezier(0.34, 1.56, 0.64, 1), fill 150ms ease",
                  }}
                />

                {/* Top Face (Rhombus) Polygon */}
                <polygon
                  points={`
                    ${x},${y_val}
                    ${x - w},${y_val - h_skew}
                    ${x},${y_val - 2 * h_skew}
                    ${x + w},${y_val - h_skew}
                  `}
                  fill={topColor}
                  stroke={topColor}
                  strokeWidth={0.5}
                  style={{
                    transition: "y_val 600ms cubic-bezier(0.34, 1.56, 0.64, 1), fill 150ms ease",
                  }}
                />
              </g>
            );
          })}

          {/* Interactive Invisible Hover Rectangles */}
          {data.map((point, i) => {
            const x = PAD_LEFT + i * stepX;
            return (
              <rect
                key={`hover-${i}`}
                x={x}
                y={PAD_TOP}
                width={stepX}
                height={innerHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}

          {/* X-Axis labels */}
          {data.map((point, i) => {
            const show = i === 0 || i === data.length - 1 || i % labelStep === 0;
            if (!show) return null;

            const x = PAD_LEFT + (i + 0.5) * stepX;
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={HEIGHT - PAD_BOTTOM + 18}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-foreground-muted)"
                className="font-medium"
              >
                {formatLabelShort(point.date, unit)}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip (Styled premium overlay) */}
        {hoveredPoint && hoveredPoint.averagePercentage !== null && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-floating"
            style={{
              bottom: `${
                ((100 - hoveredPoint.averagePercentage) / 100) * innerHeight +
                PAD_BOTTOM +
                20
              }px`,
              left: `${(PAD_LEFT + (hoverIndex! + 0.5) * stepX) * (100 / WIDTH)}%`,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            <p className="font-semibold text-foreground">
              {formatLabel(hoveredPoint.date, unit)}
            </p>
            <p className="mt-0.5 text-foreground-muted">
              Average: <span className="font-bold text-primary-strong">{hoveredPoint.averagePercentage.toFixed(1)}%</span>
            </p>
            <p className="text-[10px] text-foreground-muted">
              {hoveredPoint.entryCount} {hoveredPoint.entryCount === 1 ? "entry" : "entries"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
