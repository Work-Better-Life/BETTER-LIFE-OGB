"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StudentForm } from "./student-form";
import { CohortSelect } from "@/components/cohorts/cohort-select";
import { assignCohortAction } from "@/lib/actions/cohorts";
import { createStudentAction, updateStudentAction, deleteStudentAction } from "@/lib/actions/students";

type StudentRow = {
  id: string;
  serialNumber: string;
  firstName: string;
  lastName: string;
  cohortId: string | null;
  cohortName: string | null;
  subjectNames: string[];
  averagePercentage: number | null;
  lastRecordedAt: Date | null;
};

type CohortOption = { id: string; name: string };

export function StudentsTable({
  students,
  cohorts,
  canWrite,
}: {
  students: StudentRow[];
  cohorts: CohortOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState<StudentRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState("");
  const [moveToNewName, setMoveToNewName] = useState("");
  const [moveMessage, setMoveMessage] = useState<{ text: string; isError: boolean }>();
  const [isMoving, startMoving] = useTransition();

  // Only rows currently on screen count, so a selection made on another page
  // (or before a filter changed) can't be moved by accident.
  const selectedIds = students.filter((s) => selected.has(s.id)).map((s) => s.id);
  const allSelected = students.length > 0 && selectedIds.length === students.length;

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(students.map((s) => s.id)));
  }

  function handleMove() {
    setMoveMessage(undefined);
    startMoving(async () => {
      const result = await assignCohortAction(selectedIds, moveTo, moveToNewName);
      if (result.error) {
        setMoveMessage({ text: result.error, isError: true });
        return;
      }
      setMoveMessage({ text: `Moved ${result.moved} student${result.moved === 1 ? "" : "s"}.`, isError: false });
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      await deleteStudentAction(id);
      setDeleting(null);
    });
  }

  return (
    <>
      {canWrite && (
        <div className="flex items-center justify-end">
          <Button onClick={() => setAddOpen(true)}>New Student</Button>
        </div>
      )}

      {canWrite && selectedIds.length > 0 && (
        <div className="mt-4 flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface-muted p-3">
          <span className="pt-2 text-sm font-medium text-foreground">{selectedIds.length} selected</span>
          <div className="w-52">
            <CohortSelect
              id="moveCohort"
              cohorts={cohorts}
              value={moveTo}
              newName={moveToNewName}
              onChange={setMoveTo}
              onNewNameChange={setMoveToNewName}
            />
          </div>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? "Moving…" : "Move to cohort"}
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}
      {moveMessage && (
        <p role={moveMessage.isError ? "alert" : "status"} className={moveMessage.isError ? "mt-2 text-sm text-danger" : "mt-2 text-sm text-foreground-muted"}>
          {moveMessage.text}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
              {canWrite && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all students on this page"
                    className="size-4 accent-primary"
                  />
                </th>
              )}
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Cohort</th>
              <th className="px-4 py-3">Subjects</th>
              <th className="px-4 py-3">Average</th>
              <th className="px-4 py-3">Last recorded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 7 : 5} className="px-4 py-10 text-center text-foreground-muted">
                  {canWrite ? "No students yet. Add your first student to get started." : "No students yet."}
                </td>
              </tr>
            )}
            {students.map((student) => (
              <tr
                key={student.id}
                onClick={() => router.push(`/students/${student.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/60"
              >
                {canWrite && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(student.id)}
                      onChange={() => toggleOne(student.id)}
                      aria-label={`Select ${student.firstName} ${student.lastName}`}
                      className="size-4 accent-primary"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {student.firstName} {student.lastName}
                  </span>
                  <div className="mt-0.5">
                    <Badge>{student.serialNumber}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {student.cohortName ? <Badge>{student.cohortName}</Badge> : "—"}
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {student.subjectNames.length ? student.subjectNames.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 font-display">
                  {student.averagePercentage !== null ? `${student.averagePercentage.toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {student.lastRecordedAt ? new Date(student.lastRecordedAt).toLocaleDateString("en-US") : "—"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {canWrite && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(student)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(student)}>
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

      <Drawer open={addOpen} onClose={() => setAddOpen(false)} title="New student">
        <StudentForm
          action={createStudentAction}
          cohorts={cohorts}
          submitLabel="Add student"
          onSuccess={() => setAddOpen(false)} />
      </Drawer>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title="Edit student">
        {editing && (
          <StudentForm
            action={updateStudentAction.bind(null, editing.id)}
            defaultValues={{ firstName: editing.firstName, lastName: editing.lastName, cohortId: editing.cohortId }}
            cohorts={cohorts}
            submitLabel="Save changes"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.firstName} ${deleting?.lastName}?`}
        description="This permanently removes the student and every score entry recorded for them. This can't be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        pending={isPending}
      />
    </>
  );
}
