import { execFileSync } from 'node:child_process';
import { getDatabasePool } from '../../src/db/pool.js';

const TABLES = ['tasks', 'schedules', 'picture_cards', 'settings', 'children', 'activities', 'users'];

export function applySchema(): void {
  if (!process.env.DB_NAME?.endsWith('_test')) throw new Error('Schema tests require a *_test database');
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/schema.ts'], {
    env: { ...process.env },
    stdio: 'pipe',
  });
}

export function runSeed(): void {
  if (!process.env.DB_NAME?.endsWith('_test')) throw new Error('Seed tests require a *_test database');
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/seed.ts'], {
    env: { ...process.env },
    stdio: 'pipe',
  });
}

export async function resetDb(): Promise<void> {
  if (!process.env.DB_NAME?.endsWith('_test')) {
    throw new Error('resetDb may only run against a *_test database');
  }
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) {
      await connection.query(`TRUNCATE TABLE ${table}`);
    }
  } finally {
    try { await connection.query('SET FOREIGN_KEY_CHECKS = 1'); } finally { connection.release(); }
  }
}
