import { Badge } from "@/components/ui/badge";
import { ATTENDANCE_BAND_LABELS, DAYS_PER_WEEK, type AttendanceSummary } from "@/lib/attendance";

// Attendance rate for the period selected on the student page (the same selector
// that drives the chart). Hidden until the student has any attendance recorded, so
// students without it aren't cluttered with an empty badge.
export function AttendanceBadge({
  summary,
  hasAnyRecords,
  periodLabel,
}: {
  summary: AttendanceSummary;
  hasAnyRecords: boolean;
  periodLabel: string;
}) {
  if (!hasAnyRecords) return null;

  if (!summary.enough) {
    return (
      <Badge
        title={`A rate needs at least ${summary.needed} weeks of attendance in the period (${periodLabel}). ${summary.weeks} recorded so far.`}
      >
        Attendance · {summary.weeks} of {summary.needed} weeks recorded
      </Badge>
    );
  }

  const variant = summary.band === "high" ? "primary" : summary.band === "low" ? "danger" : "neutral";
  return (
    <Badge
      variant={variant}
      title={`${summary.days} of ${summary.possible} days attended over ${summary.weeks} weeks (${DAYS_PER_WEEK}-day weeks) · ${periodLabel}`}
    >
      {ATTENDANCE_BAND_LABELS[summary.band]} · {Math.round(summary.rate)}%
    </Badge>
  );
}
