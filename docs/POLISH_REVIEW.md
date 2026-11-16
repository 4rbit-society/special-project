# Polish and debugging review

Work branch: `fix/polish-and-debug`.

## Fixes

- Concurrent draft saves previously checked task IDs and order only. A newer timing edit could be overwritten. Schedule responses now include a revision covering editable fields; existing drafts must submit that revision. Stale writes return 409 and preserve the editor draft. Completion changes remain compatible with an open editor. Both mock-route and real-MySQL regressions cover this behavior.
- bcrypt accepts only 72 UTF-8 bytes, while validation previously counted characters. Registration and login now reject oversized byte sequences, including Unicode input. Exactly 72 bytes still works.
- Ordinary unit tests could load the running application's database settings. Unit and database suites now have separate configurations. Database schema/seed/reset helpers require a dedicated `*_test` database, and CI uses the database-specific command.
- The editor previously reset drafts when cached schedule tasks changed. It now keeps the loaded base snapshot, guards navigation/child/date changes and browser unload, and includes pending timing inputs when saving or previewing. Failed writes retain edits. Copy lookup failures are distinguished from missing schedules, and replacing an unsaved draft requires confirmation.
- Clearing the date field could crash date formatting. Empty date input now retains the selected date, and formatting handles invalid values defensively.
- The UI previously chose today using UTC. It now uses the browser's local calendar day and passes that date to progress, fixing missing completion history around midnight. Completion instants remain UTC. API clients that omit the optional progress `date` keep the original UTC default. Automatic day rollover waits while the schedule editor is open to protect drafts.
- An old tab could erase a newer remembered login. Token clearing now checks which token it owns; tab-only sessions remain independent of remembered sessions in other tabs. Storage access failures fall back safely.
- A successful registration followed by failed automatic login previously retried registration and received a duplicate-account error. Retry now logs in to the already-created account.
- Schedule copy/custom dialogs now use modal dialogs with keyboard focus cycling, Escape dismissal and focus restoration. Schedule date/delete controls are available on mobile.
- Speech-engine exceptions and asynchronous failures now show the unavailable-voice message while retaining the child's words. Canceled or interrupted speech does not report a spurious engine failure.

## Validation

Validation used a separate temporary MySQL instance and dedicated databases; the running application's database was untouched.

| Check | Result |
| --- | --- |
| API unit suite | 175 passed; 2 historical TODOs |
| Database/schema/seed/repository suite | 23 passed |
| Compiled API and MySQL integration | 3 passed |
| Frontend client, adapter, session and date tests | 9 passed |
| Connected Chrome browser suite | 12 passed |
| Production build, workspace type checks, patch whitespace check | Passed |

Total: 222 passing tests. Browser coverage includes all 27 endpoint method/path combinations, persisted CRUD, 390px mobile layout/completion, failed-save recovery, expired sessions, account isolation, stale timing conflicts, pending timing saves, empty date handling, canceled navigation, keyboard dialogs, registration/login retry, and simulated synchronous/asynchronous speech failures. Unicode byte-boundary assertions run in the API suite. The existing development frontend returned HTTP 200 and its API health check returned `ok` after validation.

Commands: `npm test -w @starter/api`, `npm run test:database -w @starter/api`, `npm run test:integration -w @starter/api`, `npm test -w @starter/web`, `npm run test:e2e -w @starter/web`, `npm run build`, `npm run typecheck`, and `git diff --check`. Database-backed commands require the dedicated test configuration described in the README. Local browser validation used `E2E_BROWSER_CHANNEL=chrome`.

## Limits

This review cannot establish that every hidden bug is absent. Browser verification uses installed desktop Chrome, including a 390px mobile viewport. Firefox, Safari, real mobile devices, audible speech output, full accessibility, performance under load and production deployment have not been certified. Two historical API-suite TODOs remain for client speech/layout acceptance; browser tests exercise those areas separately, including simulated speech failures, without proving device audibility.

Existing clients editing saved schedules must submit `expectedRevision` from a fresh schedule response. See [the endpoint reference](ENDPOINT_CROSS_REFERENCE.md) and [README test commands](../README.md).
