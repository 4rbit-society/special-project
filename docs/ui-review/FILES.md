# Araw UI implementation file report

Frontend source and visual review files changed for the Araw redesign. All application changes are under `apps/web`.

## Frontend source and review scripts

- `apps/web/src/App.tsx`
- `apps/web/src/ChildView.tsx`
- `apps/web/src/ProgressPage.tsx`
- `apps/web/src/SchedulePages.tsx`
- `apps/web/src/StaffPages.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/motion.css`
- `apps/web/src/araw.css`
- `apps/web/src/auth.css`
- `apps/web/src/child-araw.css`
- `apps/web/src/workspace.css`
- `apps/web/src/components/StaffLayout.tsx`
- `apps/web/src/components/ui.tsx`
- `apps/web/visual-review.mjs`
- `apps/web/visual-staff.mjs`

## Supplied Araw assets copied into the web app

- `apps/web/public/araw/araw-tokens.css`
- `apps/web/public/araw/avatars/avatar-boy-john.svg`
- `apps/web/public/araw/avatars/avatar-caregiver.svg`
- `apps/web/public/araw/avatars/avatar-cat-svg.svg`
- `apps/web/public/araw/avatars/avatar-girl-maya.svg`
- `apps/web/public/araw/backgrounds/auth-cloud-banner-svg.svg`
- `apps/web/public/araw/backgrounds/kpi-wave-blue.svg`
- `apps/web/public/araw/backgrounds/kpi-wave-mint.svg`
- `apps/web/public/araw/backgrounds/kpi-wave-purple.svg`
- `apps/web/public/araw/backgrounds/notched-cloud-panel.svg`
- `apps/web/public/araw/backgrounds/sky-clouds-hills-svg.svg`
- `apps/web/public/araw/brand/araw-sun-logo.svg`
- `apps/web/public/araw/brand/araw-wordmark-lockup.svg`
- `apps/web/public/araw/brand/floating-star.svg`
- `apps/web/public/araw/brand/peeking-sun-clouds.svg`
- `apps/web/public/araw/brand/sunburst-dashes.svg`
- `apps/web/public/araw/icons/icon-check-circle.svg`
- `apps/web/public/araw/icons/icon-child-profiles.svg`
- `apps/web/public/araw/icons/icon-contrast-sun.svg`
- `apps/web/public/araw/icons/icon-dashboard-grid.svg`
- `apps/web/public/araw/icons/icon-delete-trash.svg`
- `apps/web/public/araw/icons/icon-edit-pencil.svg`
- `apps/web/public/araw/icons/icon-email-badge.svg`
- `apps/web/public/araw/icons/icon-eye-view.svg`
- `apps/web/public/araw/icons/icon-home.svg`
- `apps/web/public/araw/icons/icon-lock-badge.svg`
- `apps/web/public/araw/icons/icon-logout.svg`
- `apps/web/public/araw/icons/icon-picture-cards.svg`
- `apps/web/public/araw/icons/icon-plus-add.svg`
- `apps/web/public/araw/icons/icon-progress-bars.svg`
- `apps/web/public/araw/icons/icon-save-disk.svg`
- `apps/web/public/araw/icons/icon-schedules-calendar.svg`
- `apps/web/public/araw/icons/icon-settings-gear.svg`
- `apps/web/public/araw/icons/icon-speaker-sound.svg`
- `apps/web/public/araw/icons/icon-talk-bubble.svg`
- `apps/web/public/araw/icons/icon-text-size.svg`
- `apps/web/public/araw/illustrations/giraffe-mascot-svg.svg`
- `apps/web/public/araw/illustrations/illustration-calendar-clock.svg`
- `apps/web/public/araw/illustrations/illustration-gold-trophy.svg`
- `apps/web/public/araw/illustrations/illustration-mint-hills.svg`
- `apps/web/public/araw/illustrations/illustration-mountain-flag.svg`
- `apps/web/public/araw/illustrations/illustration-purple-clouds.svg`
- `apps/web/public/araw/picture-cards/card-brush-teeth-blue.svg`
- `apps/web/public/araw/picture-cards/card-brush-teeth-pink.svg`
- `apps/web/public/araw/picture-cards/card-eat-breakfast-bowl.svg`
- `apps/web/public/araw/picture-cards/card-eat-breakfast-plate.svg`
- `apps/web/public/araw/picture-cards/card-get-dressed-shirt.svg`
- `apps/web/public/araw/picture-cards/card-toilet.svg`
- `apps/web/public/araw/picture-cards/card-wake-up-clock.svg`
- `apps/web/public/araw/picture-cards/card-wake-up-rings.svg`
- `apps/web/public/araw/picture-cards/card-wake-up-sunrise.svg`
- `apps/web/public/araw/picture-cards/card-wash-hands-bubbles.svg`
- `apps/web/public/araw/picture-cards/card-wash-hands-dispenser.svg`
- `apps/web/public/araw/picture-cards/card-wash-hands-soap.svg`

## Screenshot artifacts

- `docs/ui-review/auth-login-desktop.png`
- `docs/ui-review/auth-login-mobile.png`
- `docs/ui-review/auth-register-desktop.png`
- `docs/ui-review/auth-register-mobile.png`
- `docs/ui-review/auth-register-tablet.png`
- `docs/ui-review/child-day-after-completion.png`
- `docs/ui-review/child-day-desktop.png`
- `docs/ui-review/child-day-mobile.png`
- `docs/ui-review/child-day-tablet.png`
- `docs/ui-review/child-talk-desktop.png`
- `docs/ui-review/child-talk-mobile.png`
- `docs/ui-review/live-login.png`
- `docs/ui-review/staff-cards-desktop.png`
- `docs/ui-review/staff-cards-mobile.png`
- `docs/ui-review/staff-dashboard-desktop.png`
- `docs/ui-review/staff-dashboard-mobile.png`
- `docs/ui-review/staff-profiles-desktop.png`
- `docs/ui-review/staff-progress-desktop.png`
- `docs/ui-review/staff-schedules-desktop.png`
- `docs/ui-review/staff-schedules-tablet.png`
- `docs/ui-review/staff-settings-desktop.png`
- `docs/ui-review/staff-task-status-desktop.png`

## Verification

- Frontend unit tests: 4 files, 12 tests passed.
- API regression tests: 15 files, 178 tests passed and 2 marked todo.
- Frontend TypeScript check and full production build passed on the target repository's current `main` branch.
- Mocked Playwright browser reviews passed for authentication, staff, child day, Talk, settings, task completion, navigation, and responsive widths. Run the web dev server on port 5178, then run `node visual-review.mjs` and `node visual-staff.mjs` from `apps/web`. Pass a different base URL as the first argument when using another port.
- Real database backed Playwright tests were not run because `apps/api/.env.test` is absent.
- No backend source, API contract, schema, migration, authentication, or authorization files were edited for this UI work.
- Backend and Docker files from the separate local worktree are excluded from this UI commit.

This file itself is `docs/ui-review/FILES.md`.
