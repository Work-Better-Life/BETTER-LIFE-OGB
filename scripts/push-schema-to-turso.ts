import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@libsql/client";

// Prisma's schema engine can't connect to libsql:// URLs directly (it only
// understands standard connection string schemes), so `prisma migrate` /
// `prisma db push` don't work against Turso. Instead, this applies each
// existing migration.sql file straight to Turso via the libsql client —
// the same SQL Prisma already generated, just executed a different way.
// Applied migrations are recorded in an _applied_migrations table so each
// one only ever runs once.
//
//   npm run push-schema-to-turso                      apply pending migrations
//   npm run push-schema-to-turso -- --dry-run         only look: print the target and what's pending
//   npm run push-schema-to-turso -- --yes             skip the typed confirmation (scripts / CI)
//
// To target another database, point it at another env file:
//   npx tsx --env-file=.env.prod scripts/push-schema-to-turso.ts --dry-run
//
// It always inspects the database read-only first, shows which database it is
// about to change, and (unless --yes) makes you type that database's name.

// The tables the very first migration (init) creates. A database that has
// never been tracked is only treated as "init already applied" if it contains
// exactly these, so a database in an unexpected state is never half-migrated.
const INIT_TABLES = ["Subject", "Topic", "ScoreEntry", "Student", "User"].sort();

function splitStatements(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function describeTarget(url: string) {
  try {
    const host = new URL(url.replace(/^libsql:/, "https:")).hostname;
    return { host, name: host.split(".")[0] };
  } catch {
    return { host: url, name: url };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const assumeYes = args.includes("--yes");

  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL must be set.");
  const target = describeTarget(url);

  const client = createClient({ url, authToken });

  const migrationsDir = join(__dirname, "..", "prisma", "migrations");
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  // ---- 1. Look, read-only. Nothing is written until the checks below pass. ----
  const tableRows = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  const tables = tableRows.rows.map((r) => String(r.name));
  const hasTracking = tables.includes("_applied_migrations");
  const appTables = tables.filter((t) => t !== "_applied_migrations").sort();

  let applied = new Set<string>();
  if (hasTracking) {
    const tracked = await client.execute("SELECT name FROM _applied_migrations");
    applied = new Set(tracked.rows.map((row) => String(row.name)));
  }

  // A database with data but no tracking table was pushed by the old script,
  // which only knew the init migration.
  let baseline: string | null = null;
  if (applied.size === 0 && appTables.length > 0) {
    const looksLikeInit = JSON.stringify(appTables) === JSON.stringify(INIT_TABLES);
    if (!looksLikeInit) {
      throw new Error(
        `This database has tables the first migration doesn't create (found: ${appTables.join(", ")}; ` +
          `expected exactly: ${INIT_TABLES.join(", ")}). Refusing to guess which migrations it already has — ` +
          "check you're pointing at the right database."
      );
    }
    baseline = folders[0];
    applied.add(baseline);
  }

  const pending = folders.filter((f) => !applied.has(f));

  console.log(`Database : ${target.host}`);
  console.log(`Tables   : ${appTables.length === 0 ? "(none — empty database)" : appTables.join(", ")}`);
  if (baseline) console.log(`Tracking : not set up yet; ${baseline} will be recorded as already applied`);
  console.log(`Pending  : ${pending.length === 0 ? "none" : `${pending.length} migration(s)`}`);
  for (const folder of pending) console.log(`   • ${folder}`);

  if (pending.length === 0) {
    console.log("\n✓ Turso database is up to date. Nothing to do.");
    client.close();
    return;
  }
  if (dryRun) {
    console.log("\nDry run — nothing was changed.");
    client.close();
    return;
  }

  // ---- 2. Confirm which database is about to change ----
  if (!assumeYes) {
    if (!stdin.isTTY) {
      throw new Error("This needs a person to confirm. Run it in a terminal, or pass --yes.");
    }
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = (await rl.question(`\nThis will change ${target.host}.\nType the database name "${target.name}" to continue: `)).trim();
    rl.close();
    if (answer !== target.name) {
      console.log("Cancelled — nothing was changed.");
      client.close();
      return;
    }
  }

  // ---- 3. Apply ----
  await client.execute(
    "CREATE TABLE IF NOT EXISTS _applied_migrations (name TEXT NOT NULL PRIMARY KEY, appliedAt TEXT NOT NULL)"
  );
  if (baseline) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO _applied_migrations (name, appliedAt) VALUES (?, ?)",
      args: [baseline, new Date().toISOString()],
    });
  }

  for (const folder of pending) {
    const path = join(migrationsDir, folder, "migration.sql");
    const sql = readFileSync(path, "utf8");
    const statements = splitStatements(sql);
    console.log(`\nApplying ${folder} (${statements.length} statements)...`);
    // migrate() runs the statements as one transaction: a migration either
    // applies completely or not at all.
    await client.migrate(statements);
    await client.execute({
      sql: "INSERT INTO _applied_migrations (name, appliedAt) VALUES (?, ?)",
      args: [folder, new Date().toISOString()],
    });
    console.log(`✓ Applied ${folder}`);
  }

  console.log(`\n✓ ${target.host} is up to date.`);
  client.close();
}

main().catch((error) => {
  console.error("\n✗ Failed to push schema to Turso —", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
