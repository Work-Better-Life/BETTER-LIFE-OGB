"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { undoStudentImportAction } from "@/lib/actions/profile-import";

type ImportRow = {
  id: string;
  fileName: string | null;
  cohortName: string | null;
  createdAt: string;
  studentCount: number;
  remaining: number;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function RecentStudentImports({ imports }: { imports: ImportRow[] }) {
  const [undoing, setUndoing] = useState<ImportRow | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean }>();
  const [pending, startTransition] = useTransition();

  if (imports.length === 0) return null;

  function handleUndo() {
    if (!undoing) return;
    const target = undoing;
    startTransition(async () => {
      const result = await undoStudentImportAction(target.id);
      setUndoing(null);
      setMessage(
        result.error
          ? { text: result.error, isError: true }
          : { text: `Undid the import of ${result.removed} students.`, isError: false }
      );
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg text-foreground">Recent imports</h2>
        <p className="text-sm text-foreground-muted">
          Spotted a mistake? Undo the import, correct the spreadsheet, then import it again. Undo only works while none
          of those students have scores yet.
        </p>
      </div>
      {message && (
        <p role={message.isError ? "alert" : "status"} className={message.isError ? "text-sm text-danger" : "text-sm text-foreground-muted"}>
          {message.text}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {imports.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{item.fileName ?? "Imported file"}</span>
                  <div className="text-xs text-foreground-muted">
                    {formatWhen(item.createdAt)} · {item.cohortName ?? "No cohort"}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {item.remaining === item.studentCount ? `${item.studentCount} students` : `${item.remaining} of ${item.studentCount} students left`}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setUndoing(item)}>
                    Undo
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!undoing}
        title="Undo this import?"
        description={`This deletes the ${undoing?.remaining ?? 0} students this import created, along with their profiles and photos. It's refused if any of them already has scores. This can't be undone, but you can import the file again.`}
        onConfirm={handleUndo}
        onCancel={() => setUndoing(null)}
        pending={pending}
      />
    </section>
  );
}
