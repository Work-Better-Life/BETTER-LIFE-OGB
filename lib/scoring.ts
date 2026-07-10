export type ScoreLike = {
  value: number;
  maxScore: number;
  recordedAt: Date;
};

export function toPercentage(entry: ScoreLike): number {
  if (entry.maxScore <= 0) return 0;
  return (entry.value / entry.maxScore) * 100;
}

export function averagePercentage(entries: ScoreLike[]): number | null {
  if (entries.length === 0) return null;
  const sum = entries.reduce((total, entry) => total + toPercentage(entry), 0);
  return sum / entries.length;
}

/** Delta between the latest entry and the one before it, both already sorted ascending by recordedAt. */
export function latestDelta(sortedEntries: ScoreLike[]): number | null {
  if (sortedEntries.length < 2) return null;
  const latest = toPercentage(sortedEntries[sortedEntries.length - 1]);
  const previous = toPercentage(sortedEntries[sortedEntries.length - 2]);
  return latest - previous;
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((total, v) => total + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export type ConsistencyLabel = "High" | "Medium" | "Low";

/** Consistency over the last up-to-5 entries (sorted ascending). Null until at least 2 entries exist. */
export function consistencyScore(sortedEntries: ScoreLike[]): number | null {
  if (sortedEntries.length < 2) return null;
  const recent = sortedEntries.slice(-5).map(toPercentage);
  const score = 100 - standardDeviation(recent);
  return Math.min(100, Math.max(0, score));
}

export function consistencyLabel(score: number): ConsistencyLabel {
  if (score >= 85) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}
