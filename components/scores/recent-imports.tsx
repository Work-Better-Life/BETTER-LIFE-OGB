"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { undoScoreImportAction } from "@/lib/actions/score-import";

type ImportRow = {
  id: string;
  testName: string;
  fileName: string | null;
  cohortName: string | null;
  recordedAt: string;
  createdAt: string;
  entryCount: number;
  remaining: number;
};

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function RecentImports({ imports }: { imports: ImportRow[] }) {
  const [undoing, setUndoing] = useState<ImportRow | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean }>();
  const [pending, startTransition] = useTransition();

  if (imports.length === 0) return null;

  function handleUndo() {
    if (!undoing) return;
    const target = undoing;
    startTransition(async () => {
      const result = await undoScoreImportAction(target.id);
      setUndoing(null);
      setMessage(
        result.error
          ? { text: result.error, isError: true }
          : { text: `Undid “${target.testName}” — ${result.removed} scores removed.`, isError: false }
      );
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg text-foreground">Recent imports</h2>
        <p className="text-sm text-foreground-muted">
          Spotted a mistake in a file? Undo the import, correct the spreadsheet, then import it again.
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
                  <span className="font-medium text-foreground">{item.testName}</span>
                  <div className="text-xs text-foreground-muted">
                    {formatDay(item.recordedAt)} · {item.cohortName ?? "All students"}
                    {item.fileName ? ` · ${item.fileName}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {item.remaining === item.entryCount ? `${item.entryCount} scores` : `${item.remaining} of ${item.entryCount} scores left`}
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
        title={`Undo “${undoing?.testName}”?`}
        description={`This removes the ${undoing?.remaining ?? 0} scores this import added, and the “${undoing?.testName}” test itself if nothing else uses it. Scores you've edited since the import are removed too. This can't be undone, but you can import the file again.`}
        onConfirm={handleUndo}
        onCancel={() => setUndoing(null)}
        pending={pending}
      />
    </section>
  );
}
