# Development Team Implementation Report

> **Current status — November 17, 2026:** This revision supersedes the November 16 snapshot. It reflects `main` at `0590a75` (merge of PR #17) after full frontend/backend integration and end-to-end MVP verification. The earlier audit at `157e69e` is historical and no longer describes the product. The per-requirement status below replaces the previous status counts.

**Project:** Web-Based Visual Schedule, Task Management and Communication System for Children with Developmental Delays

**Review/update date:** November 17, 2026 (Asia/Singapore)

**Analyzed application commit:** `0590a759716f89893da5ccf3dd57e776ba5ff8e8`

**Requirements baseline:** [docs/SRS.md](SRS.md), Version 1.0 (Draft), November 13, 2026. This report does not change SRS wording or priorities.

**Audience:** Development, frontend, testing, SRS and research teams

**Tracking issues (upstream `4rbit-society/special-project`):** [#18 Dev Team](https://github.com/4rbit-society/special-project/issues/18) · [#20 Testing Team](https://github.com/4rbit-society/special-project/issues/20) · [#19 Frontend Team](https://github.com/4rbit-society/special-project/issues/19)

## 1. Executive summary

The frontend and backend are integrated. The browser uses the authenticated REST API for authentication, child profiles, activities, schedules, tasks, cards, progress and settings. All **27 mounted method/path combinations** have authenticated client methods and browser call sites, and schedules save atomically with revision-based conflict handling.

The functional MVP defined by SRS §9.1 is implemented and verified on the local system. No failing `Must` functional requirement was found during this verification pass.

| Area | Result |
| --- | --- |
| Workspace typecheck | Passed (shared, API, web) |
| Production build | Passed (shared, API, web) |
| API unit suite | **175 passed**, 2 historical TODOs |
| Database/schema/seed/repository suite | **23 passed** |
| Compiled API + MySQL integration | **3 passed** |
| Frontend unit suite | **9 passed** |
| Playwright connected browser suite | **15 passed** |
| Live endpoint smoke test | **30/30 checks** across all 27 endpoints |
| Direct database verification | Users, children, schedules, tasks, cards and settings rows confirmed |
| Restart persistence | Profile, child, schedule, task and settings data survived an API restart |
| Browser UI | Login, dashboard, progress, child view and picture-board phrase/TTS flow verified; no console errors or failed requests |

### What remains

The remaining SRS work is **verification and measurement**, not known functional defects, plus optional `Could` development and frontend polish:

- **Dev team:** optional SRS `Could` features and deployment configuration — [#18](https://github.com/4rbit-society/special-project/issues/18).
- **Testing team:** usability/SUS, performance/load, cross-browser/device, accessibility and audible-TTS verification — [#20](https://github.com/4rbit-society/special-project/issues/20).
- **Frontend team:** favicon, focus visibility, touch targets, contrast coverage and 360 px layout — [#19](https://github.com/4rbit-society/special-project/issues/19).

### Database compatibility note

Local integration used **MariaDB 11.8** while CI uses **MySQL 8.0**. MySQL-only `FOR SHARE` was replaced locally with the equivalent `LOCK IN SHARE MODE` in `apps/api/src/db/feature-data.ts` to run the integration suite; that one-line change is not part of this documentation PR. Supporting or documenting both database targets is tracked in [#18](https://github.com/4rbit-society/special-project/issues/18).

## 2. Verification evidence

### 2.1 Executed checks

| Check | Result and boundary |
| --- | --- |
| `npm run typecheck` | All three workspaces passed. |
| `npm run build` | Shared package, API compilation and Vite production build passed. |
| `npm test -w @starter/api` | 15 files, 175 passed, 2 TODO. Includes the SRS §9.1 acceptance spec at the API level. |
| `npm run test:database -w @starter/api` | 4 files, 23 passed against a dedicated `*_test` database. |
| `npm run test:integration -w @starter/api` | 3 passed: restart persistence/ownership/cascades, failed-copy rollback, atomic draft save with completion preservation. |
| `npm test -w @starter/web` | 3 files, 9 passed (client, session, date). |
| `npm run test:e2e -w @starter/web` | 15 passed in Chromium. Covers all 27 endpoints, desktop CRUD, reload persistence, preview, completion, cards, settings, copy/date/delete, logout, expiry, unreachable API, failed-save recovery, 390 px mobile and account isolation. |
| Live API smoke | 30/30 checks covering every endpoint, validation/auth guard, atomic save, copy, progress, cards and settings. |
| Direct SQL verification | Schema has 7 tables; seeded 11 activities, 10 default cards, 3 demo children/schedules and 15 tasks. API writes and cascades confirmed. |
| Restart persistence | API stopped and restarted; authenticated reads returned the previous profile, child, scheduled tasks, progress and settings. |
| Manual browser flows | Login, dashboard, progress and child view rendered live data; picture board built `"I want water"`, invoked TTS for the card and full phrase, and cleared correctly. |

### 2.2 Not performed in this pass

- Timed usability study or SUS questionnaire.
- Performance/load benchmark at 20 concurrent users.
- Cross-browser matrix (Firefox, Safari, Edge) and real-device testing.
- Formal WCAG contrast, keyboard-only or screen-reader audit.
- Audible TTS verification on physical devices; browser speech calls were verified, not speaker output.
- Live HTTPS deployment.

These are assigned to the Testing Team in [#20](https://github.com/4rbit-society/special-project/issues/20).

### 2.3 Reproduce

```sh
npm install
npm run db:schema
npm run db:seed
npm run typecheck
npm run build
npm test -w @starter/api
npm run test:database -w @starter/api
npm run test:integration -w @starter/api
npm test -w @starter/web
npm run test:e2e -w @starter/web
```

Database-backed commands require the dedicated test configuration documented in [README.md](../README.md). Database-resetting suites must never run against application data.

## 3. SRS requirement status

Status definitions:

- **Verified** — implemented and covered by an automated or browser-level check.
- **Implemented, not independently measured** — present in source/UI, but no direct automated or measurement evidence for the stated quality.
- **Partially verified** — the mechanism works, but the SRS quality target is not yet measured.
- **Not implemented** — absent; allowed where the SRS priority is `Could` or explicitly out of MVP.
- **Not verified** — no evidence for a measurement/process target.

### 3.1 Authentication and account (FR-AUTH)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-AUTH-01 | Verified | Registration API + browser registration flow. |
| FR-AUTH-02 | Verified | Zod validation, duplicate-email 409, Unicode 72-byte boundary tests. |
| FR-AUTH-03 | Verified | bcrypt cost 12; password hashes never returned. |
| FR-AUTH-04 | Verified | Login issues an 8-hour HS256 JWT; browser stores and reuses it. |
| FR-AUTH-05 | Verified | All feature routers require a valid token; unauthenticated API returns 401 and browser routes return to login. |
| FR-AUTH-06 | Verified | Logout clears the token and returns to login. |
| FR-AUTH-07 | Verified | Expired/forged token clears cached data and shows the session-expired message. |
| FR-AUTH-08 | Verified | Remember me uses local storage; tab-only sessions remain independent (`Could`). |

### 3.2 Child profile management (FR-CHILD)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-CHILD-01 | Verified | Create child API/UI with name, age, delay domain, notes and avatar. |
| FR-CHILD-02 | Verified | Dashboard lists the authenticated user's children. |
| FR-CHILD-03 | Verified | Edit child API/UI; omissions preserve fields. |
| FR-CHILD-04 | Verified | Confirmed deletion cascades schedules, tasks and custom cards. |
| FR-CHILD-05 | Verified | Predefined avatar set in API validation and UI. |
| FR-CHILD-06 | Verified | Cross-user ownership tests and browser account-switch isolation. |

### 3.3 Visual schedule creator (FR-SCH)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-SCH-01 | Verified | Seeded 11-activity library with icons and categories. |
| FR-SCH-02 | Verified | Create schedule for child/date; duplicate date returns 409. |
| FR-SCH-03 | Implemented, not independently measured | Drag handlers and Add/Move controls exist; Add and Move up are browser-tested, the drag gesture itself is not. |
| FR-SCH-04 | Verified | Reorder via Move up/down and API position updates. |
| FR-SCH-05 | Verified | Optional start time and duration save through the editor and API. |
| FR-SCH-06 | Verified | Remove activity in editor/task status; API delete. |
| FR-SCH-07 | Implemented, not independently measured | Category chips and color styling exist; no automated visual assertion. |
| FR-SCH-08 | Verified | Custom activity with predefined icon in browser flow. |
| FR-SCH-09 | Verified | Copy from date, including copy into a new saved schedule. |
| FR-SCH-10 | Verified | Read-only child-style preview with Done disabled. |

### 3.4 Task management (FR-TASK)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-TASK-01 | Verified | Tasks persist with pending/done status. |
| FR-TASK-02 | Verified | Mark done from Staff task status and Child view. |
| FR-TASK-03 | Verified | `completed_at` stored; progress returns completion history with times. |
| FR-TASK-04 | Verified | Undo completion API/UI. |
| FR-TASK-05 | Verified | Task status page lists tasks and status for child/date. |
| FR-TASK-06 | Not implemented | Optional countdown timer (`Could`); tracked in [#18](https://github.com/4rbit-society/special-project/issues/18). |
| FR-TASK-07 | Not implemented | Optional timer-end sound (`Could`); tracked in [#18](https://github.com/4rbit-society/special-project/issues/18). |

### 3.5 Child interface (FR-CHD)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-CHD-01 | Verified | Signed-in staff opens the Child view; no child login. |
| FR-CHD-02 | Verified | Today's tasks render in order with large icons and labels. |
| FR-CHD-03 | Verified | "Now" and "Next" sections highlight the next pending task. |
| FR-CHD-04 | Verified | One large Done button completes the current task. |
| FR-CHD-05 | Partially verified | Completion and All-done states exist and are browser-tested; animation is not separately asserted. |
| FR-CHD-06 | Verified | "x of y done" indicator and friendly All-done message. |
| FR-CHD-07 | Verified | Child view has no ads, external links or unrelated navigation. |
| FR-CHD-08 | Verified | Exit requires the corner control plus confirmation. |

### 3.6 Picture-based communication (FR-COMM)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-COMM-01 | Verified | Board renders cards with illustration and label. |
| FR-COMM-02 | Verified | Four categories and ten shared default cards. |
| FR-COMM-03 | Partially verified | Card tap invokes browser TTS and shows the label; audible output is not measured. |
| FR-COMM-04 | Verified | Sentence bar builds `"I want water"` and speaks the whole phrase. |
| FR-COMM-05 | Verified | Clear resets the sentence bar. |
| FR-COMM-06 | Verified | Staff add custom card with label, category and predefined icon. |
| FR-COMM-07 | Verified | Hide/unhide and delete own custom card. |
| FR-COMM-08 | Not implemented | TTS voice speed (`Could`); tracked in [#18](https://github.com/4rbit-society/special-project/issues/18). |
| FR-COMM-09 | Not implemented | Photo upload is marked out of MVP; confirm exclusion in [#18](https://github.com/4rbit-society/special-project/issues/18). |

### 3.7 Progress tracking (FR-PROG)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-PROG-01 | Verified | Dashboard shows today's done/total and percentage per child. |
| FR-PROG-02 | Verified | Seven-day completion summary on dashboard and Progress page. |
| FR-PROG-03 | Verified | Recent completions include date/time; progress API returns the history. |
| FR-PROG-04 | Not implemented | Most/least-completed analytics (`Could`); tracked in [#18](https://github.com/4rbit-society/special-project/issues/18). |

### 3.8 Settings and accessibility (FR-SET)

| ID | Status | Evidence |
| --- | --- | --- |
| FR-SET-01 | Verified | Profile name update; email/role remain read-only. |
| FR-SET-02 | Verified | Font size small/medium/large persists and applies. |
| FR-SET-03 | Verified | Normal/high-contrast theme persists and applies. |
| FR-SET-04 | Verified | Sound setting persists; picture cards still speak when intentionally tapped and timer cues are explicitly not in the MVP. |
| FR-SET-05 | Verified | Settings persist in MySQL and survive restart. |

### 3.9 Use cases (UC)

| ID | Status | Evidence |
| --- | --- | --- |
| UC-01, UC-02 | Verified | Register, login and logout browser/API flows. |
| UC-03 | Verified | Child profile CRUD and isolation. |
| UC-04, UC-05 | Verified | Schedule create/copy/save, task add/reorder/timing/remove, preview. |
| UC-06 | Verified | Child view completion persists after reload. |
| UC-07 | Partially verified | Card tap and phrase speech are invoked; device audibility is pending. |
| UC-08 | Verified | Card add/hide/delete. |
| UC-09 | Verified | Dashboard today + 7-day summary + recent completions. |
| UC-10 | Verified | Profile, font size, contrast and sound settings. |

### 3.10 User interface (UI)

| ID | Status | Evidence |
| --- | --- | --- |
| UI-01 | Partially verified | 390 px mobile and 1440 px desktop verified; 360 px/tablet matrix pending. |
| UI-02 | Not verified | 44×44 px targets and 16 px body text are not systematically measured. |
| UI-03 | Verified | Child view uses large icons, minimal text and one primary action. |
| UI-04 | Verified | Staff navigation to Dashboard, Profiles, Schedules, Progress and Settings. |
| UI-05 | Implemented, not independently measured | Status uses text/icons as well as color; no formal audit. |
| UI-06 | Verified | Plain-language error and success messages observed in browser flows. |

### 3.11 Non-functional requirements

| ID | Status | Evidence / remaining work |
| --- | --- | --- |
| NFR-USE-01 | Not verified | No timed onboarding study. |
| NFR-USE-02 | Verified | One-tap Done on the Child main screen. |
| NFR-USE-03 | Not verified | No SUS study (target ≥ 68). |
| NFR-ACC-01 | Partially verified | High-contrast option exists; contrast ratio not measured. |
| NFR-ACC-02 | Partially verified | Modal keyboard focus/escape tested; full keyboard audit pending. |
| NFR-ACC-03 | Implemented, not independently measured | Alt text/labels present; screen-reader audit pending. |
| NFR-PERF-01 | Not verified | No page-load benchmark. |
| NFR-PERF-02 | Not verified | No 20-concurrent-user API benchmark. |
| NFR-PERF-03 | Not verified | No measured completion-to-screen latency target. |
| NFR-SEC-01 | Verified | bcrypt hashing, env-held JWT secret, 8-hour expiry. |
| NFR-SEC-02 | Verified by review | Parameterized MySQL queries throughout feature access. |
| NFR-SEC-03 | Partially verified | Server-side Zod validation and React rendering; no dedicated XSS audit. |
| NFR-SEC-04 | Verified | CORS restricted to the configured frontend origin. |
| NFR-SEC-05 | Verified | Secrets live in ignored `.env` files; templates committed. |
| NFR-SEC-06 | Verified | Cross-user isolation tests and account-switch browser flow. |
| NFR-REL-01 | Verified | API restart persistence. |
| NFR-REL-02 | Verified | Unreachable API shows an error with retry. |
| NFR-COMP-01 | Not verified | Chromium only; Firefox/Safari/Edge and 360 px pending. |
| NFR-MAIN-01 | Verified | TypeScript workspaces with frontend/backend/shared separation. |
| NFR-MAIN-02 | Verified | README setup, env template and schema script. |
| NFR-MAIN-03 | Verified | Feature-group commits present in history. |
| NFR-DEP-01 | Verified | Frontend, API and MySQL run locally. |
| NFR-DEP-02 | Partially verified | README deployment guidance exists; no deployment configuration or live HTTPS. Tracked in [#18](https://github.com/4rbit-society/special-project/issues/18). |

## 4. MVP acceptance matrix (SRS §9.1)

| # | Acceptance criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Staff register, log in and log out | Verified | API suite, live smoke, browser flows. |
| 2 | Create/edit/delete own child profiles and see only own children | Verified | API ownership tests, browser CRUD and account-switch isolation. |
| 3 | Create a schedule, add/reorder/remove activities and save | Verified | Atomic save, editor flows, API tests, manual smoke. |
| 4 | Child view completes tasks and persists after reload | Verified | Mobile/desktop completion persists after reload. |
| 5 | Communication board speaks a card and builds a phrase | Verified (speech invocation) | Manual browser check: `"I want water"` spoken; device audibility pending. |
| 6 | Dashboard shows today's completion and 7-day summary | Verified | Dashboard screenshot, Progress tests. |
| 7 | Usable on phone-sized and desktop-sized screens | Verified for 390 px and desktop | 390 px no-overflow assertion; 1440 px browser run. 360 px/tablet pending. |

## 5. Remaining work split by team

### 5.1 Dev team — issue #18

[Complete remaining SRS development work](https://github.com/4rbit-society/special-project/issues/18)

- Decide and document the remaining `Could` scope:
  - `FR-TASK-06` countdown timer.
  - `FR-TASK-07` timer-end sound cue.
  - `FR-COMM-08` TTS voice speed.
  - `FR-PROG-04` most/least-completed analytics.
  - `FR-COMM-09` photo upload (confirm out-of-MVP exclusion).
- `NFR-DEP-02`: add deployment configuration and a short deployment plan (container/compose or documented host setup, HTTPS guidance, environment template).
- Confirm MySQL 8 as the supported database and add a MariaDB compatibility CI job, or document MySQL-only support.

### 5.2 Testing team — issue #20

[Complete remaining SRS verification](https://github.com/4rbit-society/special-project/issues/20)

- `NFR-USE-01/03`: timed task-based usability study and SUS (target ≥ 68, goal 80).
- `NFR-PERF-01/02/03`: page load, API latency at 20 concurrent users, completion latency.
- `NFR-COMP-01`: Chrome, Edge, Firefox, Safari; 360 px phone, tablet, desktop.
- `NFR-ACC-01/02/03` + `UI-02`: contrast, keyboard, screen reader, focus, 44×44 px targets, 16 px body text, alt text.
- `FR-COMM-03` / `UC-07` / §9.1.5: audible TTS on real devices and the unavailable-voice fallback.
- `FR-SCH-03`: drag-and-drop plus Add/Move controls on touch devices.
- §9.2: dated manual pass/fail record and evidence-based SRS status updates.

### 5.3 Frontend team — issue #19

[Frontend polish and accessibility improvements](https://github.com/4rbit-society/special-project/issues/19)

- Add a favicon/app icon; first load currently logs a `/favicon.ico` 404.
- Add consistent `:focus-visible` styling.
- Audit and fix targets below 44×44 px and body text below 16 px.
- Ensure the high-contrast theme covers staff pages, the schedule editor and the child view.
- Verify/fix 360 px and tablet layouts, including overflow.
- Respect `prefers-reduced-motion` where applicable.
- Extend Playwright coverage for 360 px and focus visibility.

> **Label note:** Upstream issues were created with team names in the title and a `Team` section in the body. The authenticated account has read/PR access only on `4rbit-society/special-project`, so repository labels and custom `team:*` tags could not be attached; a maintainer should add them.

## 6. Known limits and decisions

1. **TTS audibility is not proven.** The browser speech API is called with the correct card and phrase text, but speaker output and voice availability depend on the device/browser.
2. **Performance and usability targets are unmeasured.** Passing tests do not establish NFR-PERF or NFR-USE thresholds.
3. **The accessibility review is functional, not a certification.** Keyboard behavior, contrast and alt text need a formal audit.
4. **Only Chromium was exercised.** Firefox, Safari, Edge and real touch devices remain unverified.
5. **SRS is still a draft.** The eight open items in SRS §12 still require team confirmation.
6. **Optional scope is intentional.** The five non-implemented functional requirements are all `Could` or explicitly out of MVP.
7. **Local DB compatibility patch is uncommitted.** Upstream remains MySQL-8-oriented until [#18](https://github.com/4rbit-society/special-project/issues/18) is resolved.

## 7. Issue references

| Issue | Team | Scope |
| --- | --- | --- |
| [#18](https://github.com/4rbit-society/special-project/issues/18) | Dev team | Remaining SRS `Could` features, deployment configuration, database compatibility. |
| [#20](https://github.com/4rbit-society/special-project/issues/20) | Testing team | Usability/SUS, performance, cross-browser/device, accessibility, audible TTS, formal acceptance record. |
| [#19](https://github.com/4rbit-society/special-project/issues/19) | Frontend team | Favicon, focus visibility, touch targets, contrast coverage, 360 px/tablet layout, reduced motion. |

## 8. Revision history

| Date | Change |
| --- | --- |
| November 16, 2026 | Snapshot audit at `157e69e`; frontend/backend integration was incomplete. |
| November 17, 2026 | Re-audit at `0590a75`; full integration and MVP verification recorded. Remaining work split into dev, testing and frontend issues #18, #20 and #19. |

No application code or SRS wording was changed for this report update. The one-line MariaDB compatibility change used for local integration is separate from this documentation revision.
