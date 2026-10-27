"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fileInputClasses } from "@/components/ui/input";
import { updateProfilesAction, type ProfileUpdateResult } from "@/lib/actions/profile-import";
import { SPREADSHEET_ACCEPT } from "@/lib/spreadsheet-formats";

const selectClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

export function UpdateProfilesForm({ cohorts }: { cohorts: { id: string; name: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [dateOrder, setDateOrder] = useState("dmy");
  const [scope, setScope] = useState("all");
  const [result, setResult] = useState<ProfileUpdateResult>();
  const [checkedKey, setCheckedKey] = useState("");
  const [pending, startTransition] = useTransition();

  // The Add button only works for the exact file and settings that were checked.
  const inputsKey = `${file?.name}|${file?.size}|${file?.lastModified}|${dateOrder}|${scope}`;
  const report = result?.ok ? result.report : null;
  const updated = result?.ok ? result.updated : undefined;
  const canImport = !!report?.canImport && !updated && checkedKey === inputsKey;

  function run(mode: "preview" | "import") {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("dateOrder", dateOrder);
    formData.set("scope", scope);
    formData.set("mode", mode);
    const key = inputsKey;
    startTransition(async () => {
      const next = await updateProfilesAction(formData);
      setResult(next);
      setCheckedKey(key);
    });
  }

  const problemRows = report ? report.rows.filter((r) => r.state === "problem") : [];
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
        <p className="text-sm text-foreground-muted">
          For students who are already in the app. Each row is matched to a student by name and their profile is added. No
          new students are created, and anyone who already has a profile is left alone.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="updateFile" className="text-sm font-medium text-foreground">
              Registration spreadsheet
            </label>
            <input
              id="updateFile"
              type="file"
              accept={SPREADSHEET_ACCEPT}
              required
              className={fileInputClasses}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-foreground-muted">
              Same columns as the template, with either a <strong>Full Name</strong> column or <strong>First Name</strong> and{" "}
              <strong>Last Name</strong>. University and Course can be left blank.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="updateScope" className="text-sm font-medium text-foreground">
              Match names against
            </label>
            <select id="updateScope" value={scope} onChange={(e) => setScope(e.target.value)} className={selectClasses}>
              <option value="all">All students</option>
              <option value="none">Students with no cohort</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  Cohort {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-foreground-muted">Narrowing this avoids mixing up students with similar names.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="updateDateOrder" className="text-sm font-medium text-foreground">
              Dates like 03/04/2008 mean
            </label>
            <select id="updateDateOrder" value={dateOrder} onChange={(e) => setDateOrder(e.target.value)} className={selectClasses}>
              <option value="dmy">3 April 2008 (day first)</option>
              <option value="mdy">March 4, 2008 (month first)</option>
            </select>
            <p className="text-xs text-foreground-muted">
              Applies to dates of birth and join dates. Dates with a day above 12 are read correctly either way.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={pending || !file}>
            {pending ? "Checking…" : "Check file"}
          </Button>
          <Button type="button" disabled={pending || !canImport} onClick={() => run("import")}>
            {report && canImport ? `Add ${report.counts.matched} profiles` : "Add profiles"}
          </Button>
        </div>
      </form>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      )}

      {updated && report && (
        <div role="status" className="rounded-lg border border-border bg-primary-soft p-4 text-sm text-primary-strong">
          Added {updated.count} profiles. You can undo it from the list below.
        </div>
      )}

      {report && !updated && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">
            Matching against: {report.scopeLabel}
            {report.sheetName && <> · read sheet “{report.sheetName}”</>}
            {report.headerRow > 1 && <> · headers on row {report.headerRow}</>}
          </p>

          {report.canImport ? (
            <div role="status" className="rounded-lg border border-border bg-primary-soft p-4 text-sm text-primary-strong">
              Everything checks out: {report.counts.matched} {report.counts.matched === 1 ? "profile" : "profiles"} will be
              added
              {report.counts.hasProfile > 0 && <>, and {report.counts.hasProfile} students who already have one will be left alone</>}.
              {report.dateJoinedFromStudent > 0 && (
                <>
                  {" "}
                  {report.dateJoinedFromStudent} {report.dateJoinedFromStudent === 1 ? "row has" : "rows have"} no Date joined, so
                  it will be set to the day each student was added (editable afterwards).
                </>
              )}{" "}
              Check the matches below, then click Add. Nothing is saved until you do.
            </div>
          ) : totalProblems > 0 ? (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              {totalProblems} {totalProblems === 1 ? "problem needs" : "problems need"} fixing before these profiles can be
              added. Nothing has been saved. Fix them in the spreadsheet and upload it again.
            </div>
          ) : (
            <div role="status" className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-foreground-muted">
              Nothing to add: everyone in this file already has a profile.
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
                In this group with no profile, but not in the file ({report.notInFile.length})
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">They are left as they are. {report.notInFile.join(", ")}.</p>
            </section>
          )}

          {report.rows.length > 0 && (
            <details open className="rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                Matches ({report.rows.length} rows) — check each one before adding
              </summary>
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Name in file</th>
                      <th className="px-3 py-2">Matched to</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.line} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground-muted">{row.line}</td>
                        <td className="px-3 py-2 text-foreground">{row.csvName}</td>
                        <td className="px-3 py-2 text-foreground-muted">
                          {row.student ? `${row.student.name} (${row.student.serialNumber})` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {row.state === "problem" ? (
                            <Badge variant="danger">Fix</Badge>
                          ) : row.state === "hasProfile" ? (
                            <Badge>Already has a profile</Badge>
                          ) : row.loose ? (
                            <Badge>Matched by shared words — check</Badge>
                          ) : (
                            <Badge variant="primary">Matched</Badge>
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
