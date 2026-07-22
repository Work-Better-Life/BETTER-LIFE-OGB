import Link from "next/link";
import {
  getDashboardCounts,
  getScoreTrend,
  getTopPerformers,
  getMostImproved,
  getRecentScoreEntries,
  getLatestScoreMonthValue,
} from "@/lib/data/dashboard";
import { TREND_RANGES, type TrendRange } from "@/lib/trend-ranges";
import {
  normalizeStatWindow,
  normalizeMonthValue,
  monthValueLabel,
} from "@/lib/stat-window";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { TrendRangeSelect } from "@/components/dashboard/trend-range-select";
import { ChartModeToggle } from "@/components/dashboard/chart-mode-toggle";
import { StatWindowToggle } from "@/components/dashboard/stat-window-toggle";
import { MonthYearToggle } from "@/components/dashboard/month-year-toggle";
import { DeltaIndicator } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function parseTrendRange(value: string | undefined): TrendRange {
  return value && value in TREND_RANGES ? (value as TrendRange) : "30d";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    topRange?: string;
    improvedRange?: string;
    topMonth?: string;
    improvedMonth?: string;
    mode?: string;
  }>;
}) {
  const {
    range: rangeParam,
    topRange: topRangeParam,
    improvedRange: improvedRangeParam,
    topMonth: topMonthParam,
    improvedMonth: improvedMonthParam,
    mode: modeParam,
  } = await searchParams;
  const range = parseTrendRange(rangeParam);
  const topWindow = normalizeStatWindow(topRangeParam);
  const improvedWindow = normalizeStatWindow(improvedRangeParam);
  const chartMode = modeParam === "bar" ? "bar" : "line";

  const defaultMonth = await getLatestScoreMonthValue();
  const topMonth = normalizeMonthValue(topMonthParam ?? defaultMonth);
  const improvedMonth = normalizeMonthValue(improvedMonthParam ?? defaultMonth);

  const [counts, trend, topPerformers, mostImproved, recent] =
    await Promise.all([
      getDashboardCounts(),
      getScoreTrend(range),
      getTopPerformers(5, topWindow, topMonth),
      getMostImproved(5, improvedWindow, improvedMonth),
      getRecentScoreEntries(10),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            A quick look at who&apos;s climbing and what&apos;s recent.
          </p>
        </div>
        <Link href="/scores/record">
          <Button className="flex gap-1">
            <p>Record a test</p>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          label="Total Students"
          value={counts.students}
          tone="primary"
        />
        <StatTile label="Subjects" value={counts.subjects} tone="blue" />
        <StatTile label="Topics" value={counts.topics} tone="amber" />
        <StatTile
          label="Score Entries"
          value={counts.scoreEntries}
          tone="rose"
        />
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-foreground">
              Score trend
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Average score across all students over the last{" "}
              {TREND_RANGES[range].label.replace(/^1 /, "")}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrendRangeSelect value={range} />
            <ChartModeToggle />
          </div>
        </div>
        <div className="mt-4">
          <TrendChart data={trend.points} unit={trend.unit} comparison={trend.comparison} mode={chartMode} />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg text-foreground">
                Top performers
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {topWindow === "month"
                  ? `Highest average score in ${monthValueLabel(topMonth)}.`
                  : "Highest average score in the last week."}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatWindowToggle
                paramName="topRange"
                value={topWindow}
                label="Top performers time window"
              />
              {topWindow === "month" && (
                <MonthYearToggle
                  paramName="topMonth"
                  value={topMonth}
                  label="Top performers month"
                />
              )}
            </div>
          </div>
          {topPerformers.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">
              {topWindow === "month"
                ? `No scores recorded in ${monthValueLabel(topMonth)}.`
                : "No scores recorded in the last week."}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {topPerformers.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-muted"
                  >
                    <span className="text-sm text-foreground">
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="font-display text-sm text-primary-strong">
                      {student.averagePercentage?.toFixed(1)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg text-foreground">
                Most improved
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {improvedWindow === "month"
                  ? `Biggest score gains in ${monthValueLabel(improvedMonth)}.`
                  : "Biggest score gains in the last week."}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatWindowToggle
                paramName="improvedRange"
                value={improvedWindow}
                label="Most improved time window"
              />
              {improvedWindow === "month" && (
                <MonthYearToggle
                  paramName="improvedMonth"
                  value={improvedMonth}
                  label="Most improved month"
                />
              )}
            </div>
          </div>
          {mostImproved.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">
              {improvedWindow === "month"
                ? `Worth a look once a student has scores in ${monthValueLabel(improvedMonth)} and the month before it.`
                : "Worth a look once a student has scores in this week and the week before it."}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {mostImproved.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-muted"
                  >
                    <span className="text-sm text-foreground">
                      {student.firstName} {student.lastName}
                    </span>
                    <DeltaIndicator value={student.averageDelta} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-lg text-foreground">
          Recent activity
        </h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-foreground-muted">
            No scores recorded yet.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <Link
                    href={`/students/${entry.studentId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {entry.studentName}
                  </Link>
                  <span className="text-foreground-muted">
                    {" "}
                    · {entry.subjectName} / {entry.topicName}
                  </span>
                </div>
                <span className="font-display text-foreground">
                  {entry.value}/{entry.maxScore}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
