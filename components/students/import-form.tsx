"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CohortSelect } from "@/components/cohorts/cohort-select";
import { fileInputClasses } from "@/components/ui/input";
import { importStudentsAction, type StudentImportResult } from "@/lib/actions/profile-import";
import { SPREADSHEET_ACCEPT } from "@/lib/spreadsheet-formats";

const selectClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

export function ImportForm({ cohorts }: { cohorts: { id: string; name: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [dateOrder, setDateOrder] = useState("dmy");
  const [cohortValue, setCohortValue] = useState("");
  const [newCohortName, setNewCohortName] = useState("");
  const [result, setResult] = useState<StudentImportResult>();
  const [checkedKey, setCheckedKey] = useState("");
  const [pending, startTransition] = useTransition();

  // The Import button only works for the exact file and settings that were
  // checked. Change anything and it must be checked again.
  const inputsKey = `${file?.name}|${file?.size}|${file?.lastModified}|${dateOrder}|${cohortValue}|${newCohortName.trim()}`;
  const report = result?.ok ? result.report : null;
  const imported = result?.ok ? result.imported : undefined;
  const canImport = !!report?.canImport && !imported && checkedKey === inputsKey;

  function run(mode: "preview" | "import") {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("dateOrder", dateOrder);
    formData.set("cohortId", cohortValue);
    formData.set("newCohortName", newCohortName);
    formData.set("mode", mode);
    const key = inputsKey;
    startTransition(async () => {
      const next = await importStudentsAction(formData);
      setResult(next);
      setCheckedKey(key);
    });
  }

  const problemRows = report ? report.rows.filter((r) => r.state === "problem") : [];
  const existingRows = report ? report.rows.filter((r) => r.state === "exists") : [];
  const totalProblems = report ? report.fileProblems.length + problemRows.length : 0;

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          run("preview");
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="file" className="text-sm font-medium text-foreground">
              Registration spreadsheet
            </label>
            <input
              id="file"
              type="file"
              accept={SPREADSHEET_ACCEPT}
              required
              className={fileInputClasses}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-foreground-muted">
              Excel (.xlsx, .xls), OpenDocument (.ods) or CSV, with the columns from the template below.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cohortId" className="text-sm font-medium text-foreground">
              Add everyone to cohort
            </label>
            <CohortSelect
              cohorts={cohorts}
              value={cohortValue}
              newName={newCohortName}
              onChange={setCohortValue}
              onNewNameChange={setNewCohortName}
            />
            <p className="text-xs text-foreground-muted">Applies to every student this import creates.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dateOrder" className="text-sm font-medium text-foreground">
              Dates like 03/04/2008 mean
            </label>
            <select id="dateOrder" value={dateOrder} onChange={(e) => setDateOrder(e.target.value)} className={selectClasses}>
              <option value="dmy">3 April 2008 (day first)</option>
              <option value="mdy">March 4, 2008 (month first)</option>
            </select>
            <p className="text-xs text-foreground-muted">Dates with a day above 12 are read correctly either way.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={pending || !file}>
            {pending ? "Checking…" : "Check file"}
          </Button>
          <Button type="button" disabled={pending || !canImport} onClick={() => run("import")}>
            {report && canImport ? `Import ${report.counts.new} students` : "Import students"}
          </Button>
        </div>
      </form>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      )}

      {imported && report && (
        <div role="status" className="rounded-lg border border-border bg-primary-soft p-4 text-sm text-primary-strong">
          Imported {imported.created} students ({report.cohortLabel}). You can undo it from the list below.
        </div>
      )}

      {report && !imported && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">
            {report.cohortLabel}
            {report.sheetName && <> · read sheet “{report.sheetName}”</>}
            {report.headerRow > 1 && <> · headers on row {report.headerRow}</>}
          </p>

          {report.canImport ? (
            <div role="status" className="rounded-lg border border-border bg-primary-soft p-4 text-sm text-primary-strong">
              Everything checks out: {report.counts.new} new {report.counts.new === 1 ? "student" : "students"} will be
              created
              {report.counts.existing > 0 && <>, and {report.counts.existing} already in the app will be left alone</>}.
              Nothing is saved until you click Import.
            </div>
          ) : totalProblems > 0 ? (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              {totalProblems} {totalProblems === 1 ? "problem needs" : "problems need"} fixing before this file can be
              imported. Nothing has been saved. Fix them in the spreadsheet and upload it again.
            </div>
          ) : (
            <div role="status" className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-foreground-muted">
              Nothing to import: everyone in this file is already in the app.
            </div>
          )}

          {report.fileProblems.length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-display text-base text-foreground">About the file</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-danger">
                {report.fileProblems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </section>
          )}

          {problemRows.length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-display text-base text-foreground">Rows to fix</h3>
              <ul className="mt-2 flex flex-col gap-3">
                {problemRows.map((row) => (
                  <li key={row.line} className="text-sm">
                    <span className="font-medium text-foreground">
                      Row {row.line} · {row.csvName || "(no name)"}
                    </span>
                    <ul className="mt-0.5 list-disc pl-5 text-danger">
                      {row.problems.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {existingRows.length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-display text-base text-foreground">Already in the app ({existingRows.length})</h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Same name and date of birth, so they&apos;re left as they are:{" "}
                {existingRows.map((r) => `${r.csvName} (${r.existingSerial})`).join(", ")}.
              </p>
            </section>
          )}

          {report.rows.length > 0 && (
            <details className="rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                All {report.rows.length} rows
              </summary>
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.line} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground-muted">Row {row.line}</td>
                        <td className="px-3 py-2 text-foreground">{row.csvName}</td>
                        <td className="px-3 py-2">
                          {row.state === "problem" ? (
                            <Badge variant="danger">Fix</Badge>
                          ) : row.state === "exists" ? (
                            <Badge>Already in app</Badge>
                          ) : (
                            <Badge variant="primary">New</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
