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
| `npm run create-account` | Interactive prompt to create or update a login account (email, name, password). Use this to set up your own login instead of the default seeded admin. |
| `npm run delete-account` | Lists existing accounts, then deletes the one you choose (requires typing its email to confirm). |

## Data

| Command | What it does |
|---|---|
| `npm run seed-test-data` | Adds 20 random test students, 6 subjects, and 3 weeks of sample scores — useful for trying out the app with realistic-looking data. |
| `npm run delete-all-students` | **Destructive.** Permanently deletes every student and every score entry (requires typing `DELETE` to confirm). Subjects and topics are kept. |
| `npm run renumber-students` | Reassigns every student's serial number based on when they were added (oldest = 001), fixing any serial numbers left over from before the numbering scheme changed. Safe to re-run any time. |

## Database (Turso)

The app stores data in a [Turso](https://turso.tech) database (libsql), not a local file — this is what makes it deployable on Vercel.

| Command | What it does |
|---|---|
| `npm run push-schema-to-turso` | Applies every migration under `prisma/migrations/` directly to the Turso database. Run this after adding a new migration folder — `prisma migrate` / `prisma db push` can't be used directly against Turso (its schema engine doesn't understand `libsql://` URLs), so this is the way schema changes reach the real database. |

To change the schema: edit `prisma/schema.prisma`, run `npx prisma migrate dev --create-only` to generate the migration SQL (it will fail to apply locally against Turso — that's expected, it just needs to write the file), then run `npm run push-schema-to-turso` to actually apply it.

## Notes

- Account and data commands read `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, and other settings from `.env` in the project root.
- Destructive commands (`delete-account`, `delete-all-students`) always ask for confirmation before changing anything — nothing is deleted silently.
- `DATABASE_AUTH_TOKEN` is a live secret — never commit it or paste it anywhere public. If it's ever exposed, rotate it from the Turso dashboard.
