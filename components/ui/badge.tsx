import { cn } from "@/lib/cn";

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: "neutral" | "primary" | "danger";
  className?: string;
}) {
  const variantClasses = {
    neutral: "bg-surface-muted text-foreground-muted",
    primary: "bg-primary-soft text-primary-strong",
    danger: "bg-danger/10 text-danger",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DeltaIndicator({ value, pill = false }: { value: number | null; pill?: boolean }) {
  if (value === null) {
    return pill ? (
      <Badge>First score</Badge>
    ) : (
      <span className="text-xs text-foreground-muted">First score</span>
    );
  }
  const isPositive = value > 0;
  const isFlat = Math.abs(value) < 0.05;

  if (isFlat) {
    return pill ? <Badge>Steady</Badge> : <span className="text-xs text-foreground-muted">Steady</span>;
  }

  const icon = (
    <svg viewBox="0 0 12 12" className={cn("h-3 w-3", !isPositive && "rotate-180")} fill="currentColor">
      <path d="M6 2l4 5H2z" />
    </svg>
  );

  if (pill) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          isPositive ? "bg-primary-soft text-primary-strong" : "bg-danger/10 text-danger"
        )}
      >
        {icon}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-primary-strong" : "text-danger"
      )}
    >
      {icon}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function ConsistencyBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const label = score >= 85 ? "High" : score >= 60 ? "Medium" : "Low";
  const variant = score >= 85 ? "primary" : score >= 60 ? "neutral" : "danger";
  return <Badge variant={variant}>{label} consistency</Badge>;
}
