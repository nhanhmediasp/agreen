import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './server/db.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = path.join(rootDir, 'database', 'migrations');

export const migrationChecksum = (sql) => {
  const canonicalSql = sql.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(canonicalSql, 'utf8').digest('hex');
};

export const loadMigrations = async (migrationsDir = defaultMigrationsDir) => {
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return Promise.all(files.map(async (filename) => {
    const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf8');
    return {
      filename,
      sql,
      checksum: migrationChecksum(sql),
    };
  }));
};

export const applyMigrations = async (client, migrations, logger = console) => {
  await client.query('BEGIN');
  try {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('agreen_schema_migrations'))",
    );
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename TEXT PRIMARY KEY,
         checksum CHAR(64) NOT NULL,
         applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`,
    );

    for (const migration of migrations) {
      const applied = await client.query(
        'SELECT checksum FROM schema_migrations WHERE filename=$1',
        [migration.filename],
      );
      if (applied.rowCount > 0) {
        const recordedChecksum = String(applied.rows[0].checksum).trim();
        if (recordedChecksum !== migration.checksum) {
          throw new Error(
            `Applied migration ${migration.filename} has checksum ${recordedChecksum}, `
            + `but the file now has ${migration.checksum}`,
          );
        }
        logger.log(`[Migration] Skipped ${migration.filename} (already applied)`);
        continue;
      }

      await client.query(migration.sql);
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [migration.filename, migration.checksum],
      );
      logger.log(`[Migration] Applied ${migration.filename}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

export const runMigrations = async ({
  databasePool = pool,
  migrationsDir = defaultMigrationsDir,
  logger = console,
} = {}) => {
  const migrations = await loadMigrations(migrationsDir);
  const client = await databasePool.connect();
  try {
    await applyMigrations(client, migrations, logger);
  } finally {
    client.release();
  }
};

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  runMigrations()
    .then(async () => {
      await pool.end();
      console.log('[Migration] All migrations completed');
    })
    .catch(async (error) => {
      console.error(`[Migration] ${error instanceof Error ? error.message : String(error)}`);
      await pool.end();
      process.exitCode = 1;
    });
}
