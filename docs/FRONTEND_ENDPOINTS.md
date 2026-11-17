---
analyzed_commit: "4eb8074c66bda543df00e8522866bdbc0b2f853a"
analyzed_at: "2026-11-16"
---

# Frontend endpoint inventory

This inventory comes from the implemented React workflows, checked against the Express route handlers and validation schemas. It describes the API integration the frontend needs; it does not claim these requests are already wired into the screens.

Read alongside:

- [Frontend/SRS/backend cross-reference](ENDPOINT_CROSS_REFERENCE.md).
- [Request and response contracts](FRONTEND_API_CONTRACTS.md).
- [Integration gaps and implementation checklist](FRONTEND_API_INTEGRATION.md).

## Current frontend behavior

`App.tsx` keeps profiles, schedules, tasks and preferences in `araw-frontend-demo-v1` in browser local storage. Staff names use `araw-staff-name-v1`; custom cards use `araw-custom-cards-v1`. Login and registration only navigate into the demo. `lib/api.ts` contains a health helper, but no current screen calls it. No feature screen currently sends API requests.

All paths below include the `/api` prefix. Except registration, login and health, existing routes require `Authorization: Bearer <token>`. The child uses the supervising staff session.

## Endpoints needed for the current screens

All 21 method/path pairs in this table exist in the backend. “Exists” means a route is implemented, not that its data store or contract fully supports the current UI; see the integration gaps.

| ID | Method | Endpoint | Frontend consumer and purpose |
| --- | --- | --- | --- |
| AUTH-01 | POST | `/api/auth/register` | Registration: create the staff account with name, email, password and role. |
| AUTH-02 | POST | `/api/auth/login` | Login: obtain a JWT and current user. Also needed after registration if entering the dashboard immediately. |
| AUTH-03 | GET | `/api/auth/me` | App startup, staff header and Settings: restore/validate the session and load name, email and role. |
| AUTH-04 | PATCH | `/api/auth/me` | Settings: save the editable staff name. |
| CHILD-01 | GET | `/api/children` | Dashboard, Child Profiles and all child selectors: load the signed-in user's profiles. |
| CHILD-02 | POST | `/api/children` | Add child form: persist a new profile. |
| CHILD-03 | PUT | `/api/children/:id` | Edit child form: persist profile changes. |
| CHILD-04 | DELETE | `/api/children/:id` | Delete confirmation: remove the owned child and related data. Card cleanup currently needs backend work. |
| ACT-01 | GET | `/api/activities` | Schedule editor: populate the predefined activity library. |
| SCH-01 | GET | `/api/schedules?childId=:childId&date=YYYY-MM-DD` | Load an editor draft, selected-day task status, today's child schedule, dashboard totals and copy source. Returns ordered tasks. |
| SCH-02 | POST | `/api/schedules` | Save a new day's schedule. Optional `copyFrom` copies another date into a new schedule; it does not replace an existing day's draft. |
| TASK-01 | POST | `/api/tasks` | Persist an added library or custom activity when Save schedule is pressed. |
| TASK-02 | PUT | `/api/tasks/:id` | Persist start time, duration and one-based order when Save schedule is pressed. |
| TASK-03 | DELETE | `/api/tasks/:id` | Persist removal from the schedule when Save schedule is pressed. |
| TASK-04 | PATCH | `/api/tasks/:id/complete` | Task status: mark done or undo. Child view: mark the current task done immediately. |
| PROG-01 | GET | `/api/progress/:childId?range=7d` | Dashboard's selected child history and Progress: daily totals, percentages and recent completions. |
| CARD-01 | GET | `/api/cards?childId=:childId` | Child Talk board: defaults plus the child's custom cards, grouped by category. Staff management can use `includeHidden=true`. |
| CARD-02 | POST | `/api/cards` | Staff picture card form: create a custom word with a predefined picture and category. |
| CARD-03 | DELETE | `/api/cards/:id` | Staff custom card list: delete an owned custom card. |
| SET-01 | GET | `/api/settings` | App startup and Settings: load text size, contrast and sounds preferences. Apply them to Staff and Child views. |
| SET-02 | PUT | `/api/settings` | Settings: save the complete preferences object. |

`TASK-01` through `TASK-03` can approximate Save schedule using several requests, but do not provide an atomic save. The proposed save contract is documented in [the integration guide](FRONTEND_API_INTEGRATION.md#atomic-schedule-save-proposal).

## Screen-to-request map

| Screen / action | Reads | Writes | Result to refresh |
| --- | --- | --- | --- |
| Register | None | AUTH-01, then AUTH-02 if automatically entering the app | Current user, settings and children. Registration itself returns no token. |
| Log in | None | AUTH-02 | Load AUTH-03, SET-01 and CHILD-01 as needed; login already returns the user. |
| Restore app | AUTH-03, SET-01, CHILD-01 | None | Authenticated state; do not retain another user's demo/cache state. |
| Staff header | AUTH-03 or login response | None | Display actual name and role. |
| Dashboard | CHILD-01; SCH-01 per child for today; PROG-01 for selected child | None | Counts: profiles; done/total tasks; children with a schedule. |
| Child Profiles list | CHILD-01; SCH-01 per child for today's View/Create schedule label | None | Profile list and schedule existence. |
| Add / edit child | Cached CHILD-01 data | CHILD-02 / CHILD-03 | Profile list, selected child and dashboard. |
| Delete child | Cached selected child | CHILD-04 after confirmation | Remove its schedules, tasks and cards from client state after success. |
| Schedule editor | CHILD-01, ACT-01, SCH-01 for selected child/date | SCH-02 if missing, then TASK-01/02/03 on Save | Refetch SCH-01 and relevant progress; reset dirty state only on success. |
| Copy from date | SCH-01 for source date | None while drafting; save later | Replace local draft with copied tasks, new temporary IDs and pending status. |
| Apply to draft / discard | Cached schedule | None | Change or reset the local draft only. |
| Task status | CHILD-01, SCH-01 for selected day | TASK-04 with `done: true` or `false` | Same schedule, dashboard and progress. |
| Progress | CHILD-01, PROG-01 | None | Seven days and latest completion entries. |
| Settings | AUTH-03, SET-01 | AUTH-04 and SET-02 | Name in header and preferences across views. These are separate saves. |
| Manage picture cards | CARD-01; filter `child_id` to the selected child for custom-only list | CARD-02 / CARD-03 | Staff list and child board. Shared cards have `child_id: null`. |
| Child My day | Cached child, SET-01, SCH-01 for today | TASK-04 | Advance Now/Next only after success or roll back a failed optimistic update. |
| Child Talk | CARD-01 and cached preferences | None for choosing/speaking cards | Phrase stays in local component state. |
| Staff exit / navigation | Cached state; refresh relevant data on return | None | Navigation only; this is not logout. |
| Log out | None | No existing server route | Clear token and user-scoped cached data; navigate to login. |

Dashboard loading can use existing routes without a new `/api/dashboard` endpoint. For `N` children, fetch the list, their `N` schedules for today and the selected child's progress; reuse cached responses. A dashboard aggregate endpoint would be an optimization, not a prerequisite.

## Existing supporting endpoints without a current direct UI action

These five routes complete the current backend inventory of 26 method/path pairs. They are not additional requirements for the visible frontend workflows.

| Method | Endpoint | Usage |
| --- | --- | --- |
| GET | `/api/children/:id` | Optional fresh read for a selected profile; the current UI can use the list response. |
| PUT | `/api/schedules/:id` | Changes the persisted schedule's date only. Selecting a date in the editor currently loads a different day; it does not rename a schedule. |
| DELETE | `/api/schedules/:id` | Deletes a complete schedule and its tasks. No current Delete schedule control. |
| PATCH | `/api/cards/:id` | Hides/unhides owned custom cards. No current hide control; this is not an edit-label endpoint. |
| GET | `/api/health` | Optional connectivity diagnostics. Public, with a distinct health response and `503` on database failure. |

## Operations that need no HTTP endpoint

- Open menus, change selected child/date/category, navigate, confirm deletion or confirm adult exit.
- Build/clear the sentence bar and speak with `window.speechSynthesis`; no speech service or phrase-save endpoint is required.
- Render Now/Next, all-done feedback, counts, percentages and progress graphics from schedule data.
- Select bundled SVG pictures, avatars and fonts; no image upload endpoint is used by this frontend.
- Preview or discard local schedule drafts. Preview needs frontend work to display unsaved draft data without persisting it.
- Logout with the current stateless JWT contract clears client credentials. No refresh-token, server logout, password-reset, child-login or timer endpoint is implemented or required by the current controls.

## Sources inspected

| Source | Scope |
| --- | --- |
| [App.tsx](../apps/web/src/App.tsx) | Session UI, local demo bootstrap, navigation and shared actions. |
| [StaffPages.tsx](../apps/web/src/StaffPages.tsx) | Dashboard, profiles, progress, settings and custom cards. |
| [SchedulePages.tsx](../apps/web/src/SchedulePages.tsx) | Drafts, copy, editing, reorder, save and task status. |
| [ChildView.tsx](../apps/web/src/ChildView.tsx) | Today, completion, Talk and speech. |
| [model.ts](../apps/web/src/model.ts) | Frontend data model. |
| [app.ts](../apps/api/src/app.ts) and [route handlers](../apps/api/src/routes/) | Mounted API endpoints and response behavior. |
| [Shared schemas](../packages/shared/src/schemas.ts) and [auth schemas](../apps/api/src/auth/schemas.ts) | Accepted input names and validation. |
