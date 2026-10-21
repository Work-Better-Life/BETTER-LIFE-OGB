import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

// Prisma's schema engine can't connect to libsql:// URLs directly (it only
// understands standard connection string schemes), so `prisma migrate` /
// `prisma db push` don't work against Turso. Instead, this applies each
// existing migration.sql file straight to Turso via the libsql client —
// the same SQL Prisma already generated, just executed a different way.
// Re-run this after adding a new migration folder to keep Turso in sync.
// Applied migrations are recorded in an _applied_migrations table so each
// one only ever runs once.

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

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL must be set.");

  const client = createClient({ url, authToken });

  const migrationsDir = join(__dirname, "..", "prisma", "migrations");
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  await client.execute(
    "CREATE TABLE IF NOT EXISTS _applied_migrations (name TEXT NOT NULL PRIMARY KEY, appliedAt TEXT NOT NULL)"
  );
  const tracked = await client.execute("SELECT name FROM _applied_migrations");
  const applied = new Set(tracked.rows.map((row) => String(row.name)));

  // Databases pushed before tracking existed already have the initial
  // migration's tables — record it as applied instead of re-running it.
  if (applied.size === 0 && folders.length > 0) {
    const existing = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'");
    if (existing.rows.length > 0) {
      await client.execute({
        sql: "INSERT INTO _applied_migrations (name, appliedAt) VALUES (?, ?)",
        args: [folders[0], new Date().toISOString()],
      });
      applied.add(folders[0]);
    }
  }

  for (const folder of folders) {
    if (applied.has(folder)) continue;
    const path = join(migrationsDir, folder, "migration.sql");
    const sql = readFileSync(path, "utf8");
    const statements = splitStatements(sql);
    console.log(`Applying ${folder} (${statements.length} statements)...`);
    await client.migrate(statements);
    await client.execute({
      sql: "INSERT INTO _applied_migrations (name, appliedAt) VALUES (?, ?)",
      args: [folder, new Date().toISOString()],
    });
    console.log(`✓ Applied ${folder}`);
  }

  console.log("\n✓ Turso database is up to date.");
  client.close();
}

main().catch((error) => {
  console.error("\n✗ Failed to push schema to Turso —", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
