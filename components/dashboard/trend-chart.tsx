"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Unit = "day" | "week" | "month";
type Point = { date: Date; averagePercentage: number | null; entryCount: number };
type Coord = { x: number; y: number | null; value: number | null; point: Point; isReal: boolean };

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const GRID_VALUES = [0, 25, 50, 75, 100];

function formatLabel(date: Date, unit: Unit) {
  // Locale is pinned explicitly (not the runtime default) so the server-rendered
  // HTML and the client's hydration output always format dates identically —
  // otherwise a server/browser locale mismatch throws a hydration error.
  if (unit === "month") return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toPath(cs: Array<{ x: number; y: number }>) {
  return cs.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
}

function buildChart(points: Point[], priorPercentage: number | null) {
  const firstRealIndex = points.findIndex((p) => p.entryCount > 0);
  const hasAnyReal = firstRealIndex !== -1;
  if (!hasAnyReal && priorPercentage === null) return null;

  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  // Carry the last known value forward (starting from the score recorded just
  // before this window, if any) so the line always shows continuity — a
  // dashed segment means "no new score here, this is the level carried over",
  // a solid segment means "this is an actual recorded average".
  let lastKnown: number | null = priorPercentage;
  const coords: Coord[] = points.map((p, i) => {
    const x = PAD_LEFT + i * stepX;
    const isReal = p.entryCount > 0;
    if (isReal) lastKnown = p.averagePercentage;
    const v = isReal ? (p.averagePercentage as number) : lastKnown;
    if (v === null) return { x, y: null, value: null, point: p, isReal: false };
    const y = PAD_TOP + (1 - v / 100) * innerHeight;
    return { x, y, value: v, point: p, isReal };
  });

  const drawable = coords.filter(
    (c): c is Coord & { y: number; value: number } => c.y !== null && c.value !== null
  );
  if (drawable.length === 0) return null;

  const areaPath = `${toPath(drawable)} L${drawable[drawable.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${drawable[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`;

  // boundary = index where real data begins (or coords.length if there's none in this window yet)
  const boundary = hasAnyReal ? firstRealIndex : coords.length;
  const extendedCoords = coords.slice(0, boundary + 1).filter((c): c is Coord & { y: number } => c.y !== null);
  const realCoords = coords.slice(boundary).filter((c): c is Coord & { y: number } => c.y !== null);

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
}: {
  data: Point[];
  unit: Unit;
  priorPercentage?: number | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => buildChart(data, priorPercentage), [data, priorPercentage]);

  useEffect(() => {
    setRevealed(false);
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [data]);

  if (!chart) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-foreground-muted">
        No scores recorded yet — add a score to start seeing trends here.
      </div>
    );
  }

  const { coords, areaPath, extendedLinePath, realLinePath } = chart;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    const targetX = fraction * WIDTH;
    // Only snap to actual recorded points — carried-forward days have
    // nothing new to report, so there's no tooltip worth showing for them.
    let nearest: number | null = null;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      if (!c.isReal) return;
      const dist = Math.abs(c.x - targetX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;
  const tooltipLeftPct = hovered ? (hovered.x / WIDTH) * 100 : 0;
  const tooltipAlign = tooltipLeftPct < 20 ? "left" : tooltipLeftPct > 80 ? "right" : "center";

  return (
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
        className="w-full cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {GRID_VALUES.map((pct) => {
          const y = PAD_TOP + (1 - pct / 100) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
          return (
            <g key={pct}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-foreground-muted)">
                {pct}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#trend-fill)" />
        {extendedLinePath && (
          <path
            d={extendedLinePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 5"
            opacity={0.55}
          />
        )}
        {realLinePath && (
          <path
            d={realLinePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map(
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

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--color-primary)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
          />
        )}

        {coords.map((c, i) => {
          if (!(i === 0 || i === coords.length - 1 || i === Math.floor((coords.length - 1) / 2))) return null;
          return (
            <text
              key={`label-${i}`}
              x={c.x}
              y={HEIGHT - PAD_BOTTOM + 18}
              textAnchor={i === 0 ? "start" : i === coords.length - 1 ? "end" : "middle"}
              fontSize={10}
              fill="var(--color-foreground-muted)"
            >
              {formatLabel(c.point.date, unit)}
            </text>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-floating"
          style={{
            left: `${tooltipLeftPct}%`,
            transform:
              tooltipAlign === "left" ? "translateX(0%)" : tooltipAlign === "right" ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          <p className="font-medium text-foreground">{formatLabel(hovered.point.date, unit)}</p>
          <p className="mt-0.5 text-foreground-muted">{hovered.value?.toFixed(1)}% average
          </p>
        </div>
      )}
    </div>
  );
}
