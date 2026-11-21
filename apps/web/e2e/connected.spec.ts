import { test, expect, type Page } from '@playwright/test';
const password = 'browser-password-123';
const email = () => `e2e-${process.env.E2E_RUN_ID}-${Date.now()}@special-project.invalid`;
async function register(page: Page) {
  await page.goto('/#register');
  await page.getByLabel('Name', { exact: true }).fill('Browser Caregiver');
  await page.getByLabel('Email', { exact: true }).fill(email());
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Araw', exact: true })).toBeVisible({ timeout: 15_000 });
}

async function addFromLibrary(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await page.getByRole('dialog', { name: 'Activity library' }).locator('.schedule-library-item')
    .filter({ has: page.getByText(name, { exact: true }) }).getByRole('button', { name: 'Add', exact: true }).click();
}

async function openScheduleOption(page: Page, name: string) {
  await page.getByRole('button', { name: 'Schedule options', exact: true }).click();
  await page.getByRole('menuitem').filter({ has: page.getByText(name, { exact: true }) }).click();
}

test('all mounted endpoints support a persisted browser workflow', async ({ page }) => {
  const endpoints = new Set<string>();
  page.on('request', (request) => { const path = new URL(request.url()).pathname; if (path.startsWith('/api/')) endpoints.add(`${request.method()} ${path.replace(/\/\d+(?=\/|$)/g, '/:id')}`); });
  page.on('dialog', (dialog) => { void dialog.accept(); });
  await register(page);
  await page.getByRole('button', { name: 'Add your first child' }).click();
  await page.getByLabel('Name or nickname').fill('River');
  await page.getByLabel('Age', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Save child', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'River', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create schedule', exact: true }).click();
  await addFromLibrary(page, 'Brush teeth');
  await addFromLibrary(page, 'Play');
  await page.getByRole('button', { name: 'Save schedule', exact: true }).first().click();
  await expect(page.getByText('Schedule saved', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.schedule-task')).toHaveCount(2);
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await page.getByRole('button', { name: 'Custom activity', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Unsaved preview');
  await page.getByRole('dialog').getByRole('button', { name: 'Add activity', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Activity library' }).getByText('Unsaved preview', { exact: true })).toBeVisible();
  await page.getByRole('dialog', { name: 'Activity library' }).getByRole('button', { name: 'Done', exact: true }).click();
  await openScheduleOption(page, 'Preview');
  await expect(page.getByRole('dialog', { name: 'Preview' }).getByRole('list').getByText('Unsaved preview', { exact: true })).toBeVisible();
  await expect(page.locator('.child-done-button')).toBeDisabled();
  await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
  await expect(page.locator('.schedule-task')).toHaveCount(3);
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await page.getByRole('button', { name: /Open Task status/ }).click();
  await page.getByRole('combobox', { name: 'Add activity', exact: true }).selectOption({ label: 'Wake up' });
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await expect(page.locator('.schedule-status-row')).toHaveCount(3);
  await page.locator('.schedule-status-row').last().getByRole('button', { name: 'Move up', exact: true }).click();
  await expect(page.locator('.schedule-status-row').nth(1)).toContainText('Wake up');
  await page.locator('.schedule-status-row').filter({ hasText: 'Wake up' }).getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.locator('.schedule-status-row')).toHaveCount(2);
  await page.locator('.schedule-status-row').filter({ hasText: 'Play' }).getByRole('button', { name: 'Mark done', exact: true }).click();
  await expect(page.locator('.schedule-status-row').filter({ hasText: 'Play' }).getByRole('button', { name: 'Undo completion' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Child view', exact: true }).click();
  await page.locator('.child-done-button').click();
  await expect(page.getByRole('heading', { name: /All done/ })).toBeVisible();
  await page.getByRole('button', { name: 'Return to staff workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Return to staff workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Progress', exact: true }).click();
  await expect(page.locator('.staff-progress-page time')).toHaveCount(2);
  await page.getByRole('button', { name: 'Child Profiles', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Notes (optional)').fill('Saved through the API');
  await page.getByRole('button', { name: 'Save child', exact: true }).click();
  await page.getByRole('button', { name: 'Manage picture cards', exact: true }).click();
  await page.getByLabel('Word to speak').fill('Need help');
  await page.getByRole('button', { name: 'Add card', exact: true }).click();
  await expect(page.getByText('Card saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hide Need help', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show Need help', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show Need help', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Need help', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete Need help', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Updated Caregiver');
  await page.getByRole('radio', { name: /Large/ }).check();
  await page.getByRole('radio', { name: 'High contrast', exact: true }).check();
  await page.getByRole('radio', { name: 'Fast', exact: true }).check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings saved', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Updated Caregiver');
  await expect(page.getByRole('radio', { name: /Large/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Fast', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Open Child view', exact: true }).click();
  const highContrastChild = page.locator('.child-view--high-contrast');
  await expect(highContrastChild).toHaveCSS('background-image', /sky-clouds-hills-svg\.svg/);
  await expect(highContrastChild.locator('.child-activity--done').first()).toHaveCSS('background-color', 'rgb(228, 253, 228)');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Picture cards', exact: true })).toBeVisible();
  await expect(highContrastChild).toHaveCSS('background-image', /sky-clouds-hills-svg\.svg/);
  await page.getByRole('button', { name: 'Return to staff workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Return to staff workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Schedules', exact: true }).click();
  await openScheduleOption(page, 'Date');
  const sourceDate = await page.getByLabel('Date', { exact: true }).inputValue();
  await page.getByLabel('Date', { exact: true }).fill('2099-12-20');
  await page.getByRole('button', { name: 'Go to date', exact: true }).click();
  await openScheduleOption(page, 'Copy from date');
  await page.getByRole('dialog').getByLabel('Source date').fill(sourceDate);
  await page.getByRole('button', { name: 'Copy schedule', exact: true }).click();
  await expect(page.getByText('Copied schedule saved', { exact: true })).toBeVisible();
  await page.getByLabel('Move saved schedule to date').fill('2099-12-21');
  await page.getByRole('button', { name: 'Change date', exact: true }).click();
  await openScheduleOption(page, 'Date');
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2099-12-21');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Delete schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete schedule', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Child Profiles', exact: true }).click();
  await page.locator('.staff-profile-delete').click();
  await page.getByRole('button', { name: 'Delete River', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'River', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Log out', exact: true }).first().click();
  await page.goto('/#dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  const expected = ['GET /api/health','POST /api/auth/register','POST /api/auth/login','GET /api/auth/me','PATCH /api/auth/me','GET /api/children','POST /api/children','GET /api/children/:id','PUT /api/children/:id','DELETE /api/children/:id','GET /api/activities','POST /api/activities','GET /api/schedules','POST /api/schedules','PUT /api/schedules','PUT /api/schedules/:id','DELETE /api/schedules/:id','POST /api/tasks','PUT /api/tasks/:id','DELETE /api/tasks/:id','PATCH /api/tasks/:id/complete','GET /api/cards','POST /api/cards','PATCH /api/cards/:id','DELETE /api/cards/:id','GET /api/progress/:id','GET /api/progress/:id/activities','GET /api/settings','PUT /api/settings'];
  expect([...endpoints]).toEqual(expect.arrayContaining(expected));
});
test('expired sessions clear cached user data and return to login', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('araw-session-token-v1', 'forged-token'));
  await page.goto('/#profiles');
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  await expect(page.getByText('Your session expired. Please log in again.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('araw-session-token-v1'))).toBeNull();
});
test('an unreachable API is shown as an error and can be retried', async ({ page }) => {
  await register(page);
  await page.route('**/api/activities', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Cannot reach the server');
  await page.unroute('**/api/activities');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Araw', exact: true })).toBeVisible({ timeout: 15_000 });
});

test('mobile completion persists and signing into another account shows no previous children', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page);
  await page.getByRole('button', { name: 'Add your first child' }).click();
  await page.getByLabel('Name or nickname').fill('Mobile Child');
  await page.getByRole('button', { name: 'Save child', exact: true }).click();
  await page.getByRole('button', { name: 'Create schedule', exact: true }).click();
  await addFromLibrary(page, 'Brush teeth');
  await page.getByRole('button', { name: 'Save schedule', exact: true }).last().click();
  await expect(page.getByText('Schedule saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Open Child view', exact: true }).click();
  await page.locator('.child-done-button').click();
  await expect(page.getByRole('heading', { name: /All done/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /All done/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('mobile-child.png'), fullPage: true });
  await page.getByRole('button', { name: 'Return to staff workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Return to staff workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Log out', exact: true }).click();
  await register(page);
  await expect(page.getByText('Mobile Child', { exact: true })).toHaveCount(0);
});

test('a failed save keeps the editor draft until the server confirms a retry', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: 'Add your first child' }).click();
  await page.getByLabel('Name or nickname').fill('Retry Child');
  await page.getByRole('button', { name: 'Save child', exact: true }).click();
  await page.getByRole('button', { name: 'Create schedule', exact: true }).click();
  await addFromLibrary(page, 'Play');
  await page.route('**/api/schedules', (route) => route.request().method() === 'PUT' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Temporary save failure"}' }) : route.continue());
  await page.getByRole('button', { name: 'Save schedule', exact: true }).first().click();
  await expect(page.getByRole('alert')).toContainText('Temporary save failure');
  await expect(page.locator('.schedule-task')).toHaveCount(1);
  await expect(page.getByText('Schedule saved', { exact: true })).toHaveCount(0);
  await page.unroute('**/api/schedules');
  await page.getByRole('button', { name: 'Save schedule', exact: true }).first().click();
  await expect(page.getByText('Schedule saved', { exact: true })).toBeVisible();
});

async function openEditor(page: Page) {
  await register(page);
  await page.getByRole('button', { name: 'Add your first child' }).click();
  await page.getByLabel('Name or nickname').fill('Debug Child');
  await page.getByRole('button', { name: 'Save child', exact: true }).click();
  await page.getByRole('button', { name: 'Create schedule', exact: true }).click();
  await addFromLibrary(page, 'Play');
}

test('timing saves directly, protects drafts, and safely handles an empty date', async ({ page }) => {
  await openEditor(page);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.getByLabel('Start time (optional)').fill('09:15');
  await page.getByLabel('Duration (minutes)').fill('25');
  page.once('dialog', (dialog) => { void dialog.dismiss(); });
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByLabel('Duration (minutes)')).toHaveValue('25');
  await openScheduleOption(page, 'Date');
  const date = await page.getByLabel('Date', { exact: true }).inputValue();
  await page.getByLabel('Date', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Go to date', exact: true }).click();
  await openScheduleOption(page, 'Date');
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(date);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Save schedule', exact: true }).first().click();
  await expect(page.getByText('Schedule saved', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.schedule-task')).toContainText('09:15');
  await expect(page.locator('.schedule-task')).toContainText('25 min');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Change date', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete schedule', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('child timer counts down and plays the end cue when sound is on', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __beeps: number }).__beeps = 0;
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() { return { frequency: { value: 0 }, connect() {}, start() { (window as unknown as { __beeps: number }).__beeps += 1; }, stop() {}, onended: null }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      close() { return Promise.resolve(); }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
  });
  await openEditor(page);
  await page.locator('.schedule-task').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Duration (minutes)').fill('1');
  await page.getByRole('button', { name: 'Apply to draft', exact: true }).click();
  await page.getByRole('button', { name: 'Save schedule', exact: true }).first().click();
  await expect(page.getByText('Schedule saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Open Child view', exact: true }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await page.clock.runFor(61_000);
  await expect(page.getByText('Time is up — nice effort!')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __beeps: number }).__beeps)).toBeGreaterThanOrEqual(1);
});

test('modal traps keyboard focus and Escape restores its opener', async ({ page }) => {
  await openEditor(page);
  const opener = page.getByRole('button', { name: 'Add activity', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Activity library' });
  await expect(dialog).toBeVisible();
  const first = dialog.getByRole('button', { name: 'Add', exact: true }).first();
  const last = dialog.getByRole('button', { name: 'Done', exact: true });
  await first.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('registration retries login without creating the account twice', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/auth/login', (route) => ++attempts === 1 ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Try login again"}' }) : route.continue());
  await page.goto('/#register');
  await page.getByLabel('Name', { exact: true }).fill('Retry Caregiver');
  await page.getByLabel('Email', { exact: true }).fill(email());
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Try login again');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Araw', exact: true })).toBeVisible({ timeout: 15_000 });
  expect(attempts).toBe(2);
});

test('a remembered login in another tab does not sign out a tab-only session', async ({ page, context }) => {
  await register(page);
  const first = await page.evaluate(() => sessionStorage.getItem('araw-session-token-v1'));
  const other = await context.newPage();
  await other.goto('/#register');
  await other.getByLabel('Name', { exact: true }).fill('Other Caregiver');
  await other.getByLabel('Email', { exact: true }).fill(email());
  await other.getByLabel('Password', { exact: true }).fill(password);
  await other.getByLabel('Remember me on this device').check();
  await other.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Welcome to Araw', exact: true })).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to Araw', exact: true })).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => sessionStorage.getItem('araw-session-token-v1'))).toBe(first);
  expect(await other.evaluate(() => localStorage.getItem('araw-session-token-v1'))).toBeTruthy();
});

test('stale timing conflicts retain the editor draft and the newer server timing', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Save schedule', exact: true }).first().click();
  await expect(page.getByText('Schedule saved', { exact: true })).toBeVisible();
  const token = await page.evaluate(() => sessionStorage.getItem('araw-session-token-v1'));
  const headers = { Authorization: `Bearer ${token}` };
  const children = await (await page.request.get('/api/children', { headers })).json();
  await openScheduleOption(page, 'Date');
  const date = await page.getByLabel('Date', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const schedule = await (await page.request.get(`/api/schedules?childId=${children[0].id}&date=${date}`, { headers })).json();
  expect((await page.request.put(`/api/tasks/${schedule.tasks[0].id}`, { headers, data: { duration_min: 40 } })).ok()).toBe(true);
  await page.locator('.schedule-task').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Duration (minutes)').fill('15');
  await page.getByRole('button', { name: 'Save schedule', exact: true }).first().click();
  await expect(page.getByRole('alert')).toContainText('This schedule changed');
  await expect(page.getByLabel('Duration (minutes)')).toHaveValue('15');
  const current = await (await page.request.get(`/api/schedules?childId=${children[0].id}&date=${date}`, { headers })).json();
  expect(current.tasks[0].duration_min).toBe(40);
});

for (const mode of ['throw', 'async'] as const) {
  test(`speech ${mode} failure keeps words visible and reports unavailable voice`, async ({ page }) => {
    await page.addInitScript((mode) => {
      class Utterance { text: string; rate = 1; onerror?: (event: { error: string }) => void; constructor(text: string) { this.text = text; } }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        cancel() {},
        speak(utterance: Utterance) { if (mode === 'throw') throw new Error('Voice engine unavailable'); setTimeout(() => utterance.onerror?.({ error: 'synthesis-failed' }), 0); },
      } });
    }, mode);
    await register(page);
    await page.getByRole('button', { name: 'Add your first child' }).click();
    await page.getByLabel('Name or nickname').fill('Speech Child');
    await page.getByRole('button', { name: 'Save child', exact: true }).click();
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await page.getByRole('button', { name: 'Open Child view', exact: true }).click();
    await page.getByRole('button', { name: 'Talk', exact: true }).click();
    const card = page.locator('.child-picture-card').first();
    const label = await card.locator('strong').innerText();
    await card.click();
    await expect(page.locator('.child-voice-status')).toContainText('available');
    await expect(page.getByRole('region', { name: 'My words', exact: true })).toContainText(label.toLowerCase());
  });
}
