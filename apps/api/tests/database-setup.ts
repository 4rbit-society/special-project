import { config } from 'dotenv';
const explicitDatabase = process.env.DB_HOST !== undefined;
config({ path: '.env.test' });
const prefix = explicitDatabase ? 'DB_' : 'DB_TEST_';
const values = Object.fromEntries(['HOST', 'PORT', 'USER', 'PASSWORD', 'NAME'].map((key) => [key, process.env[prefix + key]]));
if (!values.NAME?.endsWith('_test')) throw new Error('Database tests require a dedicated *_test database');
for (const [key, value] of Object.entries(values)) {
  if (value === undefined || (key !== 'PASSWORD' && !value.trim())) throw new Error(`${prefix}${key} is required for database tests`);
  process.env['DB_' + key] = value;
}
