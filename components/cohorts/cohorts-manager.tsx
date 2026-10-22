"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createCohortAction,
  renameCohortAction,
  deleteCohortAction,
  type CohortActionState,
} from "@/lib/actions/cohorts";

type Cohort = { id: string; name: string; studentCount: number };

function CreateCohortForm() {
  const [state, formAction, pending] = useActionState<CohortActionState, FormData>(createCohortAction, {});
  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="flex flex-col gap-1">
        <Input name="name" placeholder="New cohort, e.g. 2026" maxLength={60} required className="w-64" aria-label="New cohort name" />
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add cohort"}
      </Button>
    </form>
  );
}

function RenameForm({ cohort, onDone }: { cohort: Cohort; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(async (prev: CohortActionState, formData: FormData) => {
    const result = await renameCohortAction(cohort.id, prev, formData);
    if (!result.error) onDone();
    return result;
  }, {});
  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="flex flex-col gap-1">
        <Input name="name" defaultValue={cohort.name} maxLength={60} required autoFocus className="h-8 w-48" aria-label="Cohort name" />
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Save
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

export function CohortsManager({ cohorts, canWrite }: { cohorts: Cohort[]; canWrite: boolean }) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Cohort | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      const result = await deleteCohortAction(id);
      if (result.error) setDeleteError(result.error);
      setDeleting(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canWrite && <CreateCohortForm />}
      {deleteError && (
        <p role="alert" className="text-sm text-danger">
          {deleteError}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
              <th className="px-4 py-3">Cohort</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cohorts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-foreground-muted">
                  {canWrite ? "No cohorts yet. Add one above, then move students into it." : "No cohorts yet."}
                </td>
              </tr>
            )}
            {cohorts.map((cohort) => (
              <tr key={cohort.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  {renamingId === cohort.id ? <RenameForm cohort={cohort} onDone={() => setRenamingId(null)} /> : cohort.name}
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  <Link href={`/students?cohort=${cohort.id}`} className="text-primary-strong hover:underline">
                    {cohort.studentCount} student{cohort.studentCount === 1 ? "" : "s"}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {canWrite && renamingId !== cohort.id && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setRenamingId(cohort.id)}>
                        Rename
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteError(undefined);
                          setDeleting(cohort);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete cohort ${deleting?.name}?`}
        description="Only an empty cohort can be deleted. If it still has students you'll be asked to move them first."
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        pending={isPending}
      />
    </div>
  );
}
