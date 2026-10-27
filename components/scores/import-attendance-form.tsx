"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, fileInputClasses } from "@/components/ui/input";
import { importAttendanceAction, type AttendanceImportResult } from "@/lib/actions/score-import";
import { SPREADSHEET_ACCEPT } from "@/lib/spreadsheet-formats";

const selectClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function ImportAttendanceForm({ cohorts }: { cohorts: { id: string; name: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [scope, setScope] = useState("all");
  const [week, setWeek] = useState("");
  const [dateOrder, setDateOrder] = useState("dmy");
  const [result, setResult] = useState<AttendanceImportResult>();
  const [checkedKey, setCheckedKey] = useState("");
  const [pending, startTransition] = useTransition();

  // The Import button only works for the exact file and settings that were checked.
  const inputsKey = `${file?.name}|${file?.size}|${file?.lastModified}|${scope}|${week}|${dateOrder}`;
  const report = result?.ok ? result.report : null;
  const imported = result?.ok ? result.imported : undefined;
  const canImport = !!report?.canImport && !imported && checkedKey === inputsKey;

  function run(mode: "preview" | "import") {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("scope", scope);
    formData.set("week", week);
    formData.set("dateOrder", dateOrder);
    formData.set("mode", mode);
    const key = inputsKey;
    startTransition(async () => {
      const next = await importAttendanceAction(formData);
      setResult(next);
      setCheckedKey(key);
    });
  }

  const problemRows = report ? report.rows.filter((r) => r.problems.length > 0) : [];

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          run("preview");
        }}
      >
        <p className="text-sm text-foreground-muted">
          For weeks that were recorded before attendance existed. A normal scores file can carry an <strong>Attendance (5)</strong>{" "}
          column too; use this when you only have attendance.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="attendanceFile" className="text-sm font-medium text-foreground">
              Attendance spreadsheet
            </label>
            <input
              id="attendanceFile"
              type="file"
              accept={SPREADSHEET_ACCEPT}
              required
              className={fileInputClasses}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-foreground-muted">
              A <strong>Name</strong> column and an <strong>Attendance (5)</strong> column: the days attended that week, 0 to 5.
              Optionally a <strong>Week</strong> column (any date in the week) so one file can hold many weeks.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="attendanceWeek" className="text-sm font-medium text-foreground">
              Week this is for
            </label>
            <Input
              id="attendanceWeek"
              type="date"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {
                  // Picker unsupported or already open — typing still works.
                }
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-foreground-muted">
              Any day in the week will do. Leave it empty if the file has a Week column; a date in the file wins over this.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="attendanceScope" className="text-sm font-medium text-foreground">
              Match names against
            </label>
            <select id="attendanceScope" value={scope} onChange={(e) => setScope(e.target.value)} className={selectClasses}>
              <option value="all">All students</option>
              <option value="none">Students with no cohort</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  Cohort {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="attendanceDateOrder" className="text-sm font-medium text-foreground">
              Dates like 03/04/2026 mean
            </label>
            <select id="attendanceDateOrder" value={dateOrder} onChange={(e) => setDateOrder(e.target.value)} className={selectClasses}>
              <option value="dmy">3 April 2026 (day first)</option>
              <option value="mdy">March 4, 2026 (month first)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={pending || !file}>
            {pending ? "Checking…" : "Check file"}
          </Button>
          <Button type="button" disabled={pending || !canImport} onClick={() => run("import")}>
            {report && canImport ? `Import ${report.counts.records} attendance records` : "Import attendance"}
          </Button>
        </div>
      </form>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      )}

      {imported && (
        <div role="status" className="rounded-lg border border-border bg-primary-soft p-4 text-sm text-primary-strong">
          Imported {imported.count} attendance records across {imported.weeks} {imported.weeks === 1 ? "week" : "weeks"}. You can undo it
          from the list below.
        </div>
      )}

      {report && !imported && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">
            {report.scopeLabel}
            {report.sheetName && <> · read sheet “{report.sheetName}”</>}
            {report.headerRow > 1 && <> · headers on row {report.headerRow}</>}
          </p>

          {report.canImport ? (
            <div role="status" className="rounded-lg border border-border bg-primary-soft p-4 text-sm text-primary-strong">
              Everything checks out: {report.counts.records} records for {report.counts.students}{" "}
              {report.counts.students === 1 ? "student" : "students"} across {report.counts.weeks}{" "}
              {report.counts.weeks === 1 ? "week" : "weeks"} (weeks of {report.weeks.map(formatDay).join(", ")}). Nothing is saved until you
              click Import.
            </div>
          ) : (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              {report.counts.problems} {report.counts.problems === 1 ? "problem needs" : "problems need"} fixing before this file can be
              imported. Nothing has been saved. Fix them in the spreadsheet and upload it again.
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

          {report.rows.length > 0 && (
            <details className="rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">All {report.rows.length} rows</summary>
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                      <th className="px-3 py-2">Name in file</th>
                      <th className="px-3 py-2">Matched to</th>
                      <th className="px-3 py-2">Week of</th>
                      <th className="px-3 py-2">Days</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.line} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground">{row.csvName}</td>
                        <td className="px-3 py-2 text-foreground-muted">
                          {row.student ? `${row.student.name} (${row.student.serialNumber})` : "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted">{row.weekOf ? formatDay(row.weekOf) : "—"}</td>
                        <td className="px-3 py-2 text-foreground-muted">{row.days ?? "—"}</td>
                        <td className="px-3 py-2">
                          {row.problems.length > 0 ? <Badge variant="danger">Fix</Badge> : <Badge variant="primary">OK</Badge>}
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
