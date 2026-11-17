import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('../../docs/ui-review');
await mkdir(output, { recursive: true });
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
catch { browser = await chromium.launch({ headless: true }); }
const page = await browser.newPage({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
const errors = [];
const unmockedRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => { void dialog.accept(); });
await page.addInitScript(() => sessionStorage.setItem('araw-session-token-v1', 'visual-review-token'));
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const days = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() + index - 6);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { date: value, done: index === 6 ? 1 : 0, total: index === 6 ? 5 : 0, percentage: index === 6 ? 20 : 0 };
});
const activities = [
  { id: 1, name: 'Wake up', icon: '/araw/picture-cards/card-wake-up-sunrise.svg', category: 'other' },
  { id: 2, name: 'Brush teeth', icon: '/araw/picture-cards/card-brush-teeth-blue.svg', category: 'hygiene' },
  { id: 3, name: 'Wash hands', icon: '/araw/picture-cards/card-wash-hands-soap.svg', category: 'hygiene' },
  { id: 4, name: 'Eat breakfast', icon: '/araw/picture-cards/card-eat-breakfast-bowl.svg', category: 'food' },
  { id: 5, name: 'Get dressed', icon: '/araw/picture-cards/card-get-dressed-shirt.svg', category: 'other' },
  { id: 6, name: 'Play', icon: '/assets/child-play.svg', category: 'play' },
];
const tasks = activities.slice(0, 5).map((item, index) => ({ id: index + 10, schedule_id: 1, activity_id: item.id, name: item.name, icon: item.icon, start_time: null, duration_min: null, position: index + 1, status: index === 0 ? 'done' : 'pending', completed_at: index === 0 ? `${today}T00:23:00.000Z` : null }));
const child = { id: 1, user_id: 1, name: 'John', age: 6, delay_domain: 'social', notes: null, avatar: '🐱', created_at: `${today}T00:00:00.000Z` };
const user = { id: 1, name: 'Gabriel', email: 'gabriel@example.com', role: 'caregiver' };
const cards = {
  Food: [{ id: 100, child_id: null, label: 'Water', icon: '/assets/child-water.svg', category: 'Food', is_hidden: false }],
  Emotions: [{ id: 101, child_id: null, label: 'Happy', icon: '/assets/child-happy.svg', category: 'Emotions', is_hidden: false }],
  Activities: [{ id: 102, child_id: null, label: 'Play', icon: '/assets/child-play.svg', category: 'Activities', is_hidden: false }],
  Needs: [{ id: 103, child_id: null, label: 'Help', icon: '/assets/child-help.svg', category: 'Needs', is_hidden: false }],
};
let currentTasks = tasks;
let currentSettings = { font_size: 'medium', contrast: 'normal', sound_on: true, voice_speed: 'normal' };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
await page.route('**/api/**', route => {
  const request = route.request();
  const url = new URL(request.url());
  const endpoint = url.pathname.slice('/api'.length);
  if (endpoint === '/auth/me' && request.method() === 'PATCH') return json(route, { ...user, name: JSON.parse(request.postData() ?? '{}').name });
  if (endpoint === '/auth/me') return json(route, user);
  if (endpoint === '/children') return json(route, [child]);
  if (endpoint === '/children/1') return json(route, child);
  if (endpoint === '/activities') return json(route, activities);
  if (endpoint === '/settings' && request.method() === 'PUT') {
    currentSettings = JSON.parse(request.postData() ?? '{}');
    return json(route, currentSettings);
  }
  if (endpoint === '/settings') return json(route, currentSettings);
  if (endpoint === '/health') return json(route, { status: 'ok', database: 'connected', message: 'OK', timestamp: new Date().toISOString() });
  if (endpoint === '/schedules') return json(route, { id: 1, child_id: 1, schedule_date: url.searchParams.get('date') ?? today, created_at: new Date().toISOString(), tasks: currentTasks, revision: 'review' });
  if (endpoint === '/progress/1/activities') return json(route, { child_id: 1, range: url.searchParams.get('range') ?? '7d', activities: activities.slice(0, 5).map((item) => ({ name: item.name, icon: item.icon, total: 1, completed: item.id === 1 ? 1 : 0, percentage: item.id === 1 ? 100 : 0, last_completed_at: item.id === 1 ? `${today}T00:23:00.000Z` : null })) });
  if (endpoint === '/progress/1') return json(route, { child_id: 1, range: '7d', today: days.at(-1), last_7_days: days, recent_completions: [{ task_id: 10, name: 'Wake up', icon: activities[0].icon, schedule_date: today, completed_at: `${today}T00:23:00.000Z` }] });
  if (endpoint === '/cards' && request.method() === 'POST') {
    const input = JSON.parse(request.postData() ?? '{}');
    const card = { id: 104, child_id: 1, label: input.label, icon: input.icon, category: input.category, is_hidden: false };
    cards[input.category].push(card);
    return json(route, card, 201);
  }
  if (endpoint === '/cards') return json(route, cards);
  if (endpoint.endsWith('/complete') && request.method() === 'PATCH') {
    const id = Number(endpoint.split('/')[2]);
    const { done } = JSON.parse(request.postData() ?? '{}');
    currentTasks = currentTasks.map(item => item.id === id ? { ...item, status: done ? 'done' : 'pending', completed_at: done ? new Date().toISOString() : null } : item);
    return json(route, currentTasks.find(item => item.id === id));
  }
  unmockedRequests.push(`${request.method()} ${endpoint}`);
  return json(route, { error: `Unmocked ${request.method()} ${endpoint}` }, 500);
});
const url = process.argv[2] ?? 'http://127.0.0.1:5178/';
async function open(pageName) { await page.goto(`${url}#${pageName}`); await page.locator('.staff-page, .schedule-page, .child-view').first().waitFor(); await page.evaluate(() => window.scrollTo(0, 0)); }
async function capture(name) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.complete ? undefined : new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    })));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.staff-nav, .staff-panel, .schedule-panel, .progress-metric, .child-header, .child-board, .child-current, .child-next')]
    .every(element => Number.parseFloat(getComputedStyle(element).opacity) >= .999));
  await page.screenshot({ path: path.join(output, name), fullPage: true, animations: 'disabled' });
}
await open('dashboard');
await capture('staff-dashboard-desktop.png');
await page.getByRole('button', { name: 'Add child', exact: true }).click();
await page.getByRole('heading', { name: /Add child/ }).waitFor();
await page.getByRole('button', { name: 'Cancel', exact: true }).click();
await open('profiles');
await capture('staff-profiles-desktop.png');
await page.getByRole('button', { name: 'Edit', exact: true }).click();
await page.getByLabel('Name or nickname').waitFor();
await page.getByRole('button', { name: 'Cancel', exact: true }).click();
await open('schedules');
await capture('staff-schedules-desktop.png');
await page.locator('.schedule-library-item').filter({ hasText: 'Play' }).getByRole('button', { name: 'Add', exact: true }).click();
assert.equal(await page.locator('.schedule-task').count(), 6);
await page.getByRole('button', { name: 'Preview', exact: true }).click();
await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
await page.getByRole('button', { name: /Open Task status/ }).click();
await page.getByRole('heading', { name: 'Schedules · Task status' }).waitFor();
await capture('staff-task-status-desktop.png');
const brushStatus = page.locator('.schedule-status-row').filter({ hasText: 'Brush teeth' });
await brushStatus.getByRole('button', { name: 'Mark done', exact: true }).click();
await brushStatus.getByRole('button', { name: 'Undo completion', exact: true }).click();
await brushStatus.getByRole('button', { name: 'Mark done', exact: true }).waitFor();
await open('progress');
await page.getByRole('heading', { name: 'Most completed' }).waitFor();
await capture('staff-progress-desktop.png');
await page.locator('.progress-day').last().click();
await page.getByRole('button', { name: 'Show all days' }).waitFor();
await open('settings');
await capture('staff-settings-desktop.png');
await page.getByRole('radio', { name: 'High contrast', exact: true }).check();
await page.getByRole('button', { name: 'Save settings', exact: true }).click();
await page.getByRole('button', { name: 'Settings saved', exact: true }).waitFor();
await open('child');
await page.locator('.child-view--high-contrast').waitFor();
assert.equal(await page.locator('.child-view').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)');
await open('settings');
await page.getByRole('group', { name: 'Contrast' }).getByRole('radio', { name: 'Normal', exact: true }).check();
await page.getByRole('button', { name: 'Save settings', exact: true }).click();
await page.getByRole('button', { name: 'Settings saved', exact: true }).waitFor();
await open('cards');
await capture('staff-cards-desktop.png');
await page.getByLabel('Word to speak').fill('More water');
await page.getByRole('button', { name: 'Add card', exact: true }).click();
await page.getByText('Card saved.', { exact: true }).waitFor();
await open('child');
await capture('child-day-desktop.png');
assert.equal(await page.locator('.child-current .child-illustration').evaluate(element => getComputedStyle(element).animationName), 'none', 'Task illustrations should stay still for readability');
await page.getByRole('button', { name: 'Talk', exact: true }).click();
await capture('child-talk-desktop.png');
assert.deepEqual(await page.evaluate(() => [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src)), [], 'Child illustrations are broken');
await page.getByRole('button', { name: /Water/ }).click();
await page.getByText('I want water', { exact: true }).waitFor();
await page.getByRole('button', { name: 'Speak', exact: true }).click();
await page.getByRole('button', { name: 'Clear', exact: true }).click();
await page.getByText('I want ...', { exact: true }).waitFor();
await page.getByRole('button', { name: /Emotions/ }).click();
await page.getByRole('button', { name: /Happy/ }).waitFor();
await page.getByRole('button', { name: 'My day', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await capture('child-day-mobile.png');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Child view overflows mobile viewport');
await page.getByRole('button', { name: 'Talk', exact: true }).click();
await capture('child-talk-mobile.png');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Child Talk overflows mobile viewport');
await page.getByRole('button', { name: 'My day', exact: true }).click();
await page.setViewportSize({ width: 1672, height: 941 });
await page.getByRole('button', { name: 'Done', exact: false }).click();
await page.getByText('2 of 5 done', { exact: true }).waitFor();
await capture('child-day-after-completion.png');
await page.getByRole('heading', { name: 'Now' }).waitFor();
await page.getByRole('button', { name: 'Return to staff workspace', exact: true }).click();
await page.getByRole('heading', { name: 'Return to staff workspace?' }).waitFor();
await page.getByRole('button', { name: 'Stay in Child view', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await open('dashboard');
await capture('staff-dashboard-mobile.png');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Staff dashboard overflows mobile viewport');
await page.getByRole('button', { name: 'Menu', exact: true }).click();
await page.getByRole('button', { name: 'Schedules', exact: true }).click();
await page.getByRole('heading', { name: 'Schedules', exact: true }).waitFor();
for (const pageName of ['profiles', 'schedules', 'tasks', 'progress', 'settings', 'cards']) {
  await open(pageName);
  const mobileOverflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    elements: [...document.querySelectorAll('*')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right) })),
  }));
  assert.equal(mobileOverflow.width <= mobileOverflow.viewport, true, `${pageName} overflows mobile viewport: ${JSON.stringify(mobileOverflow)}`);
}
await capture('staff-cards-mobile.png');
await page.setViewportSize({ width: 768, height: 1024 });
for (const pageName of ['dashboard', 'profiles', 'schedules', 'tasks', 'progress', 'settings', 'cards', 'child']) {
  await open(pageName);
  const tabletOverflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    elements: [...document.querySelectorAll('*')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right) })),
  }));
  assert.equal(tabletOverflow.width <= tabletOverflow.viewport, true, `${pageName} overflows tablet viewport: ${JSON.stringify(tabletOverflow)}`);
  if (pageName === 'schedules') await capture('staff-schedules-tablet.png');
  if (pageName === 'child') await capture('child-day-tablet.png');
}
assert.deepEqual(errors, []);
assert.deepEqual(unmockedRequests, [], 'Every browser API request must have a fixture');
console.log('Staff and child visual review passed; screenshots:', output);
await browser.close();
