export type BucketUnit = "day" | "week" | "month";

export const TREND_RANGES = {
  "7d": { label: "7 days", unit: "day", count: 7 },
  "14d": { label: "2 weeks", unit: "day", count: 14 },
  "30d": { label: "1 month", unit: "day", count: 30 },
  "3m": { label: "3 months", unit: "week", count: 13 },
  "6m": { label: "6 months", unit: "week", count: 26 },
  "1y": { label: "1 year", unit: "month", count: 12 },
} as const satisfies Record<string, { label: string; unit: BucketUnit; count: number }>;

export type TrendRange = keyof typeof TREND_RANGES;
