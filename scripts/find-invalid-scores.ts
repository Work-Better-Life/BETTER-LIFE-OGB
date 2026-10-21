import { prisma } from "../lib/db";

// Read-only: lists score entries whose value is above their max score (or whose
// max is not positive). These show up as >100% and stretch charts. Fix each one
// from the student's page, then re-run to confirm the list is empty.

async function main() {
  const entries = await prisma.scoreEntry.findMany({
    include: { student: true, topic: { include: { subject: true } } },
    orderBy: { recordedAt: "desc" },
  });
  const invalid = entries.filter((e) => e.maxScore <= 0 || e.value > e.maxScore || e.value < 0);

  if (invalid.length === 0) {
    console.log(`✓ All ${entries.length} score entries are within range.`);
    return;
  }

  console.log(`Found ${invalid.length} out-of-range score(s) out of ${entries.length}:\n`);
  for (const e of invalid) {
    const percent = e.maxScore > 0 ? ` (${((e.value / e.maxScore) * 100).toFixed(1)}%)` : "";
    console.log(
      `${e.recordedAt.toISOString().slice(0, 10)}  ${e.student.serialNumber} ${e.student.firstName} ${e.student.lastName}` +
        `  —  ${e.topic.subject.name} / ${e.topic.name}:  ${e.value} / ${e.maxScore}${percent}`
    );
  }
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("✗ Check failed —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
