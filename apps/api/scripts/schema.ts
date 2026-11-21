import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import type { RowDataPacket } from 'mysql2/promise';
import { closeDatabasePool, getDatabasePool } from '../src/db/pool.js';

async function applySchema(): Promise<void> {
  try {
    const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
    const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);
    const connection = await getDatabasePool().getConnection();

    try {
      for (const statement of statements) {
        await connection.query(statement);
      }
      const [columns] = await connection.query<RowDataPacket[]>(
        "SHOW COLUMNS FROM picture_cards LIKE 'is_hidden'",
      );
      if (columns.length === 0) {
        await connection.query(
          'ALTER TABLE picture_cards ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE',
        );
      }
      const [voiceSpeedColumns] = await connection.query<RowDataPacket[]>(
        "SHOW COLUMNS FROM settings LIKE 'voice_speed'",
      );
      if (voiceSpeedColumns.length === 0) {
        await connection.query(
          "ALTER TABLE settings ADD COLUMN voice_speed ENUM('slow', 'normal', 'fast') NOT NULL DEFAULT 'normal' AFTER sound_on",
        );
      }
      const [activityOwnerColumns] = await connection.query<RowDataPacket[]>(
        "SHOW COLUMNS FROM activities LIKE 'user_id'",
      );
      if (activityOwnerColumns.length === 0) {
        await connection.query(`ALTER TABLE activities
          ADD COLUMN user_id BIGINT UNSIGNED NULL,
          ADD COLUMN catalog_owner BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(user_id, 0)) VIRTUAL,
          DROP INDEX uq_activities_name,
          ADD UNIQUE KEY uq_activities_catalog_name (catalog_owner, name),
          ADD CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE`);
      }
    } finally {
      connection.release();
    }

    console.log(`Applied ${statements.length} schema statements.`);
  } finally {
    await closeDatabasePool();
  }
}

void applySchema().catch((error: unknown) => {
  console.error('Failed to apply the database schema:', error);
  process.exitCode = 1;
});
