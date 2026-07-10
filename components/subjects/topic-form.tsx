"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/subjects";

export function TopicForm({
  action,
  defaultValues,
  submitLabel,
  onSuccess,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: { name: string; defaultMaxScore: number };
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) onSuccess?.();
    return result;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Topic name" htmlFor="name">
        <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="e.g. Fractions" required autoFocus />
      </Field>
      <Field label="Default max score" htmlFor="defaultMaxScore">
        <Input
          id="defaultMaxScore"
          name="defaultMaxScore"
          type="number"
          min={1}
          defaultValue={defaultValues?.defaultMaxScore ?? 100}
          required
        />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
