const WIDTH = 120;
const HEIGHT = 44;
const PADDING_X = 4;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 4;

export function Sparkline({
  percentages,
  tone = "primary",
}: {
  percentages: number[];
  tone?: "primary" | "danger";
}) {
  const color = tone === "danger" ? "var(--color-danger)" : "var(--color-primary)";

  if (percentages.length === 0) return null;

  if (percentages.length === 1) {
    return (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-11 w-[120px]">
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={3} fill={color} />
      </svg>
    );
  }

  const innerHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const stepX = (WIDTH - PADDING_X * 2) / (percentages.length - 1);
  const coords = percentages.map((p, i) => {
    const x = PADDING_X + i * stepX;
    const y = PADDING_TOP + (1 - p / 100) * innerHeight;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1];
  const lastValue = percentages[percentages.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-11 w-[120px] overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
      <text
        x={Math.min(Math.max(lastX, 14), WIDTH - 14)}
        y={PADDING_TOP - 6}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill={color}
      >
        {Math.round(lastValue)}%
      </text>
    </svg>
  );
}
