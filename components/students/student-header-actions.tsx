"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StudentForm } from "./student-form";
import { updateStudentAction, deleteStudentAction } from "@/lib/actions/students";

export function StudentHeaderActions({
  student,
}: {
  student: { id: string; firstName: string; lastName: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteStudentAction(student.id);
      router.push("/students");
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>
        Delete
      </Button>

      <Drawer open={editing} onClose={() => setEditing(false)} title="Edit student">
        <StudentForm
          action={updateStudentAction.bind(null, student.id)}
          defaultValues={{ firstName: student.firstName, lastName: student.lastName }}
          submitLabel="Save changes"
          onSuccess={() => setEditing(false)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleting}
        title={`Delete ${student.firstName} ${student.lastName}?`}
        description="This permanently removes the student and every score entry recorded for them. This can't be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleting(false)}
        pending={isPending}
      />
    </div>
  );
}
