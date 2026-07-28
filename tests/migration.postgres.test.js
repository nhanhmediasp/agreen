import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import pg from 'pg';
import {
  applyMigrations,
  loadMigrations,
  migrationChecksum,
} from '../migrate.js';

const connectionString = process.env.TEST_DATABASE_URL;

const identifiesTestDatabase = (value) => {
  if (!value) return false;
  try {
    const databaseName = decodeURIComponent(new URL(value).pathname.slice(1));
    return /(^|[_-])test([_-]|$)/i.test(databaseName);
  } catch {
    return false;
  }
};

test('real PostgreSQL applies the schema migration once and enforces its checksum', async (t) => {
  if (!connectionString) {
    t.skip('TEST_DATABASE_URL is not set; PostgreSQL migration integration test skipped');
    return;
  }
  if (!identifiesTestDatabase(connectionString)) {
    t.skip('TEST_DATABASE_URL does not identify a test database; refusing to modify it');
    return;
  }

  const schemaName = `agreen_migration_test_${crypto.randomBytes(8).toString('hex')}`;
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const schemaSql = await fs.readFile(
      new URL('../database/schema.sql', import.meta.url),
      'utf8',
    );
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}", public`);
    await client.query(schemaSql);

    const migrations = await loadMigrations();
    const logger = { log() {} };
    await applyMigrations(client, migrations, logger);
    await applyMigrations(client, migrations, logger);

    const ledger = await client.query(
      'SELECT filename, checksum FROM schema_migrations ORDER BY filename',
    );
    assert.equal(ledger.rowCount, migrations.length);
    assert.deepEqual(
      ledger.rows.map((row) => row.filename),
      migrations.map((migration) => migration.filename),
    );
    const drivers = await client.query("SELECT to_regclass('drivers') AS table_name");
    assert.equal(drivers.rows[0].table_name, 'drivers');
    const payments = await client.query("SELECT to_regclass('rental_payments') AS table_name");
    assert.equal(payments.rows[0].table_name, 'rental_payments');
    const payouts = await client.query("SELECT to_regclass('owner_payouts') AS table_name");
    assert.equal(payouts.rows[0].table_name, 'owner_payouts');

    const changed = {
      ...migrations[0],
      sql: `${migrations[0].sql}\n-- changed`,
      checksum: migrationChecksum(`${migrations[0].sql}\n-- changed`),
    };
    await assert.rejects(
      applyMigrations(client, [changed], logger),
      /checksum/,
    );
  } finally {
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await client.end();
  }
});
