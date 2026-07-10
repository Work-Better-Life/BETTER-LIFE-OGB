import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { prisma } from "../lib/db";

async function main() {
  const accounts = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true },
  });

  if (accounts.length === 0) {
    console.log("There are no accounts to delete.");
    return;
  }

  console.log("Accounts:\n");
  accounts.forEach((account, i) => {
    console.log(`  ${i + 1}. ${account.email} (${account.name})`);
  });

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const choice = (await rl.question("\nNumber of the account to delete (or Enter to cancel): ")).trim();

  if (!choice) {
    console.log("Cancelled — no account was deleted.");
    rl.close();
    return;
  }

  const index = Number(choice) - 1;
  const account = accounts[index];
  if (!account) {
    console.log("✗ That's not a valid number. No account was deleted.");
    rl.close();
    process.exitCode = 1;
    return;
  }

  const confirmation = (
    await rl.question(`Type the email address to confirm deleting "${account.email}": `)
  ).trim();
  rl.close();

  if (confirmation !== account.email) {
    console.log("✗ Confirmation didn't match — no account was deleted.");
    process.exitCode = 1;
    return;
  }

  await prisma.user.delete({ where: { id: account.id } });
  console.log(`\n✓ Deleted ${account.email}.`);
}

main()
  .catch((error) => {
    console.error("\n✗ Account not deleted —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
