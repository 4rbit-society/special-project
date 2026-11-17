# Endpoint cross-reference: connected frontend and backend

**Updated:** November 17, 2026 (Asia/Singapore). Covers the frontend integration working tree based on `cbf744f`.

All **28 mounted method/path combinations** have authenticated-client methods and browser call sites: the existing 27 plus per-activity completion analytics. The live desktop browser test records network requests and asserts coverage of all 28. This replaces the earlier pre-integration inventory.

## Endpoint coverage

| Method | Path | Browser workflow | Backend |
| --- | --- | --- | --- |
| GET | `/api/health` | Workspace startup and connection errors | [health.ts](../apps/api/src/routes/health.ts#L7) |
| POST | `/api/auth/register` | Register, login, session restore and Settings profile | [auth.ts](../apps/api/src/routes/auth.ts#L19) |
| POST | `/api/auth/login` | Register, login, session restore and Settings profile | [auth.ts](../apps/api/src/routes/auth.ts#L32) |
| GET | `/api/auth/me` | Register, login, session restore and Settings profile | [auth.ts](../apps/api/src/routes/auth.ts#L46) |
| PATCH | `/api/auth/me` | Register, login, session restore and Settings profile | [auth.ts](../apps/api/src/routes/auth.ts#L51) |
| GET | `/api/children` | Dashboard/profile CRUD and opening Child view | [children.ts](../apps/api/src/routes/children.ts#L19) |
| POST | `/api/children` | Dashboard/profile CRUD and opening Child view | [children.ts](../apps/api/src/routes/children.ts#L26) |
| GET | `/api/children/:id` | Dashboard/profile CRUD and opening Child view | [children.ts](../apps/api/src/routes/children.ts#L35) |
| PUT | `/api/children/:id` | Dashboard/profile CRUD and opening Child view | [children.ts](../apps/api/src/routes/children.ts#L45) |
| DELETE | `/api/children/:id` | Dashboard/profile CRUD and opening Child view | [children.ts](../apps/api/src/routes/children.ts#L56) |
| GET | `/api/activities` | Editor library and quick task add | [activities.ts](../apps/api/src/routes/activities.ts#L11) |
| GET | `/api/schedules` | Editor load/save, copy, date change and deletion | [schedules.ts](../apps/api/src/routes/schedules.ts#L41) |
| POST | `/api/schedules` | Editor load/save, copy, date change and deletion | [schedules.ts](../apps/api/src/routes/schedules.ts#L56) |
| PUT | `/api/schedules` | Editor load/save, copy, date change and deletion | [schedules.ts](../apps/api/src/routes/schedules.ts#L78) |
| PUT | `/api/schedules/:id` | Editor load/save, copy, date change and deletion | [schedules.ts](../apps/api/src/routes/schedules.ts#L86) |
| DELETE | `/api/schedules/:id` | Editor load/save, copy, date change and deletion | [schedules.ts](../apps/api/src/routes/schedules.ts#L103) |
| POST | `/api/tasks` | Task status quick add/reorder/remove; Staff/Child complete and undo | [tasks.ts](../apps/api/src/routes/tasks.ts#L37) |
| PUT | `/api/tasks/:id` | Task status quick add/reorder/remove; Staff/Child complete and undo | [tasks.ts](../apps/api/src/routes/tasks.ts#L70) |
| DELETE | `/api/tasks/:id` | Task status quick add/reorder/remove; Staff/Child complete and undo | [tasks.ts](../apps/api/src/routes/tasks.ts#L87) |
| PATCH | `/api/tasks/:id/complete` | Task status quick add/reorder/remove; Staff/Child complete and undo | [tasks.ts](../apps/api/src/routes/tasks.ts#L97) |
| GET | `/api/cards` | Staff card administration and Child board | [cards.ts](../apps/api/src/routes/cards.ts#L20) |
| POST | `/api/cards` | Staff card administration and Child board | [cards.ts](../apps/api/src/routes/cards.ts#L39) |
| PATCH | `/api/cards/:id` | Staff card administration and Child board | [cards.ts](../apps/api/src/routes/cards.ts#L58) |
| DELETE | `/api/cards/:id` | Staff card administration and Child board | [cards.ts](../apps/api/src/routes/cards.ts#L69) |
| GET | `/api/progress/:childId` | Dashboard, seven-day progress and recent completions | [progress.ts](../apps/api/src/routes/progress.ts#L17) |
| GET | `/api/progress/:childId/activities` | Most/least-completed activity patterns for 7 or 30 days | [progress.ts](../apps/api/src/routes/progress.ts#L18) |
| GET | `/api/settings` | Load and save accessibility preferences | [settings.ts](../apps/api/src/routes/settings.ts#L13) |
| PUT | `/api/settings` | Load and save accessibility preferences | [settings.ts](../apps/api/src/routes/settings.ts#L20) |

## Client and state boundaries

- [client.ts](../apps/web/src/lib/client.ts) supplies typed requests, Bearer authentication, backend error messages, cancellation/timeout handling and 401 callbacks. Register/login failures do not expire a different authenticated session.
- [adapters.ts](../apps/web/src/lib/adapters.ts) maps snake_case API fields and numeric IDs into UI models. It preserves completion timestamps and excludes client-supplied status/completion from editor saves.
- [App.tsx](../apps/web/src/App.tsx) restores a session with GET /auth/me before rendering the workspace. Data is fetched per authenticated user and cleared on logout/expiry/account changes. Session generations discard late results from previous sessions.
- Browser data is server-backed in memory; old demo local-storage datasets are not read or migrated. Only the JWT is retained in session storage, or local storage when Remember me is selected. Tokens expire according to the backend policy.
- Dashboard and Progress use backend summaries. Recent completion times are displayed from server timestamps. The browser passes its local calendar date to backend progress; completion instants remain UTC in storage and use browser-local display.
- Child cards come from GET /cards. Hidden custom cards are filtered from the board; administrators load includeHidden=true and can show/hide/delete only their own custom cards.

## Atomic schedule editor save

`PUT /api/schedules` accepts:

```json
{
  "childId": 1,
  "date": "2026-11-17",
  "scheduleId": 12,
  "expectedRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "expectedTaskIds": [9],
  "tasks": [
    { "id": 9, "start_time": "08:15", "duration_min": 10 },
    { "activityId": 3, "start_time": null, "duration_min": null },
    { "name": "Custom activity", "icon": "?", "start_time": null, "duration_min": null }
  ]
}
```

For a new schedule, omit scheduleId and expectedRevision and send expectedTaskIds: []. For an existing schedule, send its loaded revision in expectedRevision (the example hash is a placeholder). The backend validates every task and child ownership, locks the schedule data, applies additions/removals/order/timing in one transaction and returns the full saved schedule. Existing IDs must belong to that schedule. At most 500 draft tasks are accepted. The request cannot set completion state.

The loaded task IDs and revision check schedule identity, date, membership, order, content and timing. Concurrent changes return 409. Completion state is read from the database and preserved. Failed writes roll back both new schedule creation and task edits.

Drafts remain in the editor on a failed save. Preview is a read-only snapshot of the selected date/draft and returns to the same editor. Quick task actions use the existing POST/PUT/DELETE task routes. Copies into a new date use POST /schedules with copyFrom; copying into an existing editor fetches the source and produces an unsaved draft. Saved schedule date changes and deletion use explicit controls.

## Failure handling

401 clears the session and account data; validation/conflict errors retain forms/drafts. Network failures and timeouts are visible, with explicit reload/retry controls. A timed-out mutation may have reached the server: reload saved data before retrying. Progress refresh errors after a confirmed write are reported separately from save failure. Profile-name and preferences updates use separate endpoints; a partial failure explicitly states that the name saved while preferences failed.

## Optional SRS features

- **Task timer (`FR-TASK-06/07`).** The Child view starts an optional 1-second countdown for the current task when it has a duration. It shows a ring, a near-end visual state, and a timer-end message. When the sound setting is on, a short Web Audio cue plays; when audio is unavailable, the visual cue still works.
- **TTS voice speed (`FR-COMM-08`).** Settings include `voice_speed` (`slow`, `normal`, `fast`). The Child view uses rates 0.65, 0.85 and 1.1 for card and phrase speech.
- **Activity patterns (`FR-PROG-04`).** `GET /api/progress/:childId/activities?range=7d|30d` groups scheduled tasks by name and returns completion counts, percentages and the last completion. The Progress page shows most- and least-completed lists for the selected period.
- **Photo upload (`FR-COMM-09`).** Deliberately out of MVP; custom cards use the predefined icon set.

Database support covers MySQL 8.0 and MariaDB 11.x; shared-lock queries use `LOCK IN SHARE MODE`, which both accept. CI runs the database-backed suites against MySQL 8.0 and MariaDB 11.8.

## Verification and remaining limits

- The current endpoint integration passed 178 API unit tests, 12 client/adapter/timer tests, 23 database tests, 3 API/MySQL integration tests and 16 real-browser tests. See [the debugging review](POLISH_REVIEW.md) for expanded validation after polishing. Production build and workspace typechecks passed.
- Browser checks cover all 28 method/path combinations, desktop CRUD, saved state after reload, read-only preview, completion, cards, settings, copy/date/delete, logout, session expiry, unavailable API/retry, failed-save recovery, a 390px mobile flow and isolation after account switching.
- [Browser tests](../apps/web/e2e/connected.spec.ts), [API draft tests](../apps/api/tests/group4/drafts.test.ts), and [database integration tests](../apps/api/src/db/feature-data.integration.test.ts) contain the assertions. [CI](../.github/workflows/api-tests.yml) runs client and browser tests as well as the backend suites.
- Browser tests use a dedicated empty *_test database. The runner refuses existing users; cleanup requires a marker proving fixture creation by the current run and removes only its own users/seed caregiver.
- This is not a full multi-browser, accessibility, load or usability certification. Actual speech audibility/voice availability still requires device testing. Optional timer, adjustable speech speed, photo upload and task-frequency analytics features are not added by endpoint integration.

Existing schedule draft saves also send `expectedRevision` from the loaded schedule. A changed date, task order, content, or timing returns 409 while the editor retains its draft. Completion updates alone do not invalidate a draft.
