"use client";

import { useState, useTransition } from "react";
import { Sparkline } from "./sparkline";
import { DeltaIndicator } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditScoreForm } from "./edit-score-form";
import { deleteScoreAction } from "@/lib/actions/scores";
import { toPercentage } from "@/lib/scoring";

type Entry = {
  id: string;
  value: number;
  maxScore: number;
  note: string | null;
  recordedAt: Date;
};

const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percentage, tone }: { percentage: number; tone: "primary" | "danger" }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const color = tone === "danger" ? "var(--color-danger)" : "var(--color-primary)";
  const offset = RING_CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 500ms var(--ease-out)" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold"
        style={{ color }}
      >
        {Math.round(clamped)}
      </span>
    </div>
  );
}

export function TopicCard({
  studentId,
  topicName,
  entries,
  delta,
}: {
  studentId: string;
  topicName: string;
  entries: Entry[];
  delta: number | null;
}) {
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const percentages = entries.map(toPercentage);
  const latest = entries.at(-1);
  const recentEntries = [...entries].reverse().slice(0, expanded ? undefined : 3);
  const tone: "primary" | "danger" = delta !== null && delta < 0 ? "danger" : "primary";

  function handleDelete() {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      await deleteScoreAction(id, studentId);
      setDeleting(null);
    });
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center gap-4">
        {latest && <ProgressRing percentage={percentages[percentages.length - 1]} tone={tone} />}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{topicName}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            {latest && (
              <p className="font-display text-lg text-foreground">
                {latest.value}/{latest.maxScore}
              </p>
            )}
            <DeltaIndicator value={delta} pill />
          </div>
        </div>

        <Sparkline percentages={percentages} tone={tone} />
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {recentEntries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between text-xs text-foreground-muted">
            <span>
              {new Date(entry.recordedAt).toLocaleDateString("en-US")} · {entry.value}/{entry.maxScore}
              {entry.note ? ` · ${entry.note}` : ""}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => setEditing(entry)}
                className="rounded px-1.5 py-0.5 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleting(entry)}
                className="rounded px-1.5 py-0.5 transition-colors hover:bg-surface-muted hover:text-danger"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>

      {entries.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-primary-strong hover:underline"
        >
          {expanded ? "Show less" : `Show all ${entries.length}`}
        </button>
      )}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={`Edit score — ${topicName}`}>
        {editing && (
          <EditScoreForm studentId={studentId} entry={editing} onSuccess={() => setEditing(null)} />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this score?"
        description="This removes the entry from the student's history. This can't be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        pending={isPending}
      />
    </div>
  );
}
