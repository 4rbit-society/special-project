---
analyzed_commit: "4eb8074c66bda543df00e8522866bdbc0b2f853a"
analyzed_at: "2026-11-16"
---

# Frontend API request and response contracts

Reviewed: 16 November 2026. These are the existing backend contracts, not proposed replacements. See [the endpoint inventory](FRONTEND_ENDPOINTS.md) for which screen needs each endpoint and [integration gaps](FRONTEND_API_INTEGRATION.md) for unsupported frontend behavior.

## Common conventions

For route coverage and connection status across the reports, see the [endpoint cross-reference](ENDPOINT_CROSS_REFERENCE.md).

- Paths are under `/api`. Use the configured API base from `VITE_API_BASE_URL`, or the same origin when unset; Vite's proxy handles development routing.
- Send `Content-Type: application/json` for JSON bodies. All routes except `/auth/register`, `/auth/login` and `/health` require `Authorization: Bearer <token>`.
- IDs are positive integers assigned by the server. Demo IDs and browser UUIDs are not API IDs.
- Calendar dates use `YYYY-MM-DD`. Task start times use zero-padded `HH:MM`, not a timestamp; optional time/duration values use `null`.
- Responses generally use snake_case for resource fields. Creation references use camelCase (`childId`, `scheduleId`, `activityId`, `copyFrom`).
- Mutations return the resource with status `200`, except creation returns `201`. Deletes return `200` with `{ "success": true }`.
- Errors use `{ "error": "message" }`: `400` validation, `401` missing/invalid/expired token, `404` missing/unowned resource, `409` duplicate email or conflicting schedule date, `500` unexpected server failure. Health is the exception described below.
- The configured CORS origin is `FRONTEND_ORIGIN`, defaulting to `http://localhost:5173`. Current authentication uses a bearer token, not a session cookie.

## Authentication and staff profile

`User` is `{ id: number, name: string, email: string, role: "caregiver" | "ot" | "sped_teacher" }`.

| Method / endpoint | Request body | Success response |
| --- | --- | --- |
| POST `/api/auth/register` | `{ "name": "Mara Santos", "email": "mara@example.com", "password": "example-password", "role": "caregiver" }` | `201`, `User`. Does not issue a token. |
| POST `/api/auth/login` | `{ "email": "mara@example.com", "password": "example-password" }` | `200`, `{ "token": "<jwt>", "user": User }`. JWT expires after eight hours. |
| GET `/api/auth/me` | None | `200`, `User`. |
| PATCH `/api/auth/me` | `{ "name": "Mara Santos" }` | `200`, updated `User`. Email and role cannot be changed here. |

Names: trimmed, 1–100 characters. Email: trimmed, normalized to lowercase, valid address, at most 254 characters. Registration password: 8–72 characters; login password: 1–72 characters. Registration roles must use the lowercase API enum, not display labels. Duplicate email returns `409`; invalid credentials return generic `401`.

To preserve the current Register → Dashboard flow, register successfully, then log in with the entered credentials. Restore the authenticated user on startup with `/auth/me`; an expired token must return to login. The current API has no token refresh or revocation endpoint.

## Child profiles

```ts
type Child = {
  id: number;
  user_id: number;
  name: string;
  age: number;
  delay_domain: 'speech' | 'motor' | 'cognitive' | 'social' | 'general';
  notes: string | null;
  avatar: string;
  created_at: string; // ISO timestamp
};
```

| Method / endpoint | Request | Success response |
| --- | --- | --- |
| GET `/api/children` | None | `200`, `Child[]`; `[]` means no profiles. |
| POST `/api/children` | `{ "name": "Mika", "age": 6, "delay_domain": "speech", "notes": null, "avatar": "🦊" }` | `201`, `Child`. |
| GET `/api/children/:id` | Owned positive integer ID | `200`, `Child`. Supporting read. |
| PUT `/api/children/:id` | Nonempty partial set of creation fields, e.g. `{ "name": "Mika", "notes": "Use a visual reminder" }` | `200`, updated `Child`. |
| DELETE `/api/children/:id` | No body | `200`, `{ "success": true }`. |

Create requires name, age and delay domain. Notes are optional/null; avatar defaults to `🦊`. Current accepted avatars: `🦊`, `🐼`, `🐰`, `🐻`, `🐱`, `🐶`. The frontend's `happy`, `play`, `book`, `sun` are not accepted values.

Validation: trimmed name 1–100 characters; integer age 0–120; notes at most 2,000 characters; delay domain from the enum above. The current form is narrower (name 60, age 1–18, notes 300). Ownership/IDs/timestamps are server fields and cannot be sent in create/update bodies.

The current child delete route removes in-memory schedules/tasks, but does not remove MySQL custom cards. Resolve that before promising the full deletion behavior shown in the UI.

## Activity library

GET `/api/activities` returns `200`, an array:

```json
[
  { "id": 2, "name": "Brush teeth", "icon": "🪥", "category": "hygiene" }
]
```

Activity categories are lowercase `hygiene`, `food`, `school`, `play`, `other`. The frontend currently uses capitalized display labels and SVG paths. Map returned icons/IDs to the bundled visual assets; do not send a SVG URL as an API icon.

## Schedules and tasks

```ts
type Task = {
  id: number;
  schedule_id: number;
  activity_id: number | null; // null for custom activities
  name: string;
  icon: string; // existing API uses a predefined emoji
  start_time: string | null;
  duration_min: number | null;
  position: number; // one-based
  status: 'pending' | 'done';
  completed_at: string | null; // ISO timestamp
};
type Schedule = {
  id: number;
  child_id: number;
  schedule_date: string;
  created_at: string;
  tasks: Task[]; // ordered by position
};
```

| Method / endpoint | Request | Success response |
| --- | --- | --- |
| GET `/api/schedules` | Required query: `childId=1&date=2026-11-16` | `200`, `Schedule`. No schedule for an owned child returns `404`, not an empty schedule. |
| POST `/api/schedules` | `{ "childId": 1, "date": "2026-11-16" }`; optional `"copyFrom": "2026-11-15"` | `201`, `Schedule` with empty/copied tasks. Existing target date returns `409`; missing copy source returns `404`. |
| PUT `/api/schedules/:id` | `{ "date": "2026-11-17" }` | `200`, `Schedule`. **Changes date only; does not save tasks.** Supporting action, not current date-picker behavior. |
| DELETE `/api/schedules/:id` | No body | `200`, success object; removes its tasks. Supporting action. |
| POST `/api/tasks` | Library: `{ "scheduleId": 1, "activityId": 2 }` | `201`, appended `Task` with pending status and null timing. |
| POST `/api/tasks` | Custom alternative: `{ "scheduleId": 1, "name": "Reading break", "icon": "📚" }` | `201`, appended `Task` with `activity_id: null`. Same endpoint, alternative request body. |
| PUT `/api/tasks/:id` | Nonempty subset: `{ "start_time": "09:00", "duration_min": 20, "position": 2 }` | `200`, updated `Task`. A move resequences the schedule's tasks. |
| DELETE `/api/tasks/:id` | No body | `200`, success object; remaining task positions are resequenced. |
| PATCH `/api/tasks/:id/complete` | `{ "done": true }` to complete, `{ "done": false }` to undo | `200`, `Task` with updated `status`/`completed_at`. Repeating done does not replace an existing completion timestamp. |

Custom tasks require both name and icon; never combine those fields with `activityId`. Name: trimmed, 1–100 characters. Icon must be in the backend `PREDEFINED_ICONS` list in [mocks/data.ts](../apps/api/src/mocks/data.ts). Custom task category is not accepted/persisted. Tasks do not return category; library task category must be joined from `/activities` using `activity_id`.

Timing constraints: `start_time` is `HH:MM` or null; `duration_min` is an integer 1–1440 or null. Position is 1 through the current task count. Clear optional fields with null, not an empty string. Complete/undo is separate from draft editing and must not be replayed as part of saving a draft.

## Progress

GET `/api/progress/:childId?range=7d` returns `200`:

```json
{
  "child_id": 1,
  "range": "7d",
  "today": { "date": "2026-11-16", "done": 1, "total": 2, "percentage": 50 },
  "last_7_days": [
    { "date": "2026-11-10", "done": 0, "total": 0, "percentage": 0 },
    { "date": "2026-11-11", "done": 0, "total": 0, "percentage": 0 },
    { "date": "2026-11-12", "done": 0, "total": 0, "percentage": 0 },
    { "date": "2026-11-13", "done": 0, "total": 0, "percentage": 0 },
    { "date": "2026-11-14", "done": 0, "total": 0, "percentage": 0 },
    { "date": "2026-11-15", "done": 0, "total": 0, "percentage": 0 },
    { "date": "2026-11-16", "done": 1, "total": 2, "percentage": 50 }
  ],
  "recent_completions": [
    { "task_id": 3, "name": "Brush teeth", "icon": "🪥", "schedule_date": "2026-11-16", "completed_at": "2026-11-16T01:10:00.000Z" }
  ]
}
```

The sample assumes a server time after that completion. The seven days run oldest first and end on the server's current UTC date. `range` defaults to `7d`; other ranges return `400`. Recent completions are newest first and limited to completed tasks in this seven-day schedule window whose completion time is between the window start and now.

The response currently cannot distinguish an empty existing schedule from no schedule: both have total zero. Dashboard schedule counts and exact empty-state handling should use the schedule read as well. There is no date/timezone query parameter in the current progress schema.

## Picture cards

```ts
type PictureCard = {
  id: number;
  child_id: number | null; // null means shared default
  category: 'Food' | 'Emotions' | 'Activities' | 'Needs';
  label: string;
  icon: string;
  is_hidden: boolean;
};
```

| Method / endpoint | Request | Success response |
| --- | --- | --- |
| GET `/api/cards` | Required `childId`; optional `includeHidden=true` or `false` (default false) | `200`, `{ "Food": PictureCard[], "Emotions": PictureCard[], "Activities": PictureCard[], "Needs": PictureCard[] }`. Arrays include defaults and owned custom cards; empty categories remain present. |
| POST `/api/cards` | `{ "childId": 1, "label": "Read", "category": "Activities", "icon": "📚" }` | `201`, created `PictureCard`. |
| DELETE `/api/cards/:id` | No body | `200`, success object. Only an owned custom card can be deleted. |
| PATCH `/api/cards/:id` | `{ "hidden": true }` or `{ "hidden": false }` | `200`, updated custom `PictureCard`. Supporting endpoint; no current UI control. |

Label: trimmed, 1–100 characters. The frontend form currently limits labels to 40. Category uses title case, unlike activity categories. Icon must be in `PREDEFINED_ICONS`; semantic names such as `help`, `water`, `book` are not accepted. The frontend's Help picture has no agreed dedicated backend icon identifier; this needs a contract decision.

Use the grouped response as the board source rather than appending the hardcoded defaults again. To build Your custom cards, flatten the groups and retain cards whose `child_id` equals the selected child. Default cards cannot be deleted or hidden through these routes; unowned/default mutations return `404`.

## Settings

GET `/api/settings` returns `200` with the current preferences. PUT `/api/settings` accepts and returns the entire object:

```json
{ "font_size": "small", "contrast": "normal", "sound_on": false }
```

All three fields are required on PUT. Font size: `small`, `medium`, `large`; contrast: `normal`, `high`; sound: boolean. This route does not save the staff name; use PATCH `/auth/me` separately. Read backend defaults rather than assuming the frontend demo's initial values.

## Optional health read

GET `/api/health` returns `200` with `{ "status": "ok", "database": "connected", "message": "API and database are available.", "timestamp": "<ISO timestamp>" }`. A failed database check returns `503` with `status: "error"`, `database: "disconnected"`, message and timestamp. It does not use the normal `{ error }` shape.

## Contract sources

- [Auth](../apps/api/src/routes/auth.ts), [auth validation](../apps/api/src/auth/schemas.ts), [token configuration](../apps/api/src/config.ts).
- [Children](../apps/api/src/routes/children.ts), [activities](../apps/api/src/routes/activities.ts), [schedules](../apps/api/src/routes/schedules.ts), [tasks](../apps/api/src/routes/tasks.ts).
- [Progress](../apps/api/src/routes/progress.ts), [cards](../apps/api/src/routes/cards.ts), [settings](../apps/api/src/routes/settings.ts), [health](../apps/api/src/routes/health.ts).
- [Shared validation](../packages/shared/src/schemas.ts), [resource types and mock store](../apps/api/src/mocks/data.ts), [card/settings repository](../apps/api/src/group5/repository.ts).
