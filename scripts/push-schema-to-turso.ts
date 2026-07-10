import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

// Prisma's schema engine can't connect to libsql:// URLs directly (it only
// understands standard connection string schemes), so `prisma migrate` /
// `prisma db push` don't work against Turso. Instead, this applies each
// existing migration.sql file straight to Turso via the libsql client —
// the same SQL Prisma already generated, just executed a different way.
// Re-run this after adding a new migration folder to keep Turso in sync.

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

  for (const folder of folders) {
    const path = join(migrationsDir, folder, "migration.sql");
    const sql = readFileSync(path, "utf8");
    const statements = splitStatements(sql);
    console.log(`Applying ${folder} (${statements.length} statements)...`);
    await client.migrate(statements);
    console.log(`✓ Applied ${folder}`);
  }

  console.log("\n✓ Turso database is up to date.");
  client.close();
}

main().catch((error) => {
  console.error("\n✗ Failed to push schema to Turso —", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
