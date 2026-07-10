"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StudentFormState } from "@/lib/actions/students";

export function StudentForm({
  action,
  defaultValues,
  submitLabel,
  onSuccess,
}: {
  action: (prev: StudentFormState, formData: FormData) => Promise<StudentFormState>;
  defaultValues?: { firstName: string; lastName: string };
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: StudentFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) onSuccess?.();
    return result;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="First name" htmlFor="firstName">
        <Input id="firstName" name="firstName" defaultValue={defaultValues?.firstName} required autoFocus />
      </Field>
      <Field label="Last name" htmlFor="lastName">
        <Input id="lastName" name="lastName" defaultValue={defaultValues?.lastName} required />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
