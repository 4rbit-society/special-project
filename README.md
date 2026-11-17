# Araw · Visual schedules and picture cards

An npm workspace with React + Vite, Express, and a shared types package. Requires Node.js 22.12+ and npm.

## Frontend preview

The responsive frontend follows the [Araw Figma design](https://www.figma.com/design/LIUnykdWEJ139auGBKjTUs/SRS-v2?node-id=26-3). It includes the staff dashboard, child profiles, schedule editor, task status, progress, settings, picture card management, and the child schedule and communication board. Figma SVG assets and Nunito fonts are bundled locally.

Start the frontend development server:

```sh
npm ci
npm run dev -w @starter/web
```

Open http://localhost:5173. On PowerShell systems that block `npm.ps1`, use `npm.cmd` instead of `npm`.

The screens now use the authenticated backend for profiles, schedules/tasks, cards, progress and settings. Start MySQL and the API using the setup below before logging in. Register a real account; the old frontend demo data is not imported. Tokens are stored in session storage by default or local storage when Remember me is selected; logout clears the current session and discards cached user data, while preserving a newer account session in another tab. Expired sessions return to login. The communication board uses browser speech synthesis when available. Schedule/progress calendar dates use the browser's local day; completion timestamps are stored in UTC.

Verify the frontend with `npm run typecheck -w @starter/web` and `npm run build -w @starter/web`.

Frontend API handoff: [endpoint inventory](docs/FRONTEND_ENDPOINTS.md), [request and response contracts](docs/FRONTEND_API_CONTRACTS.md), and [integration gaps](docs/FRONTEND_API_INTEGRATION.md).

SRS API review: [all endpoints and requirement mappings](docs/SRS_ENDPOINTS.md).

Backend API review: [implemented endpoints, contracts and storage limits](docs/BACKEND_ENDPOINTS.md).

Combined API review: [frontend/SRS/backend endpoint cross-reference, connections and gaps](docs/ENDPOINT_CROSS_REFERENCE.md).

```text
apps/
  api/
    src/
      db/pool.ts          # MySQL pool and connectivity checks
      lib/errors.ts       # Async routes and API errors
      lib/validate.ts     # Request validation helpers
      routes/health.ts    # GET /api/health
      app.ts              # Express application and CORS
      server.ts           # Environment, listener, shutdown
    scripts/
      schema.ts          # Apply schema.sql
      seed.ts            # Seed library and demo schedules
    schema.sql
    .env.example
    tsconfig.json
  web/
    src/
      lib/client.ts     # Authenticated API client and public errors
      lib/adapters.ts   # API/UI field and ID conversion
      App.tsx
      main.tsx
      styles.css
    .env.example
    index.html
    vite.config.ts
    tsconfig.json
packages/
  shared/
    src/index.ts        # Shared API contracts
    src/schemas.ts      # Shared Zod schemas
    tsconfig.json
package.json
tsconfig.base.json
```

## Run everything in Docker

Start Docker Desktop with Linux containers. Copy the root `.env.example` to `.env`
and replace `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `JWT_SECRET` with distinct
random values (use at least 32 characters for the JWT secret). This Compose
configuration is independent of `apps/api/.env`.

```sh
docker compose up -d --build --wait
```

Open http://localhost:5173 and register an account. The frontend runs in Nginx,
the backend runs in Node.js, and MySQL runs in its own container. The backend
applies the schema and runs the existing idempotent seed before listening.
The seeded demo caregiver has no login password; use your registered account.

The API is available at http://localhost:3001/api/health and through the frontend
at http://localhost:5173/api/health. MySQL is available at `127.0.0.1:3306` using
the root `.env` database name, username, and password. All published ports bind
to the local machine. Change `WEB_PORT`, `API_PORT`, or `DB_PUBLISHED_PORT` in
the root `.env` if a port is already in use.

```sh
docker compose ps                 # View all three services and their health
docker compose logs -f            # Follow service logs
docker compose down               # Stop containers; keep database data
docker compose up -d --build --wait # Rebuild and restart after code changes
```

MySQL data persists in the `araw_mysql_data` Docker volume. Keep the root `.env`
for subsequent starts: changing its MySQL credentials does not change users in
an existing database volume. `docker compose down -v` deletes that database.
Source files and secrets are excluded from the frontend image; application
`.env` files are excluded from the build context.

## Run locally

Start MySQL and create the `special_project` database. Copy `apps/api/.env.example` to
`apps/api/.env`, then set your MySQL credentials and the frontend origin:

```sh
npm install
npm run db:schema
npm run db:seed
npm run dev
```

Open http://localhost:5173. The API listens on http://localhost:3001 and verifies its
database connection before starting. Vite proxies `/api` requests to the backend.
Copy `apps/web/.env.example` to `apps/web/.env` only if you need to customize the frontend.
On PowerShell systems that block npm.ps1, use `npm.cmd` instead of `npm`.
The seed-only demo caregiver has no login password; create a normal account to use the API.

## Commands

- `npm run dev`: run both apps with automatic reload.
- `npm run typecheck`: check every workspace.
- `npm run build`: compile shared schemas and the API, then build the frontend.
- `npm run db:schema`: create the database tables (the database itself must already exist).
- `npm run db:seed`: add the activity library, default cards, and demo schedules.
- `npm test -w @starter/api`: run isolated API unit tests without using application database credentials.
- `npm run test:database -w @starter/api`: run database, schema, seed, and user repository tests against a dedicated `*_test` database.
- `npm test -w @starter/web`: run frontend API-client and adapter tests.
- `npm run test:e2e -w @starter/web`: run connected browser tests against a dedicated empty MySQL test database (see below).
- `npm start`: run the compiled API after building.
- `npm run preview -w @starter/web`: preview the frontend build locally (no development API proxy).

Rerunning the seed adds missing sample records without overwriting existing task edits or completion state.

`GET /api/health` returns `200` with `{ status: "ok", database: "connected", message, timestamp }` when MySQL is reachable. It returns `503` with `{ status: "error", database: "disconnected", error: "Database unavailable.", timestamp }` when unavailable. Database details are logged server-side and omitted from the public failure body.

API failures expose an `error` string. Malformed JSON, malformed route parameter encoding, unsupported JSON charsets, and oversized request bodies return `400`; unexpected server failures retain a generic `500` response.

## Extend the template

### Child profiles, activities, schedules and tasks

The API persists child, activity, schedule and task data in MySQL. Progress reads those same records. Child, schedule and task queries are scoped to the authenticated user's ID, and deleting a child relies on the schema's foreign-key cascades. Requests use the real JWT middleware. API unit tests use the in-memory mock store only when running under Vitest without database configuration. Task completion timestamps are stored and returned in UTC; the browser passes its local calendar date to progress (API clients that omit `date` retain the UTC default). Schedule creation and task copying commit together. See [the backend plan](docs/BACKEND_TASKS.md).

| Method and path | Response |
| --- | --- |
| `GET /api/children` | `200`, array of the caller's children (empty array if none) |
| `POST /api/children` | `201`, created child |
| `GET /api/children/:id` | `200`, owned child |
| `PUT /api/children/:id` | `200`, updated child; accepts a nonempty partial update |
| `DELETE /api/children/:id` | `200`, `{ "success": true }`; removes the child's schedules and tasks through database cascades |
| `GET /api/activities` | `200`, array of shared activities with `id`, `name`, `icon`, `category` |

All child and activity endpoints require a valid JWT. Missing/invalid tokens return `401`; invalid input returns `400`; missing or another user's child returns the same `404`. Errors use `{ "error": "message" }`. Ownership comes from authentication; client-supplied ids, ownership and timestamps are rejected in child bodies. Deletion confirmation belongs in the frontend.

Example create body:

```json
{ "name": "Sam", "age": 5, "delay_domain": "speech", "notes": "Likes music", "avatar": "🐼" }
```

The current validation choices are: trimmed name (1–100 characters), integer age (0–120), delay domain (`speech`, `motor`, `cognitive`, `social`, `general`), optional notes (up to 2,000 characters, or `null` to clear), and an optional avatar (`🦊`, `🐼`, `🐰`, `🐻`, `🐱`, `🐶`; defaults to `🦊` on create). A partial update preserves omitted fields. Shared TypeScript contracts are in [the shared package](packages/shared/src/index.ts); runtime schemas live in [the shared schemas](packages/shared/src/schemas.ts).

Run isolated API unit tests with `npm test -w @starter/api`. Run database schema, seed, connection, and user-repository tests with `npm run test:database -w @starter/api`. Configure `DB_TEST_HOST`, `DB_TEST_PORT`, `DB_TEST_USER`, `DB_TEST_PASSWORD`, and `DB_TEST_NAME` in `apps/api/.env.test` or the shell. Explicit `DB_*` environment variables are also supported for this database-only command. The selected database name must end in `_test`; these tests reset its tables. Unit tests ignore database credentials and never load the normal application `.env`.

For MySQL-backed ownership, persistence, activity-library, progress and child-cascade coverage, configure `DB_TEST_HOST`, `DB_TEST_PORT`, `DB_TEST_USER`, `DB_TEST_PASSWORD`, and `DB_TEST_NAME` (a dedicated, empty database whose name ends in `_test`), then run `npm run test:integration -w @starter/api`. This command builds and launches the compiled API, checks persistence across a process restart, and checks that a failed schedule copy rolls back. The integration suite applies the schema without dropping tables and deletes only its own fixtures. Missing configuration fails the command. CI runs this suite before the database-resetting tests.

For local integration testing, put those `DB_TEST_*` values in `apps/api/.env.test` (this file is git-ignored). Explicit environment variables take precedence over that file. Create the database first; the test account needs privileges only on that database and the database must not contain any users. Do not copy production credentials or seed production data into the test database.

### Cards, settings, and profile

- `GET /api/cards?childId=` returns shared defaults and the child's custom cards grouped by category. Hidden cards are excluded unless `includeHidden=true`.
- `POST /api/cards` accepts `{ "childId": 1, "label": "Break", "category": "Activities", "icon": "⭐" }`.
- `PATCH /api/cards/:id` accepts `{ "hidden": true }`; `DELETE /api/cards/:id` deletes an owned custom card.
- `GET /api/settings` returns defaults or the authenticated user's settings; `PUT /api/settings` updates them.
- `GET /api/auth/me` returns the current profile; `PATCH /api/auth/me` updates only its name.

Custom cards and settings use parameterized MySQL access. The card schema includes an `is_hidden` flag; re-run `npm run db:schema` after updating an existing local database. Unit tests inject in-memory repositories; the dedicated integration test covers MySQL route persistence.

### Adding features

Add API routes under `apps/api/src/routes`, UI components under `apps/web/src/components`, and shared contracts and Zod schemas under `packages/shared/src`. Use shared schemas at API boundaries to validate user input.

### Connected workflows and browser tests

All 26 existing API method/path combinations are used by frontend workflows. `PUT /api/schedules` adds an atomic editor save: new schedule creation, task additions/removals, ordering and timing commit together. The client submits the loaded task ID order as `expectedTaskIds`; changes to task membership/order return 409 rather than overwriting another editor. Existing task completion is preserved. See [the endpoint cross-reference](docs/ENDPOINT_CROSS_REFERENCE.md) for every call site.

Schedule drafts stay in memory until the server confirms a save. Preview is read-only and keeps the editor draft/date. Task status provides immediate add, move, remove, complete and undo operations. Schedule date changes and deletion are explicit saved-data actions. Card administration exposes hide/show/delete for owned custom cards; shared defaults cannot be changed.

Browser tests require `DB_TEST_HOST`, `DB_TEST_PORT`, `DB_TEST_USER`, `DB_TEST_PASSWORD`, and `DB_TEST_NAME` ending in `_test`. Use a dedicated database without users, distinct from normal application/test-suite data. Explicit environment variables override `apps/api/.env.test`. The runner refuses existing users, applies schema/seeds, starts the compiled API on 13001 and Vite on 15173, and cleans up only that run's users and its seed caregiver. It can create a missing test database if the account has permission; otherwise create it first. Never supply a production database.

```sh
npx playwright install chromium
npm run test:e2e -w @starter/web
```

Set `E2E_BROWSER_CHANNEL=chrome` to use an installed Chrome instead. CI installs Chromium and runs both client unit tests and connected browser tests. Coverage includes all 27 method/path combinations, save failure recovery, expired-session handling, reload persistence, a 390px mobile flow, and account isolation. This does not certify every browser, speech voice, or accessibility/performance target.

## Deployment

### Containers (MySQL + API + web)

See [Run everything in Docker](#run-everything-in-docker) above for the supported Compose setup.

### Manual deployment

Serve `apps/web/dist` using a static host and run the API with `npm start`. Configure a reverse proxy to forward `/api` to the backend on the same origin. For separate origins, set `VITE_API_BASE_URL` before building the frontend and configure explicit CORS permissions on the API. Vite environment variables are public build-time values; keep secrets in the backend environment.

## MVP scope decisions

- Implemented optional SRS items: task countdown timer and timer-end sound (`FR-TASK-06/07`), TTS voice speed (`FR-COMM-08`), and most/least-completed activity analytics (`FR-PROG-04`).
- Custom photo upload (`FR-COMM-09`) remains out of MVP; cards use the predefined icon set. Advanced analytics/export and role-specific permissions remain out of scope per SRS §3.
- Supported databases: MySQL 8.0 and MariaDB 11.x. Shared locking uses `LOCK IN SHARE MODE`, which both accept.

See [the polish and debugging review](docs/POLISH_REVIEW.md) for the reproduced bugs, fixes, and validation limits.
