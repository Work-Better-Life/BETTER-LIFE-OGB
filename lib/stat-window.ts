export type StatWindow = "week" | "month";

export const STAT_WINDOW_DAYS: Record<StatWindow, number> = {
  week: 7,
  month: 30,
};

export const STAT_WINDOW_LABELS: Record<StatWindow, string> = {
  week: "Week",
  month: "Month",
};

export function normalizeStatWindow(value: string | undefined): StatWindow {
  return value === "week" || value === "month" ? value : "month";
}

export function currentMonthValue(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthValueRange(value: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function monthValueLabel(value: string): string {
  const { start } = monthValueRange(value);
  return start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function recentMonthOptions(count = 12): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: monthValueLabel(value) });
  }
  return options;
}

export function normalizeMonthValue(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const { start } = monthValueRange(value);
    if (!Number.isNaN(start.getTime())) return value;
  }
  return currentMonthValue();
}

export function getMonthOptions(): { value: string; label: string }[] {
  return [
    { value: "01", label: "Jan" },
    { value: "02", label: "Feb" },
    { value: "03", label: "Mar" },
    { value: "04", label: "Apr" },
    { value: "05", label: "May" },
    { value: "06", label: "Jun" },
    { value: "07", label: "Jul" },
    { value: "08", label: "Aug" },
    { value: "09", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
  ];
}

export function getYearOptions(): { value: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const year = currentYear - i;
    years.push({ value: String(year), label: String(year) });
  }
  return years;
}

export function parseMonthValue(value: string): { year: string; month: string } {
  const [year, month] = value.split("-");
  return { year, month };
}

export function buildMonthValue(year: string, month: string): string {
  return `${year}-${month}`;
}
