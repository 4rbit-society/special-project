import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../api/package.json', import.meta.url));
const mysql = require('mysql2/promise');
const config = { host: process.env.DB_TEST_HOST, port: Number(process.env.DB_TEST_PORT), user: process.env.DB_TEST_USER, password: process.env.DB_TEST_PASSWORD, database: process.env.DB_TEST_NAME };
if (!/^[a-zA-Z0-9_]+_test$/.test(config.database ?? '')) throw new Error('Expected a dedicated *_test database');
let connection;
try { connection = await mysql.createConnection(config); }
catch (error) {
  if (error.code !== 'ER_BAD_DB_ERROR') throw error;
  connection = await mysql.createConnection({ ...config, database: undefined });
  await connection.query(`CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4`);
  await connection.end(); connection = await mysql.createConnection(config);
}
const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
if (tables.length) {
  const [rows] = await connection.query('SELECT COUNT(*) AS count FROM users');
  if (Number(rows[0].count) !== 0) throw new Error('Browser tests require a database without users; existing data will not be reset.');
}
await connection.end();
const env = { ...process.env, NODE_ENV: 'test', DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_NAME: config.database, JWT_SECRET: 'browser-test-secret-only-123456', FRONTEND_ORIGIN: 'http://127.0.0.1:15173', PORT: '13001' };
const cwd = fileURLToPath(new URL('../../api', import.meta.url));
for (const script of ['schema', 'seed']) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', `scripts/${script}.ts`], { cwd, env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Browser database ${script} setup failed`);
}
if (!/^\d+$/.test(process.env.E2E_RUN_ID ?? '')) throw new Error('Invalid browser test run id');
writeFileSync(new URL(`.e2e-run-${process.env.E2E_RUN_ID}.json`, import.meta.url), JSON.stringify({ database: config.database }));
const child = spawn(process.execPath, ['dist/server.js'], { cwd, env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
