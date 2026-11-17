---
analyzed_commit: "4eb8074c66bda543df00e8522866bdbc0b2f853a"
analyzed_at: "2026-11-16"
---

# SRS endpoint inventory

Source: [Software Requirements Specification](SRS.md), version 1.0 (Draft), dated 13 November 2026. Reviewed sections 4 (functional requirements), 5 (use cases), 6.2 (API table), 7 (data rules), 8 (non-functional requirements) and 9 (acceptance).

The SRS explicitly lists **25 distinct HTTP method/path pairs** in section 6.2. The table below expands combined entries such as `GET, PUT, DELETE` into separate endpoints. Query values and request/response summaries reflect the current backend contract where the SRS leaves details unspecified. The SRS calls its endpoint set proposed and permits the team to adjust final names.

The commit hash above identifies the analyzed source revision. Compare it with `git rev-parse HEAD` when checking whether this report needs review.

See the [frontend/SRS/backend cross-reference](ENDPOINT_CROSS_REFERENCE.md) for route coverage, actual connections and unresolved mismatches.

## Authentication and account — 4 endpoints

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/auth/register` | Create staff account. Body: `name`, `email`, `password`, `role`. Returns the public user; no token is issued by this route. Validate required fields, email, minimum eight-character password and duplicate email; hash passwords. | FR-AUTH-01/02/03; UC-01 |
| 2 | POST | `/api/auth/login` | Authenticate with `email`, `password`. Returns `{ token, user }`. Invalid credentials return `401`. | FR-AUTH-04; UC-02 |
| 3 | GET | `/api/auth/me` | Read the authenticated user's `id`, `name`, `email`, `role`; supports session restoration and profile display. | FR-AUTH-05/07; FR-SET-01; UC-02/10 |
| 4 | PATCH | `/api/auth/me` | Update own profile name. Body: `{ name }`. Returns updated public user. Email/role editing is a team decision in the SRS; current implementation accepts name only. | FR-SET-01; UC-10 |

## Child profiles — 5 endpoints

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 5 | GET | `/api/children` | List only the signed-in staff member's children. Returns an array, including `[]` for no profiles. | FR-CHILD-02/06; FR-PROG-01; UC-03/09 |
| 6 | POST | `/api/children` | Create child. Body: `name`, `age`, `delay_domain`, optional `notes`, predefined `avatar`. Returns the child with server-assigned ID and owner. | FR-CHILD-01/05/06; UC-03 |
| 7 | GET | `/api/children/:id` | Read one owned child's profile. Missing/unowned child returns `404`. | FR-CHILD-03/06; UC-03 |
| 8 | PUT | `/api/children/:id` | Edit an owned child's profile. Current body accepts a nonempty subset of creation fields. Returns updated child. | FR-CHILD-03/05/06; UC-03 |
| 9 | DELETE | `/api/children/:id` | Delete after frontend confirmation. Returns `{ success: true }`. SRS section 7.2 requires related schedules, tasks and custom cards to be removed. | FR-CHILD-04/06; section 7.2; UC-03 |

## Activity library — 1 endpoint

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 10 | GET | `/api/activities` | Return predefined activities with `id`, `name`, `icon`, `category`. Categories: `hygiene`, `food`, `school`, `play`, `other`. | FR-SCH-01/07; UC-04 |

## Schedules — 4 endpoints

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 11 | GET | `/api/schedules?childId=:childId&date=YYYY-MM-DD` | Read an owned child's schedule and tasks ordered by `position`. Supports editor, staff task list and Child view. Current missing schedule response is `404`. | FR-SCH-02/10; FR-TASK-05; FR-CHD-01/02/03/06; UC-04/05/06 |
| 12 | POST | `/api/schedules` | Create schedule for a child/date. Body: `{ childId, date }`; current optional `copyFrom` copies another day's tasks. Returns schedule with tasks. Duplicate target date returns `409`. | FR-SCH-02/09; UC-04 |
| 13 | PUT | `/api/schedules/:id` | Update schedule. **Current contract only changes its date**, with `{ date }`; task edits use the task endpoints. Returns schedule with tasks. | Section 6.2 explicitly lists this route; UC-04/05. No separate numbered FR specifically requires changing a schedule's date. |
| 14 | DELETE | `/api/schedules/:id` | Delete an owned schedule and its tasks. Returns `{ success: true }`. | Section 6.2 explicitly lists this route; no separate numbered FR specifically requires standalone schedule deletion. |

One schedule per child per date is specified by sections 7.1 and 12.5. Copying to a new date reuses POST `/api/schedules`; the SRS does not define a separate `/copy` endpoint. Preview and drag-and-drop are frontend interactions that use these resources, not separate routes.

## Tasks — 4 endpoints

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 15 | POST | `/api/tasks` | Add a pending task. Library body: `{ scheduleId, activityId }`; custom alternative: `{ scheduleId, name, icon }`. Returns created task. | FR-SCH-02/03/08; FR-TASK-01; UC-04/05 |
| 16 | PUT | `/api/tasks/:id` | Edit timing/order using a nonempty subset of `start_time`, `duration_min`, `position`. Current order is one-based; clearing optional timing uses null. Returns updated task. | FR-SCH-04/05; UC-04/05 |
| 17 | DELETE | `/api/tasks/:id` | Remove task and resequence remaining positions. Returns `{ success: true }`. | FR-SCH-06; UC-04/05 |
| 18 | PATCH | `/api/tasks/:id/complete` | Body `{ done: true }` marks done and records `completed_at`; `{ done: false }` undoes completion and clears that timestamp. Returns updated task. Used by both Staff and Child views. | FR-TASK-01/02/03/04; FR-CHD-04/05/06; UC-05/06 |

Task status, completion time and order are returned within schedule reads; the SRS does not list a separate GET `/api/tasks` endpoint. Timer display/sound use task duration and preferences without requiring a timer route.

## Picture cards — 4 endpoints

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 19 | GET | `/api/cards?childId=:childId` | Return shared defaults and that child's custom cards. Current response groups them into Food, Emotions, Activities and Needs. Optional `includeHidden=true` supports staff management. | FR-COMM-01/02; FR-CHD-07; UC-07/08 |
| 20 | POST | `/api/cards` | Create owned custom card. Body: `{ childId, label, category, icon }`. Returns created card. Icon must be predefined. | FR-COMM-06; UC-08 |
| 21 | PATCH | `/api/cards/:id` | Hide/unhide an owned custom card using `{ hidden: true }` or `{ hidden: false }`. Returns updated card. Does not edit label/category/icon. | FR-COMM-07; UC-08 |
| 22 | DELETE | `/api/cards/:id` | Delete an owned custom card; shared defaults cannot be deleted. Returns `{ success: true }`. | FR-COMM-07; UC-08 |

Tapping a card, speaking its label/phrase and clearing the sentence bar run in the browser. They do not require a speech, phrase or card-tap endpoint (FR-COMM-03/04/05; UC-07).

## Progress — 1 endpoint

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 23 | GET | `/api/progress/:childId?range=7d` | Return today's done/total/percentage, `last_7_days` and `recent_completions` with dates/times for an owned child. Current API uses UTC calendar days and supports only `7d`. | FR-PROG-01/02/03; UC-09 |

The SRS does not define `/api/dashboard`. A dashboard can combine the child list with per-child schedule/progress responses. An aggregate route would be an implementation choice.

## Settings — 2 endpoints

| # | Method | Endpoint | Purpose and current request/response | SRS trace |
| --- | --- | --- | --- | --- |
| 24 | GET | `/api/settings` | Read authenticated staff preferences. Current response: `{ font_size, contrast, sound_on }`. | FR-SET-02/03/04/05; UC-10 |
| 25 | PUT | `/api/settings` | Save preferences. Current body requires all three fields: `font_size` (`small`/`medium`/`large`), `contrast` (`normal`/`high`), `sound_on` (boolean). Returns preferences. | FR-SET-02/03/04/05; UC-10 |

FR-SET-05 permits browser storage or database persistence. These two endpoints are nevertheless explicitly included in section 6.2. Staff profile editing is handled by `/api/auth/me`, not by `/api/settings`.

## Requirements without an additional named endpoint

This table covers behavior outside the 25-route list so optional requirements are not mistaken for existing API contracts.

| SRS requirement | API implication |
| --- | --- |
| FR-AUTH-05/07: protect routes/pages; reject expired tokens | Authentication middleware plus frontend session handling. Existing protected requests return `401`; no extra route is named. |
| FR-AUTH-06: logout | Explicitly clears the stored token. No server logout route is listed or required by that wording. |
| FR-AUTH-08: Remember me — Could | Session-storage behavior; no refresh/session-management endpoint is specified. |
| FR-CHILD-05; FR-SCH-07: avatars and category colors | Predefined values in existing profile/activity contracts and frontend rendering. No upload or color endpoint. |
| FR-SCH-03/10: drag-and-drop, Add button, preview | Client interaction/draft rendering; persisted changes use schedule/task routes. No separate preview route. |
| FR-TASK-06/07: countdown and end sound — Could | Browser timer/audio using `duration_min` and sound preferences. No start/pause/stop timer endpoint is specified. |
| FR-CHD-01–08: child entry, Now/Next, Done, feedback, progress, safe navigation/exit | Reuse staff authentication, schedule read and completion routes; remaining behavior is UI. No child login, child session or separate Done route. |
| FR-CHD-08 optional exit PIN; section 12.2 | SRS suggests a PIN but gives no storage/verification API. A server-backed PIN would need an agreed contract; none is specified or implemented. |
| FR-COMM-03/04/05: speech and phrase bar | Browser Web Speech API and local phrase state. No external TTS service or phrase persistence required. |
| FR-COMM-08: configurable voice speed — Could | Browser speech rate. Current settings contract has no voice-speed field; persistence would need an agreed field extension if desired. No route is named in the SRS. |
| FR-COMM-09: card photo upload — Could, explicitly outside MVP | No upload endpoint is specified. Section 3 excludes custom image upload/storage for this release. |
| FR-PROG-04: most/least completed tasks over a selected period — Could | Current `range=7d` summary does not return rankings or accept arbitrary periods. Requires an agreed progress-contract extension or new endpoint if included; SRS defines neither. Advanced analytics remain outside the MVP under section 3. |
| FR-SET-01: optional email/role editing | SRS leaves this to the team. Current PATCH `/api/auth/me` changes name only. Email/role mutation would require an agreed validation/contract change. |
| FR-SET-05: persist between sessions | Existing settings routes or browser storage satisfy the permitted storage choices; no separate preferences-session route. |

## Rules that apply across endpoints

- Section 6.2 makes registration and login public and requires a valid token on all other listed routes. The Child view uses the supervising staff member's session (FR-CHD-01); Staff roles share MVP permissions (section 2.3).
- FR-CHILD-06 and section 7.3 require ownership checks on children, schedules, tasks and custom cards. Section 8 adds cross-user isolation tests (NFR-SEC-06), parameterized SQL (NFR-SEC-02) and server input validation (NFR-SEC-03).
- Section 6.2 specifies HTTP codes `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500` and `{ "error": "message" }`. Listing `403` does not require revealing ownership; current resource handlers use `404` for missing/unowned resources.
- NFR-SEC-01 requires salted password hashes, signed/expiring JWTs and secrets outside source. NFR-SEC-04/05 require configured CORS and environment-based credentials.
- Section 7.3 specifies ISO calendar dates (`YYYY-MM-DD`) and times (`HH:MM`). The SRS does not resolve timezone policy; current progress uses UTC while the demo frontend uses local today.
- NFR-REL-01 requires database persistence across server restarts. A route existing is not evidence that it meets this requirement.
- NFR-PERF-02 requires normal API responses within one second under 20 concurrent users. NFR-PERF-03 requires completion to appear within one second. NFR-REL-02 requires friendly network errors.
- UI/accessibility, responsiveness, HTTPS deployment and usability/SUS requirements constrain implementation and verification; they do not introduce additional API paths.

## Comparison with the implementation

All **25 SRS method/path pairs have route handlers** in the analyzed revision. This is an inventory check, not an assertion of full SRS compliance or live database verification.

| Finding | SRS impact |
| --- | --- |
| Children, schedules and tasks still use the in-memory store; progress derives from it. | NFR-REL-01 persistence is incomplete for those resources. |
| Production card ownership uses SQL children while child CRUD uses memory. | A newly created child's card operations can fail or address inconsistent records. Ownership/data integration needs completion. |
| Child delete removes mock schedules/tasks, but not SQL custom cards. | Section 7.2's full cascade is incomplete. |
| Frontend actions still operate on browser demo data. | The end-to-end workflows in section 9.1 are not yet integrated with the API. |
| Current frontend has no custom-card hide control, although the API implements PATCH `/api/cards/:id`. | FR-COMM-07 includes hide or delete; deletion exists in the UI. The SRS API inventory still includes the hide route. |
| Most/least-completed analytics, voice-speed setting and optional server-backed exit PIN have no complete contracts. | These optional capabilities require decisions before implementation; they do not add invented endpoints to the SRS list. |

The implementation also exposes **GET `/api/health`** as a public operational endpoint, for **26 implemented method/path pairs in total**. Health is not named in the SRS section 6.2 table. Its public access and `503` health response are implementation additions, not extra entries silently counted as SRS endpoints.

For concrete existing payloads, validation and responses, see [Frontend API contracts](FRONTEND_API_CONTRACTS.md). For the currently visible screen requirements, see [Frontend endpoint inventory](FRONTEND_ENDPOINTS.md). That inventory distinguishes 21 current-screen routes from five supporting routes; the SRS explicitly includes 25 routes because it also lists supporting operations and hide/unhide cards, but not health.

## Coverage and verification

The analysis covers all 57 functional requirements in section 4: AUTH (8), CHILD (6), SCH (10), TASK (7), CHD (8), COMM (9), PROG (4), SET (5), plus UC-01 through UC-10. Requirements can share endpoints or require client/server behavior without introducing a new route. Priority belongs to the requirement: a route serving Must and Should features is not a separate endpoint for each priority.

The section 6.2 method/path inventory was checked against the mounted [API routers](../apps/api/src/app.ts) and their [handlers](../apps/api/src/routes/). This report does not change the SRS, add routes, or implement the optional contracts discussed above.
