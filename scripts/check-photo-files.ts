import { prisma } from "../lib/db";
import { deleteUploadedFiles, listUploadedFiles } from "../lib/storage";

// Compares the profile photos stored in UploadThing with the ones the database
// knows about.
//
//   npm run check-photo-files            report only
//   npm run check-photo-files -- --delete   also delete the orphaned files
//
// "Orphaned" = a file named photo.jpg (what the app uploads) that no student
// points to. Only those are ever deleted; anything else in the UploadThing app
// is left alone. Files uploaded in the last 10 minutes are skipped, since an
// upload in progress isn't recorded until it finishes.

const APP_FILE_NAME = "photo.jpg";
const GRACE_MS = 10 * 60 * 1000;

async function main() {
  const shouldDelete = process.argv.includes("--delete");
  const [files, rows] = await Promise.all([
    listUploadedFiles(),
    prisma.studentPhoto.findMany({ where: { key: { not: null } }, select: { key: true, studentId: true } }),
  ]);

  const referenced = new Set(rows.map((r) => r.key as string));
  const stored = new Set(files.map((f) => f.key));
  const now = Date.now();

  const appFiles = files.filter((f) => f.name === APP_FILE_NAME);
  const orphans = appFiles.filter((f) => !referenced.has(f.key) && now - f.uploadedAt > GRACE_MS);
  const recent = appFiles.filter((f) => !referenced.has(f.key) && now - f.uploadedAt <= GRACE_MS);
  const broken = rows.filter((r) => !stored.has(r.key as string));
  const others = files.length - appFiles.length;

  console.log(`Files in UploadThing: ${files.length} (${appFiles.length} profile photos, ${others} other, never touched)`);
  console.log(`Photos the database points to: ${rows.length}\n`);

  if (recent.length > 0) console.log(`– ${recent.length} unreferenced file(s) uploaded in the last 10 minutes: skipped (may be mid-upload).`);

  if (broken.length > 0) {
    console.log(`✗ ${broken.length} student photo record(s) point to a file that no longer exists (the photo won't display):`);
    for (const row of broken) console.log(`    student ${row.studentId}  key ${row.key}`);
  }

  if (orphans.length === 0) {
    console.log(broken.length === 0 ? "✓ No orphaned photo files." : "\n✓ No orphaned photo files.");
    process.exitCode = broken.length > 0 ? 1 : 0;
    return;
  }

  console.log(`\n${orphans.length} orphaned photo file(s) no student points to:`);
  for (const file of orphans) console.log(`    ${file.key}  uploaded ${new Date(file.uploadedAt).toISOString()}`);

  if (!shouldDelete) {
    console.log("\nNothing was deleted. Re-run with --delete to remove them.");
    process.exitCode = 1;
    return;
  }
  await deleteUploadedFiles(orphans.map((f) => f.key));
  console.log(`\n✓ Deleted ${orphans.length} orphaned file(s).`);
}

main()
  .catch((error) => {
    console.error("✗ Check failed —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
