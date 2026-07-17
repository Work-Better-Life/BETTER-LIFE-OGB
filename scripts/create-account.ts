import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";

const CTRL_C = String.fromCharCode(3);
const BACKSPACE_DEL = String.fromCharCode(127);
const BACKSPACE_ASCII = "\b";

async function askHidden(promptText: string): Promise<string> {
  if (!stdin.isTTY) {
    // No TTY (piped input, some CI shells) — raw mode isn't available, fall back to a visible prompt.
    const fallback = readline.createInterface({ input: stdin, output: stdout });
    const answer = await fallback.question(promptText);
    fallback.close();
    return answer;
  }

  return new Promise((resolve) => {
    stdout.write(promptText);
    let value = "";

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char: string) => {
      if (char === "\r" || char === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
        return;
      }

      if (char === CTRL_C) {
        stdout.write("\n");
        process.exit(1);
      }

      if (char === BACKSPACE_DEL || char === BACKSPACE_ASCII) {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }

      value += char;
      stdout.write("*");
    };

    stdin.on("data", onData);
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  console.log("Create or update a login account for Better Life OGB.\n");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const email = (await rl.question("Email: ")).trim();
  const name = (await rl.question('Name (optional, defaults to "Admin"): ')).trim() || "Admin";
  rl.close();

  const password = await askHidden("Password (min 8 characters): ");
  const confirmPassword = await askHidden("Confirm password: ");

  if (!EMAIL_PATTERN.test(email)) {
    console.log("\n✗ Account not created — that doesn't look like a valid email address.");
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.log("\n✗ Account not created — password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  if (password !== confirmPassword) {
    console.log("\n✗ Account not created — passwords didn't match.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`\n✓ Account ready — ${user.email} (${user.name})`);
}

main()
  .catch((error) => {
    console.error("\n✗ Account not created —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
