export type ExportWindow = "all" | "week" | "month" | "2months";

export const EXPORT_WINDOW_DAYS: Partial<Record<ExportWindow, number>> = {
  week: 7,
  month: 30,
  "2months": 60,
};

export const EXPORT_WINDOW_LABELS: Record<ExportWindow, string> = {
  all: "All time",
  "2months": "2 months",
  month: "1 month",
  week: "1 week",
};

export function normalizeExportWindow(value: string | null | undefined): ExportWindow {
  return value === "week" || value === "month" || value === "2months" || value === "all"
    ? value
    : "all";
}
