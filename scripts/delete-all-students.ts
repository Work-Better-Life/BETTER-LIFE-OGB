import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { prisma } from "../lib/db";

async function main() {
  const [studentCount, scoreCount] = await Promise.all([
    prisma.student.count(),
    prisma.scoreEntry.count(),
  ]);

  if (studentCount === 0) {
    console.log("There are no students to delete.");
    return;
  }

  console.log(
    `This will permanently delete all ${studentCount} students and all ${scoreCount} score entries recorded for them.`
  );
  console.log("Subjects and topics are not affected.\n");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const confirmation = (await rl.question('Type "DELETE" to confirm: ')).trim();
  rl.close();

  if (confirmation !== "DELETE") {
    console.log("Cancelled — no data was deleted.");
    return;
  }

  const { count } = await prisma.student.deleteMany();
  console.log(`\n✓ Deleted ${count} students and all of their score entries.`);
}

main()
  .catch((error) => {
    console.error("\n✗ Delete failed —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
