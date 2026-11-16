import { createRequire } from 'node:module';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
const require = createRequire(new URL('../../api/package.json', import.meta.url));
export default async function cleanup() {
  const mysql = require('mysql2/promise');
  const name = process.env.DB_TEST_NAME;
  if (!name?.endsWith('_test') || !process.env.E2E_RUN_ID) throw new Error('Unsafe browser test cleanup configuration');
  if (!/^\d+$/.test(process.env.E2E_RUN_ID)) throw new Error('Invalid browser test run id');
  const marker = new URL(`.e2e-run-${process.env.E2E_RUN_ID}.json`, import.meta.url);
  if (!existsSync(marker)) return;
  if (JSON.parse(readFileSync(marker, 'utf8')).database !== name) throw new Error('Browser test fixture ownership mismatch');
  const connection = await mysql.createConnection({ host: process.env.DB_TEST_HOST, port: Number(process.env.DB_TEST_PORT), user: process.env.DB_TEST_USER, password: process.env.DB_TEST_PASSWORD, database: name });
  try { await connection.execute('DELETE FROM users WHERE email LIKE ? OR email = ?', [`e2e-${process.env.E2E_RUN_ID}-%@special-project.invalid`, 'demo@special-project.invalid']); }
  finally { await connection.end(); }
  unlinkSync(marker);
}
