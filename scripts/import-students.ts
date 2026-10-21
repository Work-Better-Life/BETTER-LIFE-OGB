import { readFileSync } from "node:fs";
import { prisma } from "../lib/db";
import { analyzeStudentImport, commitStudentImport, type CohortSelection } from "../lib/data/profile-import";
import type { DateOrder } from "../lib/profile-import";
import { readSpreadsheet } from "../lib/spreadsheet";

// Usage: npm run import-students -- <file> [--dry-run] [--date-order dmy|mdy] [--cohort "2026"]
// <file> can be .xlsx, .xls, .ods or .csv. Like the app, it saves nothing unless
// the whole file is clean.

async function main() {
  const args = process.argv.slice(2);
  const valueFlags = ["--date-order", "--cohort"];
  const file = args.find((a, i) => !a.startsWith("--") && !valueFlags.includes(args[i - 1]));
  const dryRun = args.includes("--dry-run");
  const orderIndex = args.indexOf("--date-order");
  const dateOrder = (orderIndex >= 0 ? args[orderIndex + 1] : "dmy") as DateOrder;
  const cohortIndex = args.indexOf("--cohort");
  const cohortName = cohortIndex >= 0 ? args[cohortIndex + 1]?.trim() : undefined;

  if (!file || (dateOrder !== "dmy" && dateOrder !== "mdy") || (cohortIndex >= 0 && !cohortName)) {
    console.log('Usage: npm run import-students -- <file> [--dry-run] [--date-order dmy|mdy] [--cohort "2026"]');
    process.exitCode = 1;
    return;
  }

  const sheet = readSpreadsheet(new Uint8Array(readFileSync(file)));
  if (!sheet.ok) {
    console.log(`✗ ${sheet.error}`);
    process.exitCode = 1;
    return;
  }

  let cohort: CohortSelection = { kind: "none" };
  if (cohortName) {
    const match = (await prisma.cohort.findMany()).find((c) => c.name.toLowerCase() === cohortName.toLowerCase());
    cohort = match ? { kind: "existing", id: match.id, name: match.name } : { kind: "new", name: cohortName };
  }

  const { report, plan } = await analyzeStudentImport(sheet.table, { dateOrder, cohort, fileName: file, sheetName: sheet.sheetName });

  for (const problem of report.fileProblems) console.log(`✗ ${problem}`);
  for (const row of report.rows) {
    if (row.state === "problem") console.log(`✗ row ${row.line} ${row.csvName} — ${row.problems.join(" ")}`);
    else if (row.state === "exists") console.log(`– row ${row.line} ${row.csvName} — already in the app (${row.existingSerial})`);
    else console.log(`✓ row ${row.line} ${row.csvName}`);
  }

  const { counts } = report;
  if (!report.canImport) {
    const reason = counts.problems > 0 ? `${counts.problems} problem(s) to fix` : "nothing new to import";
    console.log(`\nNot imported — ${reason}. Nothing was saved.`);
    process.exitCode = counts.problems > 0 ? 1 : 0;
    return;
  }
  if (dryRun) {
    console.log(`\nDry run — nothing saved. ${counts.new} would be created, ${counts.existing} already exist.`);
    return;
  }

  const saved = await commitStudentImport(plan);
  console.log(`\nImported ${saved.created} students (${report.cohortLabel}): ${saved.serials.join(", ")}.`);
}

main()
  .catch((error) => {
    console.error("✗ Import failed —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
