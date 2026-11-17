import { expect, test, type Page } from '@playwright/test';

async function openProgress(page: Page, empty = false) {
  const children = empty ? [] : [{ id: 1, user_id: 1, name: 'River', age: 6, delay_domain: 'speech', avatar: '🦊', notes: '', created_at: '' }, { id: 2, user_id: 1, name: 'Alexandria with a longer name', age: 8, delay_domain: 'motor', avatar: '🐼', notes: '', created_at: '' }];
  const done = [2, 0, 3, 1, 0, 2, 3], totals = [4, 0, 3, 4, 2, 2, 5];
  await page.addInitScript(() => sessionStorage.setItem('araw-session-token-v1', 'ui-preview-token'));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let body: unknown; let status = 200;
    if (url.pathname === '/api/auth/me') body = { id: 1, name: 'Caregiver', email: 'preview@example.invalid', role: 'caregiver' };
    else if (url.pathname === '/api/children') body = children;
    else if (url.pathname === '/api/activities') body = [];
    else if (url.pathname === '/api/settings') body = { font_size: 'medium', contrast: 'normal', sound_on: true, voice_speed: 'normal' };
    else if (url.pathname === '/api/health') body = { status: 'ok', database: 'connected' };
    else if (url.pathname === '/api/cards') body = {};
    else if (url.pathname === '/api/schedules') { status = 404; body = { error: 'Schedule not found' }; }
    else if (/^\/api\/progress\/\d+\/activities$/.test(url.pathname)) {
      const childId = Number(url.pathname.split('/')[3]);
      body = { child_id: childId, range: url.searchParams.get('range') ?? '7d', activities: childId === 1 ? [
        { name: 'Brush teeth', icon: '🪥', total: 4, completed: 3, percentage: 75, last_completed_at: '2026-11-17T00:30:00Z' },
        { name: 'Play', icon: '🧸', total: 3, completed: 1, percentage: 33, last_completed_at: '2026-11-16T06:00:00Z' },
        { name: 'Read a book', icon: '📚', total: 2, completed: 2, percentage: 100, last_completed_at: '2026-11-15T06:00:00Z' },
        { name: 'Wash hands', icon: '🧼', total: 2, completed: 0, percentage: 0, last_completed_at: null },
      ] : [] };
    }
    else if (url.pathname.startsWith('/api/progress/')) {
      const childId = Number(url.pathname.split('/').pop());
      const days = done.map((count, index) => ({ date: `2026-11-${index + 11}`, done: childId === 1 ? count : 0, total: childId === 1 ? totals[index] : 0, percentage: childId === 1 && totals[index] ? Math.round(count / totals[index]! * 100) : 0 }));
      body = { child_id: childId, range: '7d', today: days[6], last_7_days: days, recent_completions: childId === 1 ? [
        { task_id: 1, name: 'Brush teeth', icon: '🪥', schedule_date: '2026-11-17', completed_at: '2026-11-17T00:30:00Z' },
        { task_id: 2, name: 'Read a book', icon: '/assets/staff-card-book.svg', schedule_date: '2026-11-16', completed_at: '2026-11-16T06:00:00Z' },
      ] : [] };
    } else { status = 404; body = { error: 'Unexpected preview request' }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/#progress');
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
}

test('progress shows weighted totals and filters completion history by keyboard-selected day', async ({ page }) => {
  await openProgress(page);
  await expect(page.locator('.progress-metric').first()).toContainText('55%');
  await expect(page.getByRole('progressbar', { name: "Today's completion" })).toHaveAttribute('aria-valuenow', '60');
  await expect(page.getByRole('heading', { name: 'Activity patterns' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Most completed' }).locator('li').first()).toContainText('Read a book');
  await expect(page.getByRole('region', { name: 'Least completed' }).locator('li').first()).toContainText('Wash hands');
  await page.getByLabel('Period').selectOption('30d');
  await expect(page.getByLabel('Period')).toHaveValue('30d');
  const day = page.getByRole('button', { name: /Tuesday 17 November: 3 of 5/ });
  await day.focus(); await page.keyboard.press('Enter');
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.progress-history-list li')).toHaveCount(1);
  await expect(page.locator('.progress-history-list')).toContainText('Brush teeth');
  await page.getByRole('button', { name: 'Show all days' }).click();
  await expect(page.locator('.progress-history-list li')).toHaveCount(2);
  await page.getByRole('button', { name: /Thursday 12 November: 0 of 0/ }).click();
  await expect(page.getByRole('heading', { name: 'No completions for this day yet' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Child', exact: true }).selectOption('2');
  await expect(page.getByRole('button', { name: 'Show all days' })).toHaveCount(0);
  await expect(page.locator('.progress-metric').first()).toContainText('No activities scheduled yet');
});

test('progress fits desktop and mobile, including large text and high contrast', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProgress(page);
  await page.screenshot({ path: test.info().outputPath('progress-desktop.png'), fullPage: true });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('group', { name: 'Daily completion' }).getByRole('button')).toHaveCount(7);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath('progress-mobile.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Child', exact: true }).selectOption('2');
  await page.evaluate(() => { const root = document.querySelector('.app-root')!; root.classList.remove('font-medium', 'contrast-normal'); root.classList.add('font-large', 'contrast-high'); });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('progress-large-contrast.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('progress explains how to start when there are no profiles', async ({ page }) => {
  await openProgress(page, true);
  await expect(page.getByRole('heading', { name: 'A little progress starts here' })).toBeVisible();
  await page.getByRole('button', { name: 'Add a child profile' }).click();
  await expect(page.getByRole('heading', { name: 'Child Profiles', exact: true })).toBeVisible();
});
