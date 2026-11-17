---
analyzed_commit: "4eb8074c66bda543df00e8522866bdbc0b2f853a"
analyzed_at: "2026-11-16"
---

# Frontend API integration gaps and handoff

Reviewed: 16 November 2026. This document accompanies [the endpoint inventory](FRONTEND_ENDPOINTS.md) and [existing request/response contracts](FRONTEND_API_CONTRACTS.md). The recommendations below describe work to do; proposed contracts are not implemented endpoints.

## Findings that affect integration

The [endpoint cross-reference](ENDPOINT_CROSS_REFERENCE.md) maps these gaps to every frontend, SRS and backend route.

| Priority | Finding in current code | Consequence / required action |
| --- | --- | --- |
| Required | No feature screen calls the API. Login just navigates; shared actions update local storage. | Add authenticated data loading/mutations and explicit loading, failure and empty states. Disable demo seeding in API mode. |
| Required | Child, activity, schedule and task routes use `mocks/data.ts`; auth, cards and settings use MySQL repositories in the default app. | A child created via POST `/children` is not inserted into MySQL. Card ownership checks/creation can fail or reference a different SQL child with the same ID. Unify persistence and ownership before a live integration. |
| Required | Save schedule replaces one local array; API task mutations persist independently. | Preserve draft/discard semantics, handle partial failures, and add atomic saving if all-or-nothing behavior is required. See proposal below. |
| Required | The custom activity form stores a chosen category; task creation has no category input and task responses have no category. | Persist/return custom category through an agreed extension, or change the UI to match the supported contract. A client-only category will disappear after reload. |
| Required | Frontend avatar codes are `happy`, `play`, `book`, `sun`; API accepts six animal emoji. | Agree on stable design avatar codes in the backend schema/store, or explicitly change the UI choices. Current values cannot be submitted unchanged. |
| Required | Frontend activity/card icons use SVG URLs or semantic codes; API expects predefined emoji. | Add a shared asset mapping or stable icon contract. Help has no dedicated accepted code. Never submit a local image path as a predefined API icon. |
| Required | Frontend uses local calendar date; progress computes UTC today with no date/timezone input. | Agree on a business date policy. In Asia/Manila, local 00:00–07:59 belongs to the previous UTC day, so today's schedule and progress can disagree. |
| Required | Child deletion clears local cards, but backend child deletion only removes mock schedules/tasks. | Persist child deletion and custom-card cleanup consistently; frontend must wait for server success before discarding data. SQL cascade works only when deleting the SQL child row. |
| Required | Settings name and preferences save to separate endpoints; email and role in the UI are hardcoded. | Load actual profile, map roles and report each save outcome. Do not show complete success if only one request succeeds. |
| Required | Task/status and child completion currently have no network wait/failure path. | Keep the same task on a failed completion; update status from the returned task. Invalidate dashboard, schedule and progress caches on success. |
| Required | API task `activity_id` may be null; local model always gives `activityId` a string. | Model persisted custom tasks explicitly and retain numeric server IDs separately from temporary draft IDs. |
| Required | Progress returns no schedule-existence flag. | Use schedule reads for today's View/Create labels and children-with-schedule counts. Decide whether an empty schedule should display differently from no schedule in history. |
| Follow-up | Preview opens `ChildView`, which reads the saved schedule and can call completion actions. | Render an isolated draft preview with draft tasks and disabled server mutations. Preview should not save or complete real tasks. |

The mock fixtures (Mia/Leo/Ava), SQL seed and frontend demo (Mika/Leo/Ari) are independent datasets. Fetch the authenticated user's real profiles; do not assume IDs 1–3 belong to that user or migrate the demo IDs implicitly.

## Frontend adapters

Place conversion logic at the API boundary rather than spreading it through JSX. The existing helper in [lib/api.ts](../apps/web/src/lib/api.ts) only implements health.

| API field | Frontend field / behavior |
| --- | --- |
| `Child.id`, `Schedule.id`, `Task.id`, `PictureCard.id` | Use server numeric IDs. Update the model or convert consistently to strings for display keys; never turn draft IDs into request IDs. |
| `Child.delay_domain` | `delayDomain`, capitalize for display and lowercase on write. |
| `Child.notes: null` | Empty input string for display; send null to clear if desired. |
| `Child.avatar` | Resolve through the agreed avatar manifest. Current animal emoji and design codes are incompatible. |
| `Schedule.child_id`, `schedule_date` | `childId`, `date`. |
| `Task.activity_id` | Numeric library reference or null for custom. Join the activity library to obtain category. |
| `Task.position` | Sort tasks before rendering; UI array index + 1 is the order sent back. |
| `Task.start_time`, `duration_min` | `startTime`, `duration`; API null time becomes `''` in input. Reverse this on write. |
| `Task.completed_at` | Retain for Task status timestamps and completion history; current frontend task model omits it. |
| `Activity.category` | Capitalized category label and chip; lowercase enum stays in API data. |
| `Activity.icon`, `Task.icon`, `PictureCard.icon` | Resolve to bundled assets in the relevant screen size; preserve the original accepted icon value for API writes. |
| `PictureCard.child_id`, `is_hidden` | Retain ownership/default and visibility metadata; flatten groups for management, preserve groups for Talk. |
| `font_size`, `sound_on` | `fontSize`, `soundOn`; `contrast` uses the same enum. |
| `User.role` | `caregiver` → Caregiver, `ot` → OT, `sped_teacher` → SPED Teacher. |

### Activity identity and illustration mapping

These are the existing mock activity IDs, verified in `mocks/data.ts`; production code should use returned IDs and a stable catalog rather than assume database IDs always match these fixtures.

| Frontend demo key | Mock API activity ID / name | API icon | Frontend picture |
| --- | --- | --- | --- |
| `wake` | 1 / Wake up | `☀️` | clock |
| `brush` | 2 / Brush teeth | `🪥` | brush |
| `wash` | 3 / Wash hands | `🧼` | wash |
| `breakfast` | 4 / Eat breakfast | `🍎` | rice/bowl |
| `dress` | 5 / Get dressed | `👕` | shirt |
| `toilet` | 6 / Toilet | `🚽` | toilet |
| `school` | 7 / Go to school | `🚌` | school |
| `learning` | 8 / Learning activity | `📚` | book; current UI label is Learning |
| `play` | 9 / Play | `🧸` | play/ball |
| `bath` | 10 / Bath | `🛁` | bath |
| `bed` | 11 / Get ready for bed | `🌙` | bed |

The API additionally returns Eat lunch (mock ID 12), which is absent from the current hardcoded frontend library. Read the full library and provide a supported illustration/fallback for every returned item. Do not infer permanent identity from an editable activity name.

### Picture-card catalog agreement

The child board currently includes Read/School in Activities and Help/Water in Needs; the backend default catalog instead includes TV and does not seed all those design defaults. Loading server data will change the visible board unless the defaults are aligned.

Water (`water` ↔ `💧`) and Book (`book` ↔ `📚`) can use explicit adapters for existing icons. Help needs an agreed stable value and validation/catalog update to preserve its exact picture. A shared versioned manifest can handle predefined icon/asset IDs without introducing a new HTTP endpoint. If the catalog later becomes server-managed, a catalog endpoint would be a separate proposal, not something implemented today.

## Saving a schedule using existing endpoints

1. Load the saved schedule and keep an untouched baseline plus a local draft. A missing schedule for an owned child is an empty editor state; a missing child or failed request is not.
2. Apply Add, Move, Edit, Remove and Copy operations only to the draft. Keep temporary IDs for new rows. Discard restores the baseline without sending writes.
3. On Save, create a schedule with POST `/api/schedules` only if no saved schedule exists. Handle `409` by refetching and reconciling rather than deleting an existing schedule.
4. Compare the draft to the baseline. Delete removed saved tasks; append new tasks and retain their returned server IDs; apply timing changes and reordering sequentially using the updated task list. Each move resequences all positions, so use the current order rather than stale baseline positions.
5. Refetch the schedule and affected progress after the writes succeed. Keep dirty/error state and offer reconciliation after any failure; earlier requests may already have persisted.

This sequence has no transaction or concurrency version. It cannot guarantee that Save either commits the entire draft or changes nothing. Retrying a POST blindly can duplicate tasks. Do not delete/recreate the schedule to simulate replacement: that loses task IDs and completion history.

For copy, GET the source schedule and clone tasks into the local draft with pending status, temporary IDs and no `completed_at`. POST `/schedules` with `copyFrom` can copy only when the target date is new and persists immediately, so it does not directly implement Copy → edit → Discard on an existing day.

## Atomic schedule save proposal

**Proposed, not implemented:** PUT `/api/children/:childId/schedules/:date`.

This would create or update one day's plan in a transaction, matching the existing Save schedule control. The exact schema must be agreed with the backend team before frontend use.

Example proposed request:

```json
{
  "expectedVersion": 3,
  "tasks": [
    { "id": 31, "start_time": "09:00", "duration_min": 20 },
    { "activityId": 9, "start_time": null, "duration_min": null },
    { "name": "Reading break", "icon": "📚", "category": "school", "start_time": null, "duration_min": 10 }
  ]
}
```

Proposed behavior:

- Require the staff bearer token and validate ownership of the child and every existing task ID.
- Existing rows reference only their task ID; new rows use either `activityId` or custom `name`/`icon`/`category`. Array order determines one-based positions. Omitted saved rows are removed deliberately.
- Validate the entire draft before writing; reject duplicate IDs, invalid references, unsupported icons/categories and bad timing without partial writes.
- Preserve completion state/timestamps for retained tasks. New/copy-created tasks start pending. Completion remains on PATCH `/api/tasks/:id/complete` and is not writable in the plan body.
- Return `201` on creation or `200` on update with the complete ordered schedule, real task IDs, persisted category and a new version. Define `expectedVersion: null` for create and require a matching version for update; conflict returns `409` and current version metadata.
- Keep the version focused on plan edits so child completion does not cause a draft save to overwrite completion or unnecessarily conflict. Implement transactional storage before claiming atomic behavior.

An alternate bulk-save route name is possible. The required capability is transactional plan persistence; no current endpoint accepts this payload, and PUT `/api/schedules/:id` currently changes only the date.

## Date and progress agreement

The schedule lookup already accepts an explicit date. Progress derives today from UTC. Choose a consistent policy before wiring today's dashboard and child view:

- Adopt UTC dates throughout the frontend; or
- Extend the progress contract to accept a validated business date or timezone and use the same policy in dashboard/schedule loading.

The latter is a proposed query/schema change, not a currently supported parameter. If the UI must distinguish empty schedules from absent schedules in seven-day history, extend progress day items with a schedule-existence flag or schedule ID. Until then, fetch the relevant schedules when that distinction matters.

## State refresh and failure behavior

| Event | Refresh / reconcile |
| --- | --- |
| Login / restore | User, preferences, children, today's schedules and selected child's history. Clear prior user data on session change. |
| Child create / edit / delete | Children list and selection; remove deleted child's schedules/cards from cache after confirmed success. |
| Plan save | That child/date schedule, dashboard totals and child's progress. |
| Complete / undo | Returned task, its schedule, dashboard totals and progress. Prevent repeated taps while pending or make updates safely idempotent. |
| Card create / delete | Both management list and Talk categories for that child. |
| Profile name save | Current user/header. |
| Preferences save | Staff and Child appearance/preferences. |
| Network/500 | Keep draft or current task, show retry state; never replace valid data with the demo seed. |
| 401 | End/restore authentication, clear user-specific caches and return to login. |
| Schedule 404 | Distinguish owned child with no schedule from unavailable/deleted child using the selected profile and response. |
| Settings partial failure | Show which save failed; retry only the failed profile/settings mutation. |

In the current demo, opening Child view from the editor always uses today's saved schedule, even if a different date is selected. Confirm intended Preview behavior during integration; don't accidentally mark a different day's real tasks as done.

## Suggested integration order

1. Agree on icon/avatar identifiers, custom category persistence and date policy; unify child/card storage and delete behavior.
2. Add shared API DTOs/adapters, authenticated request handling and session bootstrap. Keep demo mode explicit if retained.
3. Wire profile management and preferences using real server IDs and profile values.
4. Wire the activity library and saved schedule reads; implement safe draft saving, preferably with the atomic proposal.
5. Wire task completion/undo and derived dashboard/progress refreshes.
6. Wire grouped card reads and owned custom-card creation/deletion; retain local phrase/speech controls.
7. Verify registration/login failures, cross-user isolation, missing schedules, copy/discard, partial-save failures, completion failures, card refresh, timezone boundaries and logout/reload behavior.

This review changes documentation only. It does not add the proposed endpoint, alter validation, connect frontend requests, or change runtime behavior.
