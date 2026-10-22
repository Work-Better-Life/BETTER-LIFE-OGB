# Commands

Run any of these from the project root with `npm run <command>`.

## App

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app locally at http://localhost:3000 for development. |
| `npm run build` | Builds the app for production. |
| `npm run start` | Runs the production build (run `build` first). |
| `npm run lint` | Checks the code for lint errors. |

## Accounts

| Command | What it does |
|---|---|
| `npm run create-account` | Interactive prompt to create or update a login account (email, name, role, password). Role is `admin` (can edit) or `viewer` (read-only: can see everything, can't change anything). Leaving the role blank keeps an existing account's role. |
| `npm run delete-account` | Lists existing accounts, then deletes the one you choose (requires typing its email to confirm). |

## Data

| Command | What it does |
|---|---|
| `npm run import-students -- <file> [--dry-run] [--date-order dmy\|mdy] [--cohort "2026"]` | Imports students and their profiles from a registration spreadsheet (`.xlsx`, `.xls`, `.ods` or `.csv`). All-or-nothing: every problem is listed and nothing is saved unless the whole file is clean. `--dry-run` only checks. `--cohort` puts every new student in that cohort (created if needed). Students already in the app (same name and date of birth) are left alone. Undo a batch from Students → Import → Recent imports. |
| `npm run seed-test-data` | Adds 20 random test students, 6 subjects, and 3 weeks of sample scores — useful for trying out the app with realistic-looking data. |
| `npm run check-photo-files [-- --delete]` | Compares profile photos stored in UploadThing with the database. Reports files no student points to (orphans) and student photos whose file is missing. With `--delete` it removes the orphans. Only touches files named `photo.jpg` and skips anything uploaded in the last 10 minutes. |
| `npm run find-invalid-scores` | Read-only. Lists any score above its max score (these show as over 100% and stretch the charts). Fix them from the student's page, then re-run to confirm none are left. |
| `npm run delete-all-students` | **Destructive.** Permanently deletes every student and every score entry (requires typing `DELETE` to confirm). Subjects and topics are kept. |
| `npm run renumber-students` | Reassigns every student's serial number based on when they were added (oldest = 001), fixing any serial numbers left over from before the numbering scheme changed. Safe to re-run any time. |

## Database (Turso)

The app stores data in a [Turso](https://turso.tech) database (libsql), not a local file — this is what makes it deployable on Vercel.

| Command | What it does |
|---|---|
| `npm run push-schema-to-turso` | Applies every pending migration under `prisma/migrations/` directly to the Turso database. Run this after adding a new migration folder — `prisma migrate` / `prisma db push` can't be used directly against Turso (its schema engine doesn't understand `libsql://` URLs), so this is the way schema changes reach the real database. It first looks at the database read-only, prints which database it will change and which migrations are pending, then makes you type the database name before changing anything. Options go after `--`: `--dry-run` only looks and changes nothing; `--yes` skips the typed confirmation (for scripts). It refuses to run if an untracked database has tables the first migration doesn't create. |

To change the schema: edit `prisma/schema.prisma`, run `npx prisma migrate dev --create-only` to generate the migration SQL (it will fail to apply locally against Turso — that's expected, it just needs to write the file), then run `npm run push-schema-to-turso` to actually apply it.

**Production:** keep the production `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in a separate, git-ignored file such as `.env.prod`, take a backup first (a Turso branch of the database), and run the script against it with `npx tsx --env-file=.env.prod scripts/push-schema-to-turso.ts --dry-run` to see what it would do. Run it again without `--dry-run` to apply, and once more with `--dry-run` to confirm `Pending: none`. Apply migrations **before** deploying the code that needs them.

## Notes

- Account and data commands read `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, and other settings from `.env` in the project root.
- Destructive commands (`delete-account`, `delete-all-students`) always ask for confirmation before changing anything — nothing is deleted silently.
- `DATABASE_AUTH_TOKEN` is a live secret — never commit it or paste it anywhere public. If it's ever exposed, rotate it from the Turso dashboard.
