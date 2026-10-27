// Weekly attendance. Classes run five days a week and attendance is recorded once
// a week, so a student's attendance rate is days attended / (5 x weeks recorded).
// A week with no record isn't counted at all (holidays, or simply not recorded);
// a student who missed the whole week has a record of 0.

export const DAYS_PER_WEEK = 5;
// Fewer weeks than this and a percentage would be misleading, so none is shown.
export const MIN_WEEKS_FOR_RATE = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

// The Monday (UTC midnight) of the school week a date falls in. Records are taken
// at the end of the week, so a Saturday or Sunday belongs to the week that just ended.
export function weekStartOf(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sinceMonday = (day.getUTCDay() + 6) % 7; // Mon 0 ... Sun 6
  day.setUTCDate(day.getUTCDate() - sinceMonday);
  return day;
}

export type AttendanceBand = "high" | "medium" | "low";

export const ATTENDANCE_BAND_LABELS: Record<AttendanceBand, string> = {
  high: "High attendance",
  medium: "Medium attendance",
  low: "Low attendance",
};

// 90% and above is high, 75-89% medium, below 75% low.
export function attendanceBand(rate: number): AttendanceBand {
  if (rate >= 90) return "high";
  if (rate >= 75) return "medium";
  return "low";
}

export type AttendanceSummary =
  | { enough: false; weeks: number; needed: number }
  | { enough: true; weeks: number; days: number; possible: number; rate: number; band: AttendanceBand };

// `since` limits it to recent weeks. A week counts when any of its school days
// (Mon-Fri) fall on or after `since`; omit it for all time.
export function summariseAttendance(
  records: { weekStart: Date; daysAttended: number }[],
  since?: Date
): AttendanceSummary {
  const inRange = since ? records.filter((r) => r.weekStart.getTime() + 4 * DAY_MS >= since.getTime()) : records;
  const weeks = inRange.length;
  if (weeks < MIN_WEEKS_FOR_RATE) return { enough: false, weeks, needed: MIN_WEEKS_FOR_RATE };

  const days = inRange.reduce((sum, r) => sum + r.daysAttended, 0);
  const possible = weeks * DAYS_PER_WEEK;
  const rate = (days / possible) * 100;
  return { enough: true, weeks, days, possible, rate, band: attendanceBand(rate) };
}
