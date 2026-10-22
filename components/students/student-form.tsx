"use client";

import { useActionState, useState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CohortSelect } from "@/components/cohorts/cohort-select";
import type { StudentFormState } from "@/lib/actions/students";

export function StudentForm({
  action,
  defaultValues,
  cohorts,
  submitLabel,
  onSuccess,
}: {
  action: (prev: StudentFormState, formData: FormData) => Promise<StudentFormState>;
  defaultValues?: { firstName: string; lastName: string; cohortId?: string | null };
  cohorts: { id: string; name: string }[];
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [cohortValue, setCohortValue] = useState(defaultValues?.cohortId ?? "");
  const [newCohortName, setNewCohortName] = useState("");
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
      <Field label="Cohort" htmlFor="cohortId">
        <CohortSelect
          cohorts={cohorts}
          value={cohortValue}
          newName={newCohortName}
          onChange={setCohortValue}
          onNewNameChange={setNewCohortName}
        />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
