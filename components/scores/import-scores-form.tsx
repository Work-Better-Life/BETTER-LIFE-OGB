"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, fileInputClasses } from "@/components/ui/input";
import { importScoresAction, type ScoreImportResult } from "@/lib/actions/score-import";
import { SPREADSHEET_ACCEPT } from "@/lib/spreadsheet-formats";

type CohortOption = { id: string; name: string };

const selectClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ImportScoresForm({ cohorts }: { cohorts: CohortOption[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [testName, setTestName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cohort, setCohort] = useState("");
  const [result, setResult] = useState<ScoreImportResult>();
  const [checkedKey, setCheckedKey] = useState("");
  const [pending, startTransition] = useTransition();

  // The import button only works for the exact file and settings that were
  // checked. Change anything and it must be checked again.
  const inputsKey = `${file?.name}|${file?.size}|${file?.lastModified}|${testName.trim()}|${date}|${cohort}`;
  const report = result?.ok ? result.report : null;
  const imported = result?.ok ? result.imported : undefined;
  const canImport = !!report?.canImport && !imported && checkedKey === inputsKey;

  function run(mode: "preview" | "import") {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("testName", testName);
    formData.set("date", date);
    formData.set("cohort", cohort);
    formData.set("mode", mode);
    const key = inputsKey;
    startTransition(async () => {
      const next = await importScoresAction(formData);
      setResult(next);
      setCheckedKey(key);
    });
  }

  const problemRows = report ? report.rows.filter((r) => r.problems.length > 0) : [];
  const readyToCheck = !!file && testName.trim() !== "" && date !== "" && cohort !== "";

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
            <Label htmlFor="scoreFile">Scores spreadsheet</Label>
            <input
              id="scoreFile"
              type="file"
              accept={SPREADSHEET_ACCEPT}
              required
              className={fileInputClasses}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-foreground-muted">
              Excel (.xlsx, .xls), OpenDocument (.ods) or CSV. One row per student with a <strong>Name</strong>{" "}
              column, then one column per subject with its max score in brackets, like <em>Mathematics (10)</em>.
              Write ABSENT for anyone who missed it — they&apos;re saved as 0. Example file:{" "}
              <a href="/import-samples/scores-sample.csv" download className="text-primary-strong hover:underline">
                CSV
              </a>
              {" · "}
              <a href="/import-samples/scores-sample.xlsx" download className="text-primary-strong hover:underline">
                Excel
              </a>
              .
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="testName">Test name</Label>
            <Input
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. Week 8"
              maxLength={60}
              required
            />
            <p className="text-xs text-foreground-muted">Becomes the topic under each subject.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="testDate">Date written</Label>
            <Input
              id="testDate"
              type="date"
              value={date}
              required
              onChange={(e) => setDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {
                  // Picker unsupported or already open — typing still works.
                }
              }}
              className="cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scoreCohort">Whose scores are these?</Label>
            <select id="scoreCohort" value={cohort} onChange={(e) => setCohort(e.target.value)} className={selectClasses} required>
              <option value="">Choose…</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  Cohort {c.name}
                </option>
              ))}
              <option value="all">All students</option>
              <option value="none">Students with no cohort</option>
            </select>
            <p className="text-xs text-foreground-muted">Names in the file are matched only against this group.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={pending || !readyToCheck}>
            {pending ? "Checking…" : "Check file"}
          </Button>
          <Button type="button" disabled={pending || !canImport} onClick={() => run("import")}>
            {report && canImport ? `Import ${report.counts.scores} scores` : "Import scores"}
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
          Imported {imported.entryCount} scores for {imported.studentCount} students as &ldquo;{report.testName}&rdquo;.
          You can undo it from the list below.
        </div>
      )}

      {report && !imported && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">
            {report.testName} · {formatDate(report.date)} · {report.cohortLabel}
            {report.subjects.length > 0 && <> · {report.subjects.map((s) => `${s.name} /${s.max}`).join(", ")}</>}
            {report.sheetName && <> · read sheet “{report.sheetName}”</>}
            {report.headerRow > 1 && <> · headers on row {report.headerRow}</>}
          </p>

          {report.canImport ? (
            <div role="status" className="rounded-lg border border-border bg-primary-soft p-4 text-sm text-primary-strong">
              Everything checks out: {report.counts.students} students, {report.counts.scores} scores
              {report.counts.absentZeros > 0 && <> ({report.counts.absentZeros} absent saved as 0)</>}. Nothing is saved
              until you click Import.
            </div>
          ) : (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              {report.counts.problems} {report.counts.problems === 1 ? "problem needs" : "problems need"} fixing before
              this file can be imported. Nothing has been saved. Fix them in the spreadsheet and upload it again.
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

          {report.notInFile.length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-display text-base text-foreground">
                In this group but not in the file ({report.notInFile.length})
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                They get no score from this import. {report.notInFile.join(", ")}.
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
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                      <th className="px-3 py-2">Name in file</th>
                      <th className="px-3 py-2">Matched to</th>
                      {report.subjects.map((s) => (
                        <th key={s.name} className="px-3 py-2">
                          {s.name}
                        </th>
                      ))}
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
                        {row.scores.map((score, i) => (
                          <td key={i} className="px-3 py-2 text-foreground-muted">
                            {score}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {row.problems.length > 0 ? (
                            <Badge variant="danger">Fix</Badge>
                          ) : row.absentCount > 0 ? (
                            <Badge>Absent ×{row.absentCount}</Badge>
                          ) : (
                            <Badge variant="primary">OK</Badge>
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
