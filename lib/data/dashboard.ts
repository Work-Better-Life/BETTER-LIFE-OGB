import { prisma } from "@/lib/db";
import { averagePercentage, toPercentage } from "@/lib/scoring";
import { TREND_RANGES, type TrendRange, type BucketUnit } from "@/lib/trend-ranges";
import { STAT_WINDOW_DAYS, type StatWindow, currentMonthValue, monthValueRange } from "@/lib/stat-window";

export async function getDashboardCounts() {
  const [students, subjects, topics, scoreEntries] = await Promise.all([
    prisma.student.count(),
    prisma.subject.count(),
    prisma.topic.count(),
    prisma.scoreEntry.count(),
  ]);
  return { students, subjects, topics, scoreEntries };
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const diff = (d.getUTCDay() + 6) % 7; // Monday as start of week
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function bucketStart(date: Date, unit: BucketUnit) {
  if (unit === "day") return startOfDay(date);
  if (unit === "week") return startOfWeek(date);
  return startOfMonth(date);
}

function addUnits(date: Date, unit: BucketUnit, amount: number) {
  const d = new Date(date);
  if (unit === "day") d.setUTCDate(d.getUTCDate() + amount);
  else if (unit === "week") d.setUTCDate(d.getUTCDate() + amount * 7);
  else d.setUTCMonth(d.getUTCMonth() + amount);
  return d;
}

export async function getScoreTrend(range: TrendRange = "30d") {
  const { unit, count } = TREND_RANGES[range];
  const now = new Date();
  const latestBucketStart = bucketStart(now, unit);
  const earliestBucketStart = addUnits(latestBucketStart, unit, -(count - 1));
  const previousWindowStart = addUnits(earliestBucketStart, unit, -count);

  const [entries, previousEntries] = await Promise.all([
    prisma.scoreEntry.findMany({
      where: { recordedAt: { gte: earliestBucketStart } },
      select: { value: true, maxScore: true, recordedAt: true },
    }),
    prisma.scoreEntry.findMany({
      where: { recordedAt: { gte: previousWindowStart, lt: earliestBucketStart } },
      select: { value: true, maxScore: true, recordedAt: true },
    }),
  ]);

  const bucketDates: Date[] = [];
  for (let i = 0; i < count; i++) bucketDates.push(addUnits(earliestBucketStart, unit, i));

  const buckets = new Map<number, number[]>(bucketDates.map((d) => [d.getTime(), []]));

  for (const entry of entries) {
    const key = bucketStart(entry.recordedAt, unit).getTime();
    const bucket = buckets.get(key);
    if (bucket) bucket.push(toPercentage(entry));
  }

  const currentAverage = averagePercentage(entries);
  const previousAverage = averagePercentage(previousEntries);

  // If the window opens with empty buckets, look up the last score recorded
  // before the window so the chart can extend the line from that known level
  // instead of showing a hard, unexplained gap.
  const priorEntry = await prisma.scoreEntry.findFirst({
    where: { recordedAt: { lt: earliestBucketStart } },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });

  let priorPercentage: number | null = null;
  if (priorEntry) {
    const priorBucketStart = bucketStart(priorEntry.recordedAt, unit);
    const priorBucketEnd = addUnits(priorBucketStart, unit, 1);
    const priorBucketEntries = await prisma.scoreEntry.findMany({
      where: { recordedAt: { gte: priorBucketStart, lt: priorBucketEnd } },
      select: { value: true, maxScore: true, recordedAt: true },
    });
    priorPercentage = averagePercentage(priorBucketEntries);
  }

  return {
    unit,
    priorPercentage,
    points: bucketDates.map((date) => {
      const pcts = buckets.get(date.getTime()) ?? [];
      return {
        date,
        averagePercentage: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
        entryCount: pcts.length,
      };
    }),
    comparison: {
      current: currentAverage,
      previous: previousAverage,
      delta: currentAverage !== null && previousAverage !== null ? currentAverage - previousAverage : null,
    },
  };
}

/**
 * The most recent recordedAt date covering the largest number of distinct
 * students — i.e. the last class-wide test day. Ties (every weekly batch is
 * normally full-class) break toward the more recent date. Counting distinct
 * students rather than raw score-entry rows keeps this robust against a
 * student having an extra/duplicate subject entry on some date, which would
 * otherwise outrank a clean, more recent full-class batch. This is also
 * deliberately not just "the latest recordedAt in the table," since a
 * handful of late-entered makeup scores can carry a newer date than the
 * actual most recent test everyone sat.
 */
async function findLatestTestDate(): Promise<Date | null> {
  const rows = await prisma.scoreEntry.findMany({
    select: { recordedAt: true, studentId: true },
    distinct: ["recordedAt", "studentId"],
  });
  if (rows.length === 0) return null;

  const studentCountByDate = new Map<number, number>();
  for (const row of rows) {
    const key = row.recordedAt.getTime();
    studentCountByDate.set(key, (studentCountByDate.get(key) ?? 0) + 1);
  }

  const maxStudents = Math.max(...studentCountByDate.values());
  let anchor: number | null = null;
  for (const [time, count] of studentCountByDate) {
    if (count === maxStudents && (anchor === null || time > anchor)) anchor = time;
  }
  return anchor === null ? null : new Date(anchor);
}

export async function getTopPerformers(limit = 5, window: StatWindow = "month", monthValue?: string) {
  let windowStart: Date;
  let windowEnd: Date | undefined;
  if (window === "month") {
    const { start, end } = monthValueRange(monthValue ?? currentMonthValue());
    windowStart = start;
    windowEnd = end;
  } else {
    const latestTestDate = await findLatestTestDate();
    if (latestTestDate) {
      windowStart = latestTestDate;
      windowEnd = new Date(latestTestDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      windowStart = new Date(Date.now() - STAT_WINDOW_DAYS.week * 24 * 60 * 60 * 1000);
    }
  }

  const students = await prisma.student.findMany({
    include: {
      scores: {
        select: { value: true, maxScore: true, recordedAt: true },
      },
    },
  });

  return students
    .map((student) => {
      const windowScores = student.scores.filter(
        (s) => s.recordedAt >= windowStart && (!windowEnd || s.recordedAt < windowEnd)
      );
      // Prefer the student's average within the selected window, but a quiet
      // week/month shouldn't push the list below `limit` entries — fall back
      // to their all-time average so the ranking still fills up.
      const averagePercentageValue = averagePercentage(windowScores) ?? averagePercentage(student.scores);
      return {
        id: student.id,
        serialNumber: student.serialNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        averagePercentage: averagePercentageValue,
      };
    })
    .filter((s) => s.averagePercentage !== null)
    .sort((a, b) => (b.averagePercentage ?? 0) - (a.averagePercentage ?? 0))
    .slice(0, limit);
}

export async function getMostImproved(limit = 5, window: StatWindow = "month", monthValue?: string) {
  let currentStart: Date;
  let currentEnd: Date | null = null;
  if (window === "month") {
    ({ start: currentStart, end: currentEnd } = monthValueRange(monthValue ?? currentMonthValue()));
  } else {
    currentStart = new Date(Date.now() - STAT_WINDOW_DAYS.week * 24 * 60 * 60 * 1000);
  }

  // The comparison period is the equivalent stretch of time immediately
  // before the current one — the previous calendar month, or the 7 days
  // before the current 7-day window.
  let previousStart: Date;
  const previousEnd: Date = currentStart;
  if (window === "month") {
    previousStart = new Date(currentStart);
    previousStart.setUTCMonth(previousStart.getUTCMonth() - 1);
  } else {
    previousStart = new Date(currentStart.getTime() - STAT_WINDOW_DAYS.week * 24 * 60 * 60 * 1000);
  }

  const students = await prisma.student.findMany({
    include: {
      scores: {
        where: {
          recordedAt: { gte: previousStart, ...(currentEnd ? { lt: currentEnd } : {}) },
        },
        select: { value: true, maxScore: true, recordedAt: true },
      },
    },
  });

  const ranked = students
    .map((student) => {
      // Bucketed strictly by recordedAt (the date the test happened), never by
      // the order scores were entered into the system.
      const currentEntries = student.scores.filter(
        (s) => s.recordedAt >= currentStart && (!currentEnd || s.recordedAt < currentEnd)
      );
      const previousEntries = student.scores.filter(
        (s) => s.recordedAt >= previousStart && s.recordedAt < previousEnd
      );

      const currentAvg = averagePercentage(currentEntries);
      const previousAvg = averagePercentage(previousEntries);
      if (currentAvg === null || previousAvg === null) return null;

      return {
        id: student.id,
        serialNumber: student.serialNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        averageDelta: currentAvg - previousAvg,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.averageDelta - a.averageDelta)
    .slice(0, limit);

  return ranked;
}

export async function getRecentScoreEntries(limit = 10) {
  const entries = await prisma.scoreEntry.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      student: true,
      topic: { include: { subject: true } },
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    studentId: entry.studentId,
    studentName: `${entry.student.firstName} ${entry.student.lastName}`,
    subjectName: entry.topic.subject.name,
    topicName: entry.topic.name,
    value: entry.value,
    maxScore: entry.maxScore,
    percentage: toPercentage(entry),
    recordedAt: entry.recordedAt,
    createdAt: entry.createdAt,
  }));
}
