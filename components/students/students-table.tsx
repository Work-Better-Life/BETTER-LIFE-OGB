"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StudentForm } from "./student-form";
import { createStudentAction, updateStudentAction, deleteStudentAction } from "@/lib/actions/students";

type StudentRow = {
  id: string;
  serialNumber: string;
  firstName: string;
  lastName: string;
  subjectNames: string[];
  averagePercentage: number | null;
  lastRecordedAt: Date | null;
};

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState<StudentRow | null>(null);
  const [isPending, startTransition] = useTransition();

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
      <div className="flex items-center justify-end">
        <Button onClick={() => setAddOpen(true)}>New Student</Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Subjects</th>
              <th className="px-4 py-3">Average</th>
              <th className="px-4 py-3">Last recorded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-foreground-muted">
                  No students yet. Add your first student to get started.
                </td>
              </tr>
            )}
            {students.map((student) => (
              <tr
                key={student.id}
                onClick={() => router.push(`/students/${student.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/60"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {student.firstName} {student.lastName}
                  </span>
                  <div className="mt-0.5">
                    <Badge>{student.serialNumber}</Badge>
                  </div>
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
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(student)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(student)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={addOpen} onClose={() => setAddOpen(false)} title="New student">
        <StudentForm action={createStudentAction} submitLabel="Add student" onSuccess={() => setAddOpen(false)} />
      </Drawer>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title="Edit student">
        {editing && (
          <StudentForm
            action={updateStudentAction.bind(null, editing.id)}
            defaultValues={{ firstName: editing.firstName, lastName: editing.lastName }}
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
