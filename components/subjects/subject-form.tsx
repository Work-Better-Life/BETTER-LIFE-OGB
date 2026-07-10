"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/subjects";

export function SubjectForm({
  action,
  defaultName,
  submitLabel,
  onSuccess,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultName?: string;
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
      <Field label="Subject name" htmlFor="name">
        <Input id="name" name="name" defaultValue={defaultName} placeholder="e.g. Mathematics" required autoFocus />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
