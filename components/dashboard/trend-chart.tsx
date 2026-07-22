"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Unit = "day" | "week" | "month";
type Point = {
  date: Date;
  averagePercentage: number | null;
  entryCount: number;
};
type Coord = {
  x: number;
  y: number | null;
  value: number | null;
  point: Point;
  isReal: boolean;
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

function toPath(cs: Array<{ x: number; y: number }>) {
  return cs
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
}

const WIDTH = 600;
const HEIGHT = 260;
const PAD_LEFT = 45;
const PAD_RIGHT = 15;
const PAD_TOP = 20;
const PAD_BOTTOM = 35;
const GRID_VALUES = [0, 25, 50, 75, 100];

// Line Chart builder helper
function buildLineChart(points: Point[], priorPercentage: number | null) {
  const firstRealIndex = points.findIndex((p) => p.entryCount > 0);
  const hasAnyReal = firstRealIndex !== -1;
  if (!hasAnyReal && priorPercentage === null) return null;

  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  let lastKnown: number | null = priorPercentage;
  const coords: Coord[] = points.map((p, i) => {
    const x = PAD_LEFT + i * stepX;
    const isReal = p.entryCount > 0;
    if (isReal) lastKnown = p.averagePercentage;
    const v = isReal ? (p.averagePercentage as number) : lastKnown;
    if (v === null)
      return { x, y: null, value: null, point: p, isReal: false };
    const y = PAD_TOP + (1 - v / 100) * innerHeight;
    return { x, y, value: v, point: p, isReal };
  });

  const drawable = coords.filter(
    (c): c is Coord & { y: number; value: number } =>
      c.y !== null && c.value !== null
  );
  if (drawable.length === 0) return null;

  const areaPath = `${toPath(drawable)} L${drawable[
    drawable.length - 1
  ].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${drawable[0].x.toFixed(
    1
  )},${HEIGHT - PAD_BOTTOM} Z`;

  const boundary = hasAnyReal ? firstRealIndex : coords.length;
  const extendedCoords = coords
    .slice(0, boundary + 1)
    .filter((c): c is Coord & { y: number } => c.y !== null);
  const realCoords = coords
    .slice(boundary)
    .filter((c): c is Coord & { y: number } => c.y !== null);

  return {
    coords,
    areaPath,
    extendedLinePath: toPath(extendedCoords),
    realLinePath: toPath(realCoords),
  };
}

export function TrendChart({
  data,
  unit,
  priorPercentage = null,
  comparison,
  mode = "line",
}: {
  data: Point[];
  unit: Unit;
  priorPercentage?: number | null;
  comparison?: Comparison;
  mode?: "line" | "bar";
}) {
  const [revealed, setRevealed] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRevealed(false);
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [data, mode]);

  const hasAnyData = data.some((p) => p.entryCount > 0);

  // Line chart coordinates
  const lineChart = useMemo(
    () => buildLineChart(data, priorPercentage),
    [data, priorPercentage]
  );

  if (!hasAnyData) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-foreground-muted">
        No scores recorded yet — add a score to start seeing trends here.
      </div>
    );
  }

  // Common inner metrics
  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // 3D Bar specific geometry metrics
  const barStepX = innerWidth / data.length;
  const maxLabels = 8;
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

  const pillarWidth = Math.min(38, barStepX * 0.82);
  const w = pillarWidth / 2;
  const h_skew = w * 0.4;

  // Line Chart Move handler
  function handleLineMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!lineChart) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    const targetX = fraction * WIDTH;
    let nearest: number | null = null;
    let nearestDist = Infinity;
    lineChart.coords.forEach((c, i) => {
      if (!c.isReal) return;
      const dist = Math.abs(c.x - targetX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hoveredLinePoint =
    mode === "line" && lineChart && hoverIndex !== null
      ? lineChart.coords[hoverIndex]
      : null;
  const hoveredBarPoint =
    mode === "bar" && hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div ref={containerRef} className="flex flex-col gap-5 w-full">
      {/* Premium Stats Header */}
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

      {/* Interactive Chart Canvas */}
      <div className="relative w-full">
        {mode === "line" && lineChart ? (
          // ──── LINE CHART MODE ────
          <div
            className="relative overflow-hidden"
            style={{
              clipPath: revealed ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
              transition: "clip-path 550ms var(--ease-out)",
            }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full cursor-crosshair overflow-visible"
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleLineMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                    stopOpacity="0.18"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-primary)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {GRID_VALUES.map((pct) => {
                const y = PAD_TOP + (1 - pct / 100) * innerHeight;
                return (
                  <g key={pct}>
                    <line
                      x1={PAD_LEFT}
                      x2={WIDTH - PAD_RIGHT}
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

              {/* Area Under Curve */}
              <path d={lineChart.areaPath} fill="url(#trend-fill)" />

              {/* Extended (Carried) Line */}
              {lineChart.extendedLinePath && (
                <path
                  d={lineChart.extendedLinePath}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="5 5"
                  opacity={0.55}
                />
              )}

              {/* Real Measured Line */}
              {lineChart.realLinePath && (
                <path
                  d={lineChart.realLinePath}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Point Circles */}
              {lineChart.coords.map(
                (c, i) =>
                  c.y !== null &&
                  c.isReal && (
                    <circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r={i === hoverIndex ? 4.5 : 2.5}
                      fill="var(--color-primary)"
                      style={{ transition: "r 120ms var(--ease-out)" }}
                    />
                  )
              )}

              {/* Vertical Guide Line */}
              {hoveredLinePoint && hoveredLinePoint.y !== null && (
                <line
                  x1={hoveredLinePoint.x}
                  x2={hoveredLinePoint.x}
                  y1={PAD_TOP}
                  y2={HEIGHT - PAD_BOTTOM}
                  stroke="var(--color-primary)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
              )}

              {/* X-Axis labels */}
              {lineChart.coords.map((c, i) => {
                if (
                  !(
                    i === 0 ||
                    i === lineChart.coords.length - 1 ||
                    i === Math.floor((lineChart.coords.length - 1) / 2)
                  )
                )
                  return null;
                return (
                  <text
                    key={`label-${i}`}
                    x={c.x}
                    y={HEIGHT - PAD_BOTTOM + 18}
                    textAnchor={
                      i === 0
                        ? "start"
                        : i === lineChart.coords.length - 1
                        ? "end"
                        : "middle"
                    }
                    fontSize={10}
                    fill="var(--color-foreground-muted)"
                    className="font-medium"
                  >
                    {formatLabel(c.point.date, unit)}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredLinePoint && hoveredLinePoint.value !== null && (
              <div
                className="pointer-events-none absolute top-1 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-floating"
                style={{
                  left: `${(hoveredLinePoint.x / WIDTH) * 100}%`,
                  transform:
                    (hoveredLinePoint.x / WIDTH) * 100 < 20
                      ? "translateX(0%)"
                      : (hoveredLinePoint.x / WIDTH) * 100 > 80
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
                }}
              >
                <p className="font-semibold text-foreground">
                  {formatLabel(hoveredLinePoint.point.date, unit)}
                </p>
                <p className="mt-0.5 text-foreground-muted">
                  Average:{" "}
                  <span className="font-bold text-primary-strong">
                    {hoveredLinePoint.value.toFixed(1)}%
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          // ──── 3D BAR CHART MODE ────
          <div>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Blur Filter for Shadows */}
              <defs>
                <filter
                  id="shadow-blur"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>

              {/* Minty Chart Background (supports site theme) */}
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={innerWidth}
                height={innerHeight}
                fill="var(--color-surface-muted)"
                rx={4}
              />

              {/* Vertical Grid Lines */}
              {data.map((_, i) => {
                const x = PAD_LEFT + (i + 0.5) * barStepX;
                return (
                  <line
                    key={`v-grid-${i}`}
                    x1={x}
                    x2={x}
                    y1={PAD_TOP}
                    y2={HEIGHT - PAD_BOTTOM}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    opacity={0.4}
                  />
                );
              })}

              {/* Horizontal Grid Lines */}
              {GRID_VALUES.map((pct) => {
                const y = PAD_TOP + (1 - pct / 100) * innerHeight;
                return (
                  <g key={`h-grid-${pct}`}>
                    <line
                      x1={PAD_LEFT}
                      x2={WIDTH - PAD_RIGHT}
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

              {/* Render Pillars */}
              {data.map((point, i) => {
                if (point.entryCount === 0 || point.averagePercentage === null)
                  return null;

                const x = PAD_LEFT + (i + 0.5) * barStepX;
                const y_bottom = HEIGHT - PAD_BOTTOM;

                const value = point.averagePercentage;
                const targetY = PAD_TOP + (1 - value / 100) * innerHeight;

                const y_val = revealed ? targetY : y_bottom;

                const isHovered = hoverIndex === i;

                const leftColor = "var(--color-primary)";
                const rightColor =
                  "color-mix(in srgb, var(--color-primary), black 16%)";
                const topColor =
                  "color-mix(in srgb, var(--color-primary), white 25%)";

                return (
                  <g
                    key={`pillar-${i}`}
                    className="transition-all duration-300"
                    style={{
                      transformOrigin: `${x}px ${y_bottom}px`,
                      filter: isHovered ? "brightness(1.12)" : "none",
                    }}
                  >
                    {/* 3D Drop Shadow */}
                    <ellipse
                      cx={x}
                      cy={y_bottom}
                      rx={w * 0.9}
                      ry={h_skew * 0.8}
                      fill="color-mix(in srgb, var(--color-primary), black 75%)"
                      opacity={revealed ? 0.15 : 0}
                      filter="url(#shadow-blur)"
                      className="transition-opacity duration-500"
                    />

                    {/* Left Face */}
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
                        transition:
                          "y_val 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    />

                    {/* Right Face */}
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
                        transition:
                          "y_val 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    />

                    {/* Top Face */}
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
                        transition:
                          "y_val 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    />
                  </g>
                );
              })}

              {/* Invisible Hover Rectangles */}
              {data.map((point, i) => {
                const x = PAD_LEFT + i * barStepX;
                return (
                  <rect
                    key={`hover-${i}`}
                    x={x}
                    y={PAD_TOP}
                    width={barStepX}
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
                const show =
                  i === 0 || i === data.length - 1 || i % labelStep === 0;
                if (!show) return null;

                const x = PAD_LEFT + (i + 0.5) * barStepX;
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

            {/* Hover Tooltip Overlay */}
            {hoveredBarPoint && hoveredBarPoint.averagePercentage !== null && (
              <div
                className="pointer-events-none absolute z-50 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-floating"
                style={{
                  bottom: `${
                    ((100 - hoveredBarPoint.averagePercentage) / 100) *
                      innerHeight +
                    PAD_BOTTOM +
                    20
                  }px`,
                  left: `${
                    (PAD_LEFT + (hoverIndex! + 0.5) * barStepX) * (100 / WIDTH)
                  }%`,
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                }}
              >
                <p className="font-semibold text-foreground">
                  {formatLabel(hoveredBarPoint.date, unit)}
                </p>
                <p className="mt-0.5 text-foreground-muted">
                  Average:{" "}
                  <span className="font-bold text-primary-strong">
                    {hoveredBarPoint.averagePercentage.toFixed(1)}%
                  </span>
                </p>
                <p className="text-[10px] text-foreground-muted">
                  {hoveredBarPoint.entryCount}{" "}
                  {hoveredBarPoint.entryCount === 1 ? "entry" : "entries"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
