import { averagePercentage } from "@/lib/scoring";

export type TrendGraphSubject = {
  subjectId: string;
  name: string;
  percentage: number;
  scored: number;
  total: number;
  delta: number | null;
};

export type TrendGraphPoint = {
  date: string; // ISO yyyy-mm-dd
  average: number;
  scored: number;
  total: number;
  subjects: TrendGraphSubject[];
};

type ScoreWithSubject = {
  value: number;
  maxScore: number;
  recordedAt: Date;
  topic: { subject: { id: string; name: string } };
};

/** One point per distinct calendar date scored, each carrying that date's per-subject averages and their delta vs. that subject's previous test date. */
export function buildTrendPoints(rawScores: ScoreWithSubject[]): TrendGraphPoint[] {
  type Flat = { subjectId: string; name: string; value: number; maxScore: number; recordedAt: Date; dateKey: string };

  const flat: Flat[] = rawScores.map((entry) => ({
    subjectId: entry.topic.subject.id,
    name: entry.topic.subject.name,
    value: entry.value,
    maxScore: entry.maxScore,
    recordedAt: entry.recordedAt,
    dateKey: entry.recordedAt.toISOString().slice(0, 10),
  }));

  const dates = Array.from(new Set(flat.map((e) => e.dateKey))).sort();
  const lastPercentageBySubject = new Map<string, number>();

  return dates.map((date) => {
    const entriesThatDate = flat.filter((e) => e.dateKey === date);
    const bySubject = new Map<string, Flat[]>();
    for (const entry of entriesThatDate) {
      if (!bySubject.has(entry.subjectId)) bySubject.set(entry.subjectId, []);
      bySubject.get(entry.subjectId)!.push(entry);
    }

    const subjects = Array.from(bySubject.entries()).map(([subjectId, entries]) => {
      const percentage = averagePercentage(entries) ?? 0;
      const previous = lastPercentageBySubject.get(subjectId) ?? null;
      const delta = previous !== null ? percentage - previous : null;
      lastPercentageBySubject.set(subjectId, percentage);
      const scored = entries.reduce((sum, e) => sum + e.value, 0);
      const total = entries.reduce((sum, e) => sum + e.maxScore, 0);
      return { subjectId, name: entries[0].name, percentage, scored, total, delta };
    });

    return {
      date,
      average: averagePercentage(entriesThatDate) ?? 0,
      scored: entriesThatDate.reduce((sum, e) => sum + e.value, 0),
      total: entriesThatDate.reduce((sum, e) => sum + e.maxScore, 0),
      subjects,
    };
  });
}
