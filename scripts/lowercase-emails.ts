import { prisma } from "../lib/db";

async function main() {
  const users = await prisma.user.findMany();
  let updated = 0;

  for (const user of users) {
    const lower = user.email.toLowerCase();
    if (lower !== user.email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: lower },
      });
      console.log(`  ✓ ${user.email} → ${lower}`);
      updated++;
    }
  }

  if (updated === 0) {
    console.log("All emails are already lowercase — nothing to update.");
  } else {
    console.log(`\nDone. Lowercased ${updated} email(s).`);
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
