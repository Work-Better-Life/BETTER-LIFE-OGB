import { defineConfig } from "prisma/config";

// Prisma's schema engine can't connect directly to a libsql:// (Turso) URL —
// it only recognizes standard connection string schemes. So `prisma migrate
// dev` / `db push` here target a local, throwaway SQLite file purely to
// compute schema diffs and generate migration SQL. The app itself never reads
// this file at runtime — it connects to Turso via lib/db.ts using
// DATABASE_URL from .env. After generating a migration, run
// `npm run push-schema-to-turso` to apply it to the real (Turso) database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "file:./prisma/migrate-shadow.db",
  },
  migrations: {
    seed: "npx tsx --env-file=.env prisma/seed.ts",
  },
});
