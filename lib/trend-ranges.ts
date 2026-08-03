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

export const STUDENT_OVERVIEW_RANGES = {
  all: { label: "All time", days: null },
  "30d": { label: "30 days", days: 30 },
  "3m": { label: "3 months", days: 90 },
  "6m": { label: "6 months", days: 180 },
  "1y": { label: "1 year", days: 365 },
} as const satisfies Record<string, { label: string; days: number | null }>;

export type StudentOverviewRange = keyof typeof STUDENT_OVERVIEW_RANGES;

/** ISO start-of-range cutoff for a student overview range, or undefined for "all time". */
export function rangeStartISO(range: StudentOverviewRange): string | undefined {
  const days = STUDENT_OVERVIEW_RANGES[range].days;
  return days !== null ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : undefined;
}
