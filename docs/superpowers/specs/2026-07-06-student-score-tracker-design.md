# Student Score Tracker — Design Spec

Status: Draft for review
Date: 2026-07-06
Source material: handwritten notebook plan (Student → Subject → Topic → Score hierarchy) + 5 reference UI screenshots + interactive design session (visual companion)

## 1. Overview & Goals

A single-admin web app for recording and tracking student academic scores over time. Core value: turn raw per-topic test scores into visible **trends** — is this student improving, staying consistent, or slipping — without any of the HR/billing/attendance overhead found in the reference screenshots (this is deliberately *not* a full school-management system).

Explicit non-goals (cut during scoping): class/grade grouping, guardian/family module, student status lifecycle (active/terminated), fee/payment tracking, multi-role permissions, attendance. All of that infrastructure exists in the reference apps but was consciously excluded to keep this a lean, single-purpose tracker. If any of it becomes needed later, it can be layered on without restructuring the core Student → Subject → Topic → Score model.

## 2. Users & Auth

- **Single admin user.** No multi-user roles, no public sign-up flow.
- The admin account is created via a one-time seed script (`prisma/seed.ts`), reading `ADMIN_EMAIL` / `ADMIN_PASSWORD` from environment variables and writing a bcrypt hash to the `User` table.
- **Login:** email + password form at `/login`.
- **Session:** signed, `httpOnly`, `Secure` (in prod) cookie containing a JWT (via `jose`), verified in `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`; see §7.1). No third-party auth library (Auth.js/NextAuth) — a single-user credential flow doesn't need one, and a custom ~150-line implementation is easier to fully understand and audit than configuring a multi-provider library for a feature we don't use.
- **Settings → Account:** change password (re-hash + invalidate existing session by rotating a `sessionVersion` field on `User`), and the light/dark theme toggle.
- All routes except `/login` and static assets require a valid session; unauthenticated requests are redirected to `/login?next=<path>`.
- No "forgot password" / email-reset flow in v1 — there's no transactional email service in this stack, and with a single admin, a lost password is recovered by re-running the seed script with a new `ADMIN_PASSWORD`.

## 3. Data Model

Prisma schema, SQLite provider for now. **ID strategy:** all models use `String @id @default(cuid())` (not autoincrement integers) specifically because the user plans to migrate to MongoDB later — cuid strings map directly to how Mongo-backed models are typically keyed, whereas autoincrement ints don't survive that migration cleanly. Relations are kept simple (direct foreign-key fields, no implicit many-to-many join tables) since Mongo's connector handles explicit reference fields far better than relational join tables.

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  name           String
  sessionVersion Int      @default(0)
  createdAt      DateTime @default(now())
}

model Student {
  id           String   @id @default(cuid())
  serialNumber String   @unique   // e.g. "AD001" — see §3.1
  firstName    String
  lastName     String
  createdAt    DateTime @default(now())
  scores       ScoreEntry[]
}

model Subject {
  id        String   @id @default(cuid())
  name      String   @unique      // e.g. "Mathematics"
  createdAt DateTime @default(now())
  topics    Topic[]
}

model Topic {
  id              String   @id @default(cuid())
  subjectId       String
  subject         Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  name            String              // e.g. "Fractions"
  defaultMaxScore Int      @default(100)
  createdAt       DateTime @default(now())
  scores          ScoreEntry[]

  @@unique([subjectId, name])
}

model ScoreEntry {
  id         String   @id @default(cuid())
  studentId  String
  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  topicId    String
  topic      Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  value      Float               // points earned
  maxScore   Int                 // snapshot of the topic's max at entry time (a later change to
                                  // Topic.defaultMaxScore must not rewrite historical percentages)
  note       String?             // optional free-text, e.g. "Week 3 quiz"
  recordedAt DateTime            // the date the test/score applies to (admin-set, defaults to today)
  createdAt  DateTime @default(now())

  @@index([studentId, topicId, recordedAt])
}
```

### 3.1 Serial number generation

On student creation: take the uppercase first letter of `firstName` + first letter of `lastName`, then append a zero-padded sequence number scoped to that initials pair (`AD001`, `AD002`, ...). Computed server-side in the create action — never user-editable, displayed as a read-only badge next to the student's name everywhere they appear.

## 4. Score Semantics

All formulas are intentionally simple — no weighting, no ML, easy to explain to a non-technical user reading their own dashboard.

- **Percentage** for any `ScoreEntry` = `value / maxScore * 100`.
- **Delta / improvement** for a topic = latest entry's percentage minus the immediately preceding entry's percentage (same topic, same student), shown with an up/down arrow and green/red color. No prior entry → shown as "First score", neutral.
- **Consistency** (per student, per subject or overall) = computed over the last **5** entries (or fewer if not available): `consistency = clamp(100 - stddev(percentages), 0, 100)`. Displayed as a badge: **High** (≥85), **Medium** (60–84), **Low** (<60), and only shown once ≥2 entries exist.
- **Top performers** (dashboard) = students ranked by the average percentage across *all* their score entries, descending, top 5.
- **Most improved** (dashboard) = students ranked by the average of (latest − previous) percentage delta across all their topics that have ≥2 entries, restricted to entries recorded in the **last 30 days**, descending, top 5. Students with no qualifying deltas are excluded (not shown as "0 improvement").

## 5. Information Architecture

Left sidebar shell, persistent across all authenticated pages (confirmed via visual comparison — see §6.1). Sections:

1. **Dashboard** (`/dashboard`) — landing page after login.
   - Stat tiles: Total Students, Total Subjects, Total Topics, Total Score Entries (bold color-block style, §6.2).
   - Score trend chart: average percentage per week across all entries, last 12 weeks.
   - Two ranked lists side by side: Top Performers / Most Improved (top 5 each, per §4).
   - Recent score entries feed: last 10 `ScoreEntry` rows (student, topic, score, date), newest first.

2. **Students** (`/students`) — table: serial number, name, subjects touched (distinct subject names from their scores), overall average %, last recorded date. Search by name/serial. "Add Student" opens a drawer (first/last name only — serial number auto-generated on submit). Row click → student detail. "Export CSV" downloads the current filtered view.

3. **Student detail** (`/students/[id]`) — header (name, serial number, created date, overall average, consistency badge). Below: one card per subject the student has scores in, each listing its topics with a sparkline of score history, latest %, delta arrow, and an "Add score" button (opens a small form: choose Subject → choose an existing Topic under it, or type a new topic name inline which creates it in the catalog with a max-score field shown at that point — then value, date, optional note). Score entries are individually editable/deletable inline (edit opens the same small form pre-filled; delete asks for confirmation since it's destructive history loss).

4. **Subjects** (`/subjects`) — manage the global catalog. List of subjects, each expandable to show/add/edit/delete its topics (name + default max score). Deleting a subject or topic cascades to its score entries — this is a destructive action and requires a confirmation dialog naming how many score entries will be lost.

5. **Settings** (`/settings`) — admin name/email (read-only for now, no self-service email change in v1), change password form, theme toggle (light/dark).

Global chrome: sidebar (logo, nav items with active-state highlight, collapsible on mobile into a bottom sheet or hamburger), top bar within content area (page title/breadcrumb, theme toggle, profile menu with Logout). No notification bell/badge — that pattern from the references implied multi-user activity, which doesn't apply to a single admin.

## 6. Design System

### 6.1 Navigation shell
Left sidebar (validated over a top pill-nav and an icon-rail hybrid via side-by-side mockups). Structurally close to the reference "E.M.S.T" and swimming-academy screenshots: fixed-width sidebar with logo mark, nav list, collapses to an overlay/bottom sheet under the `md` breakpoint.

### 6.2 Cards & color
- **Stat cards:** solid, bold, saturated color blocks (one flat color per metric tile) — validated over pastel-gradient and minimal-white-card alternatives.
- **Primary accent / brand color:** Growth Green — chosen explicitly for its thematic tie to "tracking improvement" over Scholarly Blue, Violet→Pink, and Navy+Gold alternatives. Used for: active nav item, primary buttons/links, the primary chart series, positive deltas.
- Dashboard stat tiles use a small curated 4-color rotation (green, blue, amber, rose) for scannability between tiles, with green as the dominant/first tile to keep the brand tie-in — not a monochrome wall of green.
- Negative deltas and destructive actions (delete) use a consistent rose/red, independent of the tile rotation.

### 6.3 Theme
Light and dark mode both fully supported, toggle in Settings (and optionally a quick-toggle in the top bar). Respect `prefers-color-scheme` on first load, persist the explicit choice after that.

### 6.4 Typography, spacing, motion
Governed by the **impeccable** skill at implementation time for concrete type scale, spacing rhythm, elevation, and accessibility (contrast, focus states) — not fully specified here to avoid the spec drifting out of sync with the actual implementation. Directional intent: calm, editorial, generous whitespace, restrained shadows (closer to the VividMind reference's quiet feel than the busier admin-template screenshots), even though the stat-card *color* treatment ended up bolder than VividMind's.

Motion is governed by the **emil-design-eng** skill's philosophy at implementation time: purposeful, fast (never decorative-for-its-own-sake), consistent easing. Concretely expected in this app: stat tiles count up on mount, the trend chart draws in rather than popping in, list/table rows stagger in lightly on first load, add/edit drawers slide in with a scrim fade, score entries added via the "Add score" form appear optimistically (via `useOptimistic`) before the server confirms, and destructive actions get a deliberate (not instant) confirm affordance.

## 7. Technical Architecture

- **Framework:** Next.js 16.2.10, App Router, React 19, Tailwind CSS v4 (already scaffolded).
- **Data layer:** Prisma ORM against SQLite (`prisma/dev.db`) now. All reads/writes go through a thin repository module (`lib/data/students.ts`, `subjects.ts`, `scores.ts`) rather than calling `prisma.*` directly from routes/actions — isolates the eventual swap to MongoDB (Prisma's Mongo connector or Mongoose) to those files, per the user's stated plan to migrate later.
- **Validation:** Zod schemas colocated with each server action, parsed before touching the data layer.
- **Mutations:** Next.js Server Actions (`"use server"`), not client-side fetch to route handlers — matches App Router convention and gives progressive-enhancement-friendly forms for free.
- **Auth enforcement:** `proxy.ts` at the project root (Next 16 renamed `middleware.ts` → `proxy.ts`; the old file/export name is deprecated and the new one defaults to the Node.js runtime rather than Edge — relevant since we use `bcrypt`/Node crypto APIs that don't run on Edge anyway). Reads/verifies the session cookie and redirects unauthenticated requests to `/login`.
- **`cookies()` / `headers()` are async** as of this Next version — every server action and server component that reads the session cookie must `await cookies()`.
- **Caching:** this project does *not* enable `cacheComponents` in `next.config.ts`, so the legacy fetch/route-segment caching model applies. Since almost all data here is per-request, dynamic, admin-only reads (no public cacheable pages), this default is fine as-is — no caching config needed for v1.
- **Charts:** hand-rolled lightweight SVG components (not a chart library dependency) so the draw-in/hover motion can be built exactly to the emil-design-eng principles above, animated with `motion` (Framer Motion).
- **CSV export:** a server action that streams a CSV (`Content-Disposition: attachment`) built from the same filtered query used by the table — no extra library needed for a flat CSV.
- **PWA:** `app/manifest.ts` (Next's typed manifest file convention) with icons + theme color, plus a minimal service worker that caches the app shell (JS/CSS/icons) for fast repeat loads and an offline fallback page. No offline data sync — all student/score data requires a live connection to the database regardless.

## 8. Out of Scope (v1)

Class/grade grouping, guardian/family records, student status lifecycle, multi-user roles/permissions, printable PDF report cards (CSV only for now), notifications, attendance, fees/payments, public self-registration.

## 9. Assumptions Worth Flagging

- The seed-script approach to creating the single admin account means there's no in-app "create first admin" onboarding screen — the user will need to run the seed script (with env vars set) once before first login. This will be called out again in the implementation plan.
- "Recent score entries feed" and "Top performers / Most improved" are dashboard-only read views computed on the fly from `ScoreEntry` — no caching/materialized aggregates for v1, since data volume for a single-admin tracker is expected to stay small enough that live computation is cheap.
