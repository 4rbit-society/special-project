import { defineConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '../api/.env.test' });
for (const key of ['HOST', 'PORT', 'USER', 'PASSWORD', 'NAME']) {
  if (process.env[`DB_TEST_${key}`] === undefined) throw new Error(`DB_TEST_${key} is required for browser tests`);
}
if (!/^[a-zA-Z0-9_]+_test$/.test(process.env.DB_TEST_NAME!)) throw new Error('Browser tests require a dedicated *_test database');
process.env.E2E_RUN_ID ??= String(Date.now());
if (!/^\d+$/.test(process.env.E2E_RUN_ID)) throw new Error('E2E_RUN_ID must contain only digits');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
export default defineConfig({
  testDir: './e2e', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1, timeout: 90_000,
  globalTeardown: './e2e/cleanup.ts',
  use: { baseURL: 'http://127.0.0.1:15173', channel: process.env.E2E_BROWSER_CHANNEL, headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node e2e/start-api.mjs', url: 'http://127.0.0.1:13001/api/health', reuseExistingServer: false, timeout: 60_000 },
    { command: `${npm} run dev -- --host 127.0.0.1 --port 15173 --strictPort`, url: 'http://127.0.0.1:15173', reuseExistingServer: false, env: { API_PROXY_TARGET: 'http://127.0.0.1:13001' } },
  ],
});
