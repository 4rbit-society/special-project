---
analyzed_commit: "4eb8074c66bda543df00e8522866bdbc0b2f853a"
analyzed_at: "2026-11-16"
---

# Current backend endpoint report

Source: the mounted Express routers, their handlers, validation schemas and default repositories in the current checkout. The commit metadata identifies the code examined; compare it with `git rev-parse HEAD` when checking whether this report needs review.

See the [frontend/SRS/backend cross-reference](ENDPOINT_CROSS_REFERENCE.md) for the complete comparison of requirements, implementations and actual connections.

There are **26 implemented HTTP method/path pairs** across nine route groups: **3 public** and **23 protected**. They cover the SRS's 25 listed endpoints plus the operational health endpoint. This is a source inspection, not a claim that all endpoints have been exercised against a live database or satisfy every SRS acceptance criterion.

## Request handling

- API paths begin with `/api`. The server defaults to port `3001` and validates any configured `PORT` as an integer from 1 to 65535.
- Public endpoints are GET `/api/health`, POST `/api/auth/register` and POST `/api/auth/login`.
- Protected endpoints require `Authorization: Bearer <JWT>`. Middleware verifies HS256 signature/expiry, reads the user ID from `sub`, then loads that user from the configured user repository. Missing users are rejected even if the token signature is valid.
- JWTs issued by login expire after eight hours. `JWT_SECRET` must contain at least 16 characters; server startup validates it. Current endpoints have no role-dependent permission differences.
- JSON parsing has a `100kb` limit. The CORS allowlist is `FRONTEND_ORIGIN`, default `http://localhost:5173`; requests without an Origin header are also allowed. Disallowed origins do not receive CORS approval; CORS is not a substitute for authentication and does not itself return a route-level `403`.
- Unknown routes return `404` with `{ "error": "Not found" }`. Framework-generated OPTIONS/preflight and implicit HEAD behavior are not counted as separate application endpoints here.

## Data stores in the default server

All protected routes authenticate against the MySQL user repository in the default app, including those whose feature data is in memory.

| Route group | Count | Feature data store | Survives API restart? |
| --- | --- | --- | --- |
| Health | 1 | MySQL connectivity probe (`SELECT 1`) | Not a stored resource. |
| Auth/profile | 4 | `MySqlUserRepository`, `users` table | Yes, user/profile changes. JWTs are signed tokens, not stored sessions. |
| Children | 5 | Module-level `mocks/data.ts` store | No. |
| Activities | 1 | Hardcoded predefined library in `mocks/data.ts` | Same predefined list is recreated; no activity mutation API. |
| Schedules | 4 | `mocks/data.ts` store | No. |
| Tasks | 4 | `mocks/data.ts` store | No, including completion status and timestamps. |
| Cards | 4 | `MySqlGroup5Repository`, SQL `children` and `picture_cards` | Yes. SQL child ownership is required. |
| Progress | 1 | Derived from the in-memory schedules/tasks | No retained history after restart. |
| Settings | 2 | `MySqlGroup5Repository`, `settings` table | Yes. |

`createApp(users, group5)` supports injected repositories for tests. A passing test using in-memory repositories does not establish that the default MySQL app's child/card records are integrated correctly.

## Endpoint inventory

Successful reads/updates return `200`, creation returns `201`, and deletes return `200` with `{ "success": true }`, unless stated otherwise. Every protected row can additionally return `401`; validation can return `400` and unexpected errors `500`.

### Health — 1 public endpoint

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 1 | GET | `/api/health` | No body/token. | `200`: `{ status: "ok", database: "connected", message, timestamp }`. Failed DB probe: `503`, `{ status: "error", database: "disconnected", message, timestamp }`. |

Health uses a different response shape from normal errors. It reports connection availability, not schema correctness or readiness of all feature stores. Normal server startup checks database connectivity before listening; the `503` response can occur after connectivity is lost while the server is running.

### Authentication and profile — 4 endpoints

| # | Method | Endpoint | Access | Request | Response / behavior |
| --- | --- | --- | --- | --- | --- |
| 2 | POST | `/api/auth/register` | Public | `{ name, email, password, role }` | `201`, `User`. Uses bcrypt with 12 rounds and stores the hash. Duplicate email: `409`, `Email is already registered`. No token is issued. |
| 3 | POST | `/api/auth/login` | Public | `{ email, password }` | `200`, `{ token, user: User }`. Unknown email/wrong password: generic `401`, `Invalid email or password`. |
| 4 | GET | `/api/auth/me` | Protected | No body. | `200`, authenticated `User`. |
| 5 | PATCH | `/api/auth/me` | Protected | `{ name }` | `200`, updated `User`. Strict input: email/role/password are not editable through this route. A missing update target returns `404`. |

`User = { id, name, email, role }`; password hashes are not returned. Roles are `caregiver`, `ot`, `sped_teacher`. Registration and login normalize email by trimming and lowercasing. Names are trimmed, 1–100 characters; emails are valid addresses up to 254 characters. Registration password is 8–72 characters; login password is 1–72 characters. These are string-length checks, not an explicit UTF-8 byte-length check.

Login compares a dummy hash for unknown emails. SQL seed users with `password_hash: null` cannot log in. There is no server-side logout, refresh, token revocation, password-reset or account-delete endpoint.

### Children — 5 protected endpoints

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 6 | GET | `/api/children` | No required query/body. | `200`, `Child[]`, filtered to the authenticated user. Empty list is `[]`. Caller-supplied owner query values do not change the owner. |
| 7 | POST | `/api/children` | `{ name, age, delay_domain, notes?, avatar? }` | `201`, `Child`; owner and ID are assigned by the server's in-memory store. |
| 8 | GET | `/api/children/:id` | Positive integer ID. | `200`, owned `Child`; missing/unowned: `404`, `Child not found`. |
| 9 | PUT | `/api/children/:id` | Nonempty partial set of create fields. | `200`, updated `Child`. Omitted fields remain unchanged; `notes: null` clears notes. Missing/unowned: `404`. |
| 10 | DELETE | `/api/children/:id` | Positive integer ID; no body. | `200`, success object. Removes the mock child plus its mock schedules/tasks. Missing/unowned: `404`. Does not delete SQL custom cards. |

Validation: trimmed name 1–100 characters; integer age 0–120; delay domain `speech`, `motor`, `cognitive`, `social`, `general`; optional nullable notes up to 2,000 characters. Avatar must be one of `🦊`, `🐼`, `🐰`, `🐻`, `🐱`, `🐶`; creation defaults to `🦊`. Child create/update use strict objects: caller-supplied `id`, `user_id`, timestamps or unknown fields are rejected.

The mock store starts with Mia/Leo belonging to user ID 1 and Ava to user ID 2, independently of SQL's real user/child records. Registration does not create these fixtures; SQL seed children are not read by these routes.

### Activities — 1 protected endpoint

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 11 | GET | `/api/activities` | No body. | `200`, `Activity[]`: the 12 predefined mock activities, each with `id`, `name`, `icon`, `category`. |

Categories are lowercase `hygiene`, `food`, `school`, `play`, `other`. The list includes Wake up, Brush teeth, Wash hands, Eat breakfast, Get dressed, Toilet, Go to school, Learning activity, Play, Bath, Get ready for bed and Eat lunch. There are no activity create/update/delete endpoints and no separate icon-catalog endpoint.

### Schedules — 4 protected endpoints

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 12 | GET | `/api/schedules?childId=:childId&date=YYYY-MM-DD` | Both query fields required. | `200`, `Schedule` with tasks ordered by position. Missing/unowned child: `404`, `Child not found`; owned child without a schedule that day: `404`, `Schedule not found`. |
| 13 | POST | `/api/schedules` | `{ childId, date, copyFrom? }` | `201`, created `Schedule`. Duplicate child/date: `409`. Missing copy source or missing/unowned child: `404`. Without copy source, tasks starts empty. |
| 14 | PUT | `/api/schedules/:id` | `{ date }` | `200`, updated `Schedule`. Changes the date only. Another schedule on the target child/date: `409`. Missing/unowned schedule: `404`. |
| 15 | DELETE | `/api/schedules/:id` | No body. | `200`, success object. Removes this mock schedule and all its tasks. Missing/unowned schedule: `404`. |

Dates must be real calendar dates in `YYYY-MM-DD` form. One schedule is allowed per child per date. Copying creates new task IDs, preserves task names/icons/order/timing and resets completion to pending with null `completed_at`. It does not replace an existing target schedule.

There is no GET `/api/schedules/:id` handler, schedule-range list, bulk task replacement or atomic draft-save endpoint. PUT `/api/schedules/:id` cannot save an array of tasks.

### Tasks — 4 protected endpoints

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 16 | POST | `/api/tasks` | Library: `{ scheduleId, activityId }`; custom alternative: `{ scheduleId, name, icon }`. | `201`, appended `Task`. Missing/unowned schedule: `404`; unknown activity or unsupported custom icon: `400`. New task is pending with null timing/completion. |
| 17 | PUT | `/api/tasks/:id` | Nonempty subset of `{ start_time, duration_min, position }`. | `200`, updated `Task`. Moves resequence positions. Invalid position beyond task count: `400`; missing/unowned task: `404`. |
| 18 | DELETE | `/api/tasks/:id` | No body. | `200`, success object. Remaining task positions are resequenced. Missing/unowned task: `404`. |
| 19 | PATCH | `/api/tasks/:id/complete` | `{ done: true }` or `{ done: false }`. | `200`, updated `Task`. True records status/time; false resets to pending and clears time. Repeated true preserves the existing completion timestamp. Missing/unowned task: `404`. |

Library and custom creation formats are mutually exclusive. Custom names are trimmed, 1–100 characters; custom icons must match `PREDEFINED_ICONS` in [the mock store](../apps/api/src/mocks/data.ts). A custom task has `activity_id: null`. No custom category is accepted/persisted.

`start_time` accepts `HH:MM` in 24-hour form or null. `duration_min` accepts integers 1–1440 or null. `position` is one-based and cannot exceed the schedule's current task count. Task updates do not change the name, icon or linked activity. There are no task GET routes; use the schedule response for reads.

### Picture cards — 4 protected endpoints

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 20 | GET | `/api/cards?childId=:childId` | Required positive `childId`; optional `includeHidden=true` or `false`, default false. | `200`, `{ Food: Card[], Emotions: Card[], Activities: Card[], Needs: Card[] }`. Checks SQL child ownership, includes shared defaults and that child's custom cards. Missing/unowned SQL child: `404`. |
| 21 | POST | `/api/cards` | `{ childId, label, category, icon }`. | `201`, created `Card`. Unsupported predefined icon: `400`; missing/unowned SQL child: `404`. |
| 22 | PATCH | `/api/cards/:id` | `{ hidden: boolean }`. | `200`, updated owned custom `Card`. Missing/unowned/shared-default card: `404`. Does not edit label/category/icon. |
| 23 | DELETE | `/api/cards/:id` | No body. | `200`, success object. Missing/unowned/shared-default card: `404`. |

Label is trimmed, 1–100 characters. Categories use title case: `Food`, `Emotions`, `Activities`, `Needs`. Icons use the predefined emoji allowlist, not SVG paths. Creation/visibility update use strict validation. Shared defaults have `child_id: null`; SQL listings always include shared defaults and optionally include hidden custom cards. Groups remain present even when empty.

Card SQL queries check ownership through the SQL `children` table; they do not use the child route's mock store. The same numeric child ID can therefore refer to different records in these two stores.

### Progress — 1 protected endpoint

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 24 | GET | `/api/progress/:childId?range=7d` | Positive child ID; range defaults to `7d`; other ranges rejected. | `200`, `{ child_id, range, today, last_7_days, recent_completions }`, derived from mock schedules/tasks. Missing/unowned mock child: `404`. |

The window is seven UTC calendar days including today, ordered oldest first. Each summary has `{ date, done, total, percentage }`, with rounded percentage or zero for no tasks. The response does not distinguish an empty schedule from no schedule.

Recent completions include task ID/name/icon, schedule date and completion timestamp, newest first. They only include completed tasks from schedules in that window whose completion timestamp lies between the window start and now. There is no configurable timezone/date, arbitrary date range, ranking or dashboard aggregate parameter/endpoint.

### Settings — 2 protected endpoints

| # | Method | Endpoint | Request | Response / behavior |
| --- | --- | --- | --- | --- |
| 25 | GET | `/api/settings` | No body. | `200`, `Settings`. Initializes a SQL settings row if none exists. |
| 26 | PUT | `/api/settings` | Complete `{ font_size, contrast, sound_on }` object. | `200`, saved `Settings`, via SQL upsert. Missing fields or unknown fields: `400`. |

Font size: `small`, `medium`, `large`. Contrast: `normal`, `high`. Sound: boolean. SQL defaults are `medium`, `normal`, `true`; these differ from the frontend demo defaults. There is no voice-speed or exit-PIN field. Profile name uses PATCH `/api/auth/me`, not settings.

## Returned resource fields

| Resource | Response fields |
| --- | --- |
| User | `id`, `name`, `email`, `role`. |
| Child | `id`, `user_id`, `name`, `age`, `delay_domain`, `notes`, `avatar`, `created_at`. |
| Activity | `id`, `name`, `icon`, `category`. |
| Schedule | `id`, `child_id`, `schedule_date`, `created_at`, ordered `tasks`. |
| Task | `id`, `schedule_id`, nullable `activity_id`, `name`, `icon`, nullable `start_time`, nullable `duration_min`, `position`, `status`, nullable `completed_at`. No category. |
| Card | `id`, nullable `child_id`, `category`, `label`, `icon`, `is_hidden`. |
| Settings | `font_size`, `contrast`, `sound_on`. |
| Progress day | `date`, `done`, `total`, `percentage`. |
| Recent completion | `task_id`, `name`, `icon`, `schedule_date`, `completed_at`. |

IDs are numeric. References in create/query inputs use camelCase (`childId`, `scheduleId`, `activityId`, `copyFrom`); resource fields generally use snake_case. Completion timestamps and mock creation timestamps are ISO strings. Optional task time is `HH:MM`; dates are `YYYY-MM-DD`.

## Error and validation behavior

| Status | Current use |
| --- | --- |
| 200 | Successful reads/updates/deletes; delete body is a success object. |
| 201 | Register, create child/schedule/task/card. |
| 400 | Schema validation, invalid JSON, oversized JSON body, unknown library activity, unsupported icon, out-of-range task position. |
| 401 | Missing bearer token; invalid/expired token; missing token user; invalid login credentials. |
| 404 | Missing/unowned resource; unknown route. Ownership failures generally use the same response as missing resources. |
| 409 | Duplicate registered email; duplicate schedule for child/date. |
| 500 | Unhandled failure; response hides internal details as `Internal server error`. |
| 503 | Health's database-unavailable response only. |

Normal errors use `{ "error": "message" }`; validation reports the first schema issue. `403` is supported by the error type but no examined route explicitly emits it. Not all schemas reject extra keys: child/card/settings/profile bodies are strict, while auth/schedule/task schemas use regular objects that strip unknown fields. An unrecognized field is not evidence it was persisted.

## Findings and limits

| Finding | Affected endpoints / implication |
| --- | --- |
| Feature persistence is incomplete. | Children, schedules, tasks and progress reset on process restart; the SQL schema existing does not mean these routes use it. |
| Child ownership has two independent sources. | Mock child CRUD/schedules and SQL cards can disagree about existence, ownership and IDs. Newly created mock children are not automatically SQL card parents. |
| Child delete is not a complete cross-store cascade. | DELETE `/api/children/:id` removes mock schedules/tasks, but does not delete the SQL child or its cards. SQL FK cascades do not run for a mock deletion. |
| Demo fixtures are bound to fixed user IDs. | IDs 1/2 in the real SQL user table are matched to independently seeded mock children; fixtures do not prove real user-created record ownership. |
| Plan saving is multiple independent mutations. | No atomic save, transaction-backed plan replacement or conflict/version contract; callers must handle partial writes. |
| API assets differ from frontend design identifiers. | API avatar animal emoji and icon allowlist do not accept frontend `happy`/`play`/`book`/`sun` avatar codes, `help` card code or SVG paths. |
| Date policy differs from local frontend today. | UTC progress can refer to a different day from the browser, including Asia/Manila before 08:00. |
| Current API does not provide all optional SRS contracts. | No task-completion rankings, photo uploads, voice-speed persistence, exit-PIN verification or editable email/role. These are not counted as implemented routes. |
| Frontend feature actions are not connected yet. | Existing UI data comes from local storage; route coverage alone does not establish end-to-end functionality. |

## Startup, configuration and verification scope

`server.ts` checks the JWT secret and validates the port, verifies the database connection, then listens. It closes the server/pool on SIGINT/SIGTERM. Database settings are `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; password must be defined but may be empty. The default pool uses a connection limit of 10. See [the environment template](../apps/api/.env.example).

Tests are discovered under `apps/api/tests/**/*.test.ts` by [vitest.config.ts](../apps/api/vitest.config.ts). The files under `src/routes/*.test.ts` are not included by that configuration. [createTestApp](../apps/api/src/testing/testApp.ts) injects in-memory user/card/settings repositories and authenticates through real login handlers; Group 1 tests separately exercise database/schema/seed plumbing.

Existing todo tests explicitly cover restart persistence, MySQL child/card cascade, browser speech/phrase behavior and responsive layout. They are not verified by an API inventory. This documentation pass inspects source, route completeness and report links; it does not rerun the full database suite or modify runtime behavior.

## Sources and related reports

- [App mounting](../apps/api/src/app.ts), [server startup](../apps/api/src/server.ts), [auth middleware](../apps/api/src/middleware/requireAuth.ts), [error handling](../apps/api/src/lib/errors.ts), [validation helper](../apps/api/src/lib/validate.ts).
- [Auth routes](../apps/api/src/routes/auth.ts), [children](../apps/api/src/routes/children.ts), [activities](../apps/api/src/routes/activities.ts), [schedules](../apps/api/src/routes/schedules.ts), [tasks](../apps/api/src/routes/tasks.ts).
- [Cards](../apps/api/src/routes/cards.ts), [progress](../apps/api/src/routes/progress.ts), [settings](../apps/api/src/routes/settings.ts), [health](../apps/api/src/routes/health.ts).
- [Shared schemas](../packages/shared/src/schemas.ts), [auth schemas](../apps/api/src/auth/schemas.ts), [mock resource store](../apps/api/src/mocks/data.ts), [SQL user repository](../apps/api/src/users/mysqlUserRepository.ts), [SQL cards/settings repository](../apps/api/src/group5/repository.ts), [SQL schema](../apps/api/schema.sql).
- [SRS endpoint report](SRS_ENDPOINTS.md), [frontend endpoint report](FRONTEND_ENDPOINTS.md), [detailed API contracts](FRONTEND_API_CONTRACTS.md), [integration handoff](FRONTEND_API_INTEGRATION.md).
