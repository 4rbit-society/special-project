import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('../../docs/ui-review');
await mkdir(output, { recursive: true });
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
catch { browser = await chromium.launch({ headless: true }); }
const page = await browser.newPage({ viewport: { width: 1779, height: 884 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
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
  await page.waitForFunction(() => [...document.querySelectorAll('.auth-intro, .auth-card')]
    .every(element => Number.parseFloat(getComputedStyle(element).opacity) >= .999));
  await page.screenshot({ path: path.join(output, name), fullPage: true, animations: 'disabled' });
}
const url = process.argv[2] ?? 'http://127.0.0.1:5178/';
await page.goto(`${url}#login`);
await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
await capture('auth-login-desktop.png');
assert.equal(await page.locator('.auth-card').evaluate(element => getComputedStyle(element).animationName), 'araw-arrive');
await page.emulateMedia({ reducedMotion: 'reduce' });
assert.equal(await page.locator('.auth-card').evaluate(element => getComputedStyle(element).animationName), 'none');
await page.emulateMedia({ reducedMotion: 'no-preference' });
await page.getByRole('button', { name: 'Create an account' }).click();
await page.getByRole('heading', { name: 'Create your account' }).waitFor();
await capture('auth-register-desktop.png');
await page.setViewportSize({ width: 768, height: 1024 });
await capture('auth-register-tablet.png');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Register overflows tablet viewport');
await page.setViewportSize({ width: 390, height: 844 });
await capture('auth-register-mobile.png');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Register overflows mobile viewport');
await page.getByRole('button', { name: 'Back to log in' }).click();
await capture('auth-login-mobile.png');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Login overflows mobile viewport');
await page.route('**/api/auth/login', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid credentials.' }) }));
await page.getByLabel('Email', { exact: true }).fill('caregiver@example.com');
await page.getByLabel('Password', { exact: true }).fill('password123');
await page.getByRole('button', { name: 'Log in', exact: true }).click();
await page.getByRole('alert').getByText('Invalid credentials.').waitFor();
await page.getByRole('button', { name: 'Create an account' }).click();
await page.route('**/api/auth/register', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 1, name: 'Caregiver', email: 'caregiver@example.com', role: 'ot' }) }));
await page.getByLabel('Name', { exact: true }).fill('Caregiver');
await page.getByLabel('Email', { exact: true }).fill('caregiver@example.com');
await page.getByLabel('Password', { exact: true }).fill('password123');
await page.getByRole('radio', { name: 'OT', exact: true }).check();
await page.getByRole('button', { name: 'Create account', exact: true }).click();
await page.getByText('Your account was created. Log in to continue.').waitFor();
await page.unroute('**/api/auth/login');
const user = { id: 1, name: 'Caregiver', email: 'caregiver@example.com', role: 'ot' };
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
await page.route('**/api/auth/login', route => json(route, { token: 'auth-review-token', user }));
await page.route('**/api/auth/me', route => json(route, user));
await page.route('**/api/children', route => json(route, []));
await page.route('**/api/activities', route => json(route, []));
await page.route('**/api/settings', route => json(route, { font_size: 'medium', contrast: 'normal', sound_on: true }));
await page.route('**/api/health', route => json(route, { status: 'ok', database: 'connected', message: 'OK', timestamp: new Date().toISOString() }));
await page.getByLabel('Email', { exact: true }).fill('caregiver@example.com');
await page.getByLabel('Password', { exact: true }).fill('password123');
await page.getByRole('button', { name: 'Log in', exact: true }).click();
await page.getByRole('heading', { name: 'Welcome to Araw' }).waitFor();
await page.setViewportSize({ width: 1200, height: 800 });
await page.getByLabel('Caregiver, OT').waitFor();
assert.equal(await page.evaluate(() => sessionStorage.getItem('araw-session-token-v1')), 'auth-review-token');
await page.locator('.staff-header .staff-logout').click();
await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
assert.equal(await page.evaluate(() => sessionStorage.getItem('araw-session-token-v1')), null);
assert.deepEqual(errors, []);
console.log('Auth visual and interaction review passed; screenshots:', output);
await browser.close();
