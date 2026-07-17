"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateScoreAction, type ActionState } from "@/lib/actions/scores";

function toDateInputValue(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function EditScoreForm({
  studentId,
  entry,
  onSuccess,
}: {
  studentId: string;
  entry: { id: string; value: number; maxScore: number; note: string | null; recordedAt: Date };
  onSuccess: () => void;
}) {
  const boundAction = updateScoreAction.bind(null, entry.id, studentId);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (!result.error) onSuccess();
    return result;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Score" htmlFor="value">
          <Input id="value" name="value" type="number" step="any" min={0} defaultValue={entry.value} required />
        </Field>
        <Field label="Out of" htmlFor="maxScore">
          <Input id="maxScore" name="maxScore" type="number" min={1} defaultValue={entry.maxScore} required />
        </Field>
      </div>
      <Field label="Date" htmlFor="recordedAt">
        <Input id="recordedAt" name="recordedAt" type="date" defaultValue={toDateInputValue(entry.recordedAt)} required />
      </Field>
      <Field label="Note (optional)" htmlFor="note">
        <Input id="note" name="note" defaultValue={entry.note ?? ""} placeholder="e.g. Week 3 quiz" />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
