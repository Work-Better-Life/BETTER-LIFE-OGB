import { prisma } from "../lib/db";

async function main() {
  const students = await prisma.student.findMany({ orderBy: { createdAt: "asc" } });

  if (students.length === 0) {
    console.log("There are no students to renumber.");
    return;
  }

  console.log(`Renumbering ${students.length} students by creation order (oldest = 001)...\n`);

  // Two passes: first move everyone to a unique placeholder, then assign the
  // final sequential numbers — avoids unique-constraint collisions when a
  // student's new number happens to match another student's current one.
  for (const [i, student] of students.entries()) {
    await prisma.student.update({
      where: { id: student.id },
      data: { serialNumber: `TMP-${i}-${student.id}` },
    });
  }

  for (const [i, student] of students.entries()) {
    const initials = `${student.firstName.trim()[0] ?? ""}${student.lastName.trim()[0] ?? ""}`.toUpperCase();
    const serialNumber = `${initials}${String(i + 1).padStart(3, "0")}`;
    await prisma.student.update({ where: { id: student.id }, data: { serialNumber } });
    console.log(`${String(i + 1).padStart(3, "0")}. ${student.firstName} ${student.lastName} -> ${serialNumber}`);
  }

  console.log("\n✓ Done.");
}

main()
  .catch((error) => {
    console.error("\n✗ Renumbering failed —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
