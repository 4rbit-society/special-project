---
analyzed_commit: "4eb8074c66bda543df00e8522866bdbc0b2f853a"
analyzed_at: "2026-11-16"
---

# Endpoint cross-reference: frontend, SRS and backend

This report compares the endpoint reports below with the current frontend call sites and backend router mounts. The commit metadata identifies the analyzed code; compare it with `git rev-parse HEAD` before treating the report as current.

## Reports compared

| Report | What it establishes |
| --- | --- |
| [Frontend endpoint inventory](FRONTEND_ENDPOINTS.md) | 21 method/path pairs needed to connect the existing screens; five additional supporting routes. |
| [SRS endpoint inventory](SRS_ENDPOINTS.md) | 25 method/path pairs explicitly listed in SRS section 6.2, including supporting operations. |
| [Current backend endpoints](BACKEND_ENDPOINTS.md) | 26 implemented method/path pairs, their contracts and actual data stores. |
| [Frontend API contracts](FRONTEND_API_CONTRACTS.md) | Current request/response fields, validation and error behavior. |
| [Frontend integration handoff](FRONTEND_API_INTEGRATION.md) | Adapters, unresolved contracts, draft-save behavior and integration order. |

All five source reports carry the same analyzed commit hash as this report. Their source files are [the SRS](SRS.md), [frontend components](../apps/web/src/), [API mounts](../apps/api/src/app.ts), [route handlers](../apps/api/src/routes/) and [validation schemas](../packages/shared/src/schemas.ts).

## Coverage summary

Counts refer to distinct HTTP method/path pairs; different query values and alternative bodies do not create additional endpoints.

| Measure | Count | Meaning |
| --- | --- | --- |
| Union of the three endpoint inventories | 26 | Every listed endpoint exists in the backend. |
| SRS-listed endpoints implemented | 25 / 25 | Route names/methods match. This does not establish full requirement compliance. |
| Current-screen required endpoints implemented | 21 / 21 | Every route needed by the current frontend has a handler. |
| Endpoints called by current frontend screens | **0 / 26** | Screens use local demo state; backend availability is not a frontend connection. |
| Required screen integrations still unwired | **21** | Requests, authenticated state, adapters and failure handling need implementation. |
| SRS-listed routes without a required current-screen action | 4 | Single-child read, schedule date update, schedule delete, card visibility update. |
| Backend-only operational addition to the SRS | 1 | GET `/api/health`; frontend helper exists but is unused by screens. |
| Named SRS/frontend-required routes missing from backend | **0** | Missing capabilities and contract fields remain; see below. |

**Connected** means a rendered frontend workflow actually calls the backend route. A matching path, an implemented route, a local action with the same purpose, or an unused helper does not count. The only `fetch` in `apps/web/src` is inside `getHealth` in [lib/api.ts](../apps/web/src/lib/api.ts); no screen imports/calls that helper. Runtime connections are therefore absent even where contracts already match.

## Complete endpoint matrix

Reference numbers `SRS #` and `BE #` match numbered rows in the SRS/backend reports. Frontend IDs match its required-endpoint table. `Support` means the frontend report lists the route as supporting, with no required current-screen request. All backend routes below are implemented.

`SQL`/`Memory` identify feature storage in the default app. Every protected route still authenticates against SQL users. Issue IDs refer to the alignment register below; **C01 affects every row**.

| # | Method | Endpoint | SRS # | Frontend reference / consumer | BE # / storage | Connected | Alignment notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | POST | `/api/auth/register` | 1 | AUTH-01 / Register | 2 / SQL | No | C02: registration returns user, not token; role must be sent. |
| 2 | POST | `/api/auth/login` | 2 | AUTH-02 / Login | 3 / SQL | No | C02: credentials/token/session are not handled by UI. |
| 3 | GET | `/api/auth/me` | 3 | AUTH-03 / startup, header, Settings | 4 / SQL | No | C02, C12: no session restore; header/profile values are demo data. |
| 4 | PATCH | `/api/auth/me` | 4 | AUTH-04 / staff name | 5 / SQL | No | C12: name is saved locally; combined Settings action needs separate mutation results. |
| 5 | GET | `/api/children` | 5 | CHILD-01 / dashboard, profiles, selectors | 6 / Memory | No | C03, C09, C10: DTOs, ownership fixtures and storage need alignment. |
| 6 | POST | `/api/children` | 6 | CHILD-02 / Add child | 7 / Memory | No | C03, C04, C09, C10: frontend avatars are rejected; new records do not enter SQL. |
| 7 | GET | `/api/children/:id` | 7 | Support / fresh selected-child read | 8 / Memory | No | C03, C09, C10, C13; list data can serve current UI without this request. |
| 8 | PUT | `/api/children/:id` | 8 | CHILD-03 / Edit child | 9 / Memory | No | C03, C04, C09: adapt profile fields/avatars and persistence. |
| 9 | DELETE | `/api/children/:id` | 9 | CHILD-04 / Delete child | 10 / Memory | No | C09, C10: local delete removes cards; backend does not perform SQL card cascade. |
| 10 | GET | `/api/activities` | 10 | ACT-01 / activity library | 11 / static Memory library | No | C03, C05: IDs/icons/categories and catalog differ from hardcoded UI library. |
| 11 | GET | `/api/schedules?childId=:childId&date=YYYY-MM-DD` | 11 | SCH-01 / editor, task status, Child My day, dashboard | 12 / Memory | No | C03, C07, C08, C09, C11: shape, draft baseline, missing schedule and date handling. |
| 12 | POST | `/api/schedules` | 12 | SCH-02 / new day, optional copy | 13 / Memory | No | C07, C08, C09: creation/copy persists immediately, not as an unsaved replacement draft. |
| 13 | PUT | `/api/schedules/:id` | 13 | Support / schedule date change | 14 / Memory | No | C07, C09, C13: body changes date only; it cannot save the editor task array. |
| 14 | DELETE | `/api/schedules/:id` | 14 | Support / delete complete schedule | 15 / Memory | No | C09, C13: no current delete-schedule control. |
| 15 | POST | `/api/tasks` | 15 | TASK-01 / save added library/custom activity | 16 / Memory | No | C03, C05, C06, C07, C09: numeric refs, valid icon, no persisted custom category, independent write. |
| 16 | PUT | `/api/tasks/:id` | 16 | TASK-02 / save timing/order | 17 / Memory | No | C03, C07, C09: timing/null/position mapping; maximum duration differs from UI validation. |
| 17 | DELETE | `/api/tasks/:id` | 17 | TASK-03 / save task removal | 18 / Memory | No | C07, C09: local removal is a draft operation; API deletion persists immediately. |
| 18 | PATCH | `/api/tasks/:id/complete` | 18 | TASK-04 / Staff and Child Done/undo | 19 / Memory | No | C03, C09, C11: retain server completion time, wait/reconcile failures and refresh summaries. |
| 19 | GET | `/api/cards?childId=:childId` | 19 | CARD-01 / Talk, custom-card management | 20 / SQL | No | C03, C05, C10: grouped response/defaults, catalog mismatch and SQL child ownership. |
| 20 | POST | `/api/cards` | 20 | CARD-02 / Add picture card | 21 / SQL | No | C03, C05, C10: semantic icon codes are rejected; Help needs agreed code. |
| 21 | PATCH | `/api/cards/:id` | 21 | Support / hide or unhide owned custom card | 22 / SQL | No | C10, C13: backend route exists; UI has no hide/unhide control. |
| 22 | DELETE | `/api/cards/:id` | 22 | CARD-03 / Delete custom card | 23 / SQL | No | C03, C10: local UUIDs cannot identify SQL cards; only owned custom cards are mutable. |
| 23 | GET | `/api/progress/:childId?range=7d` | 23 | PROG-01 / dashboard history, Progress | 24 / Memory-derived | No | C09, C11: UTC window, absent-schedule ambiguity and recent-completion display differ. |
| 24 | GET | `/api/settings` | 24 | SET-01 / preferences bootstrap | 25 / SQL | No | C03, C12: field names/defaults differ; load server values. |
| 25 | PUT | `/api/settings` | 25 | SET-02 / Save settings | 26 / SQL | No | C03, C12: complete snake_case payload; separate profile-name save. |
| 26 | GET | `/api/health` | — | Support / unused `getHealth` helper | 1 / SQL probe | No | C13: optional diagnostics, not SRS-listed; `503` uses health shape, not `{ error }`. |

## Missing connections

These are missing frontend integrations with **existing** routes, not requests to create duplicate backend endpoints.

| Workflow | Required route references | Current frontend behavior |
| --- | --- | --- |
| Register, login and restore session | Matrix 1–3 | Submit navigates into the demo; no JWT/session validation or protected-page enforcement. |
| Staff identity and profile name | Matrix 3–4 | Demo name/local storage; role and settings email are hardcoded. |
| Child profile management | Matrix 5–9, with 7 optional | Local profiles and mutations. |
| Activity library and schedule editor | Matrix 10–12, 15–17 | Hardcoded activities; local draft saved into local storage. |
| Task status and Child My day | Matrix 11, 18 | Local completion and Now/Next progression. |
| Dashboard and Progress | Matrix 5, 11, 23 | Counts and history calculated from seeded local schedules. |
| Custom cards and Talk board | Matrix 19–20, 22 | Hardcoded defaults plus custom cards in local storage. |
| Accessibility preferences | Matrix 24–25 | Local preferences persist in browser only. This is permitted by FR-SET-05, but does not connect the listed API. |

## Alignment register

These findings describe the differences between the reports' requirements and current code. Field-name differences may need adapters; a missing persistence behavior needs backend work. None is resolved solely by having a matching route name.

| ID | Difference / affected routes | What must align |
| --- | --- | --- |
| C01 | All 26 routes are unconnected to screens. | Replace relevant demo actions with authenticated reads/mutations; define loading, success, failure and cache-refresh behavior. An optional supporting route need not be called without a UI need. |
| C02 | Register/login/session (1–3). Frontend skips authentication; API registration returns no token. | Register then login if entering the dashboard immediately; send the selected role enum; restore with `/auth/me`; handle expiry and page protection. Logout clears token/user caches; it needs no new route under the existing contract. |
| C03 | Resource models (5–25) differ. Frontend uses string demo IDs, semantic activity keys, camelCase fields, empty time strings and capitalized categories. | Preserve server numeric IDs and nullable custom `activity_id`; map `delay_domain`, `child_id`, `schedule_date`, `start_time`, `duration_min`, `font_size`, `sound_on`; convert `''` to null where required and categories to their API enums. Retain `completed_at`, `child_id` and `is_hidden`. UI duration validation lacks the API's 1440-minute maximum. |
| C04 | Child avatars (6, 8). UI uses `happy`, `play`, `book`, `sun`; API only accepts animal emoji. | Agree on supported avatar values and a design-asset mapping, or change the allowed schema/UI catalog. Current chosen values cannot be submitted as-is. |
| C05 | Activity/card pictures and defaults (10, 15, 19–20). UI uses SVGs or `help`/`water`/`book` codes; API validates predefined emoji. API includes Eat lunch; UI library does not. UI Read/School and Needs Help/Water defaults differ from backend TV/Toilet defaults. | Use explicit identity/asset adapters and agree on a common catalog. Do not concatenate server defaults with hardcoded defaults. Help needs an agreed accepted icon code; preserve SVG appearance without sending image paths as API icon IDs. |
| C06 | Custom activity category (15). UI chooses/persists a category locally; API create/task response has no category. | Extend the agreed custom task contract/storage or change the UI expectation. For library tasks, join category from `/activities`; don't invent persisted custom category from a missing field. |
| C07 | Schedule Save/Discard (11–17). UI replaces the entire draft locally; backend writes each task independently. PUT `/schedules/:id` accepts date only. | Implement a safe ordered diff/save with partial-failure reconciliation. If all-or-nothing saving is required, agree on a bulk transactional save contract; none exists today. Keep completion state out of plan overwrites. |
| C08 | Copy and preview (11–12). UI copy replaces an unsaved draft; API `copyFrom` only creates a new saved target day. Preview opens today's saved Child view, which can complete real tasks once wired. | Copy source into the local draft and persist only on Save. Isolate draft preview from real completion and honor the selected date. No separate preview endpoint is necessary. |
| C09 | Database persistence (5–9, 11–18, 23). Backend child/schedule/task data is still in memory despite the SRS restart-persistence requirement; UI also has its own unrelated seed. | Use persistent authoritative child/schedule/task storage. Fetch real user data, avoid assuming demo IDs, and verify restart persistence rather than infer it from existing SQL tables. |
| C10 | Child/card storage and deletion (5–9, 19–22). Child CRUD checks memory; cards check SQL children. UI child deletion promises card cleanup; API child deletion does not delete SQL cards. | Unify child identity/ownership and cascade deletion across feature repositories. New API-created children must be usable by card routes; defaults remain read-only. |
| C11 | Progress/completion semantics (11, 18, 23). UI today is local; API today is UTC. API summary cannot distinguish absent vs empty schedules. UI recent completions are today's reversed task order, not actual timestamp-sorted history. | Agree on date policy, use returned completion times and recent history, and use schedule reads/existence metadata when the distinction matters. After completion, refetch/invalidate relevant schedule/dashboard/progress state. |
| C12 | Profile and settings (3–4, 24–25). UI saves name/preferences together locally. API uses two mutations; SQL defaults are medium/normal/on vs UI small/normal/off. | Load actual profile/preferences; translate role labels; show partial-save failures accurately and use the complete settings payload. Preserve browser card speech behavior separately from schedule sound cues. |
| C13 | Supporting UI coverage (7, 13–14, 21, 26). Backend routes have no current required screen action; health only has an unused helper. | Single-child read is optional if list data is cached. Schedule move/delete controls are absent. Card visibility has no control, although delete exists and FR-COMM-07 allows hide or delete. Health is optional diagnostics and should not be counted as connected. |

## Missing endpoints versus missing capabilities

**No explicitly named endpoint is missing** from either the SRS list or the current frontend's required-route list. The remaining gaps below must not be counted as missing existing routes or assumed to have approved paths.

| Capability | Frontend expectation | SRS position | Backend state | Classification |
| --- | --- | --- | --- | --- |
| Atomic plan save | Save schedule submits one local draft; all-or-nothing server behavior would need agreement. | UC-04 requires saving, but section 6.2 does not name a bulk endpoint or explicitly require a transaction. | Only independent schedule/task mutations. | Missing capability if atomic saving is selected. The handoff's proposed PUT `/api/children/:childId/schedules/:date` is **not implemented and not an SRS-listed route**. |
| Persist custom activity category | Present in current custom activity form. | FR-SCH-08 specifies custom name/icon; predefined activities have category under FR-SCH-01. | No custom category field on task input/output. | UI/backend contract gap; no agreed additional route. |
| Most/least completed tasks over selected period | No current control. | FR-PROG-04, Could. | `range=7d` summaries only; no rankings/arbitrary period. | Optional missing analytics contract; no path specified. |
| TTS voice speed setting | Speech currently has a fixed browser rate; no Settings control. | FR-COMM-08, Could. | No persisted rate field in settings. | Optional field/UI extension; no new route inherently needed. |
| Server-backed child exit PIN | Deliberate exit confirmation exists, no PIN. | FR-CHD-08 makes PIN optional; section 12 leaves confirmation open. | No verification/storage contract. | Optional undecided capability; not a missing mandatory route. |
| Photo upload | No upload control. | FR-COMM-09, Could and explicitly outside MVP. | No upload endpoint. | Out of current scope. |
| Edit account email/role | Current fields read-only. | FR-SET-01 permits read-only or editable per team decision. | PATCH `/auth/me` changes name only. | Current read-only choice is compatible; mutation contract needed only if scope changes. |
| Icon/avatar catalog serving | Uses local predefined assets. | Predefined assets required; no catalog endpoint named. | Library and icon/ avatar allowlists are separate; no catalog route. | Shared manifest/contract decision can resolve this without a new HTTP route. |

## Behaviors already local by design

These do not require invented server endpoints to connect the system:

- Card/phrase speech through `window.speechSynthesis`, sentence-bar selection and clearing.
- Menus, category tabs, child/date selection, deletion confirmation and deliberate staff exit.
- Now/Next derivation, completion graphics, category colors and responsive layout.
- Unsaved draft editing, discard and isolated preview.
- Optional browser timers/audio using task duration/preferences.
- Logout by clearing the stored token; no child login is required by the SRS.

These local behaviors do not establish end-to-end API connectivity. For example, speech can work in the demo while the board's card list still needs its server read.

## Integration order and completion evidence

| Order | Work | Evidence needed before marking connected/aligned |
| --- | --- | --- |
| 1 | Agree on authoritative storage, identity/asset adapters and date policy. | A newly created owned child works consistently with schedules and cards; values round-trip without loss. |
| 2 | Wire auth/profile/settings and clear user-scoped data across sessions. | Register/login/restore/expiry/logout work through actual requests; headers use actual user data. |
| 3 | Wire child CRUD, library and schedule reads. | Network responses populate screens; absent schedule differs from request failure; data persists as required. |
| 4 | Implement draft save/copy/discard and completion. | Saved order/timing survive reload, failed saves retain/reconcile drafts, Done/undo round-trip and refresh summaries. |
| 5 | Wire cards and progress. | SQL ownership/default/custom behavior works; created/deleted cards refresh Talk; history matches completion times/date policy. |
| 6 | Add supporting controls only when wanted and decide optional SRS features. | Explicit scope decision and verified controls; do not mark every unused supporting route as a mandatory UI defect. |

This is a documentation cross-reference. The matrix was checked against all 26 backend routes, the 25 SRS entries and the 21 frontend-required entries. No endpoints, connections or runtime behavior are changed by this report.
