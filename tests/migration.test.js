import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import { applyMigrations, migrationChecksum } from '../migrate.js';

test('migration SQL has static rerun guards and does not delete business rows', async () => {
  const sql = await fs.readFile(
    new URL('../database/migrations/20260728_integrity_and_auth.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE IF NOT EXISTS drivers/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS violations/i);
  assert.match(sql, /DROP TRIGGER IF EXISTS prevent_rental_overlap/i);
  assert.doesNotMatch(sql, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\s+(rentals|vehicles|customers|expenses|service_orders|drivers)\b/i);
});

test('financial workflow migration is additive and creates protected ledgers', async () => {
  const sql = await fs.readFile(
    new URL('../database/migrations/20260728_financial_state_machine.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE IF NOT EXISTS rental_payments/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS owner_payouts/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS owner_payout_items/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS service_order_payments/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_payout_items_unpaid_rental/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS operational_status/i);
  assert.doesNotMatch(sql, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test('vehicle status reconciliation uses open rentals as the source of truth', async () => {
  const sql = await fs.readFile(
    new URL('../database/migrations/20260802_reconcile_vehicle_rental_status.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /active_rental\.status = 'active'/i);
  assert.match(sql, /pending_rental\.status = 'pending'/i);
  assert.match(sql, /THEN 'Rented'/i);
  assert.match(sql, /THEN 'Reserved'/i);
  assert.match(sql, /UPDATE vehicles/i);
  assert.match(sql, /IS DISTINCT FROM/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
});

test('migration ledger applies a file once and rejects a changed checksum', async () => {
  const ledger = new Map();
  let migrationExecutions = 0;
  const client = {
    async query(sql, params = []) {
      if (sql === 'CREATE TABLE migration_probe (id INT)') {
        migrationExecutions += 1;
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) {
        const checksum = ledger.get(params[0]);
        return checksum
          ? { rows: [{ checksum }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (sql.startsWith('INSERT INTO schema_migrations')) {
        ledger.set(params[0], params[1]);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  const logger = { log() {} };
  const sql = 'CREATE TABLE migration_probe (id INT)';
  assert.equal(
    migrationChecksum('SELECT 1;\r\nSELECT 2;\r\n'),
    migrationChecksum('SELECT 1;\nSELECT 2;\n'),
  );
  const migration = {
    filename: '001_probe.sql',
    sql,
    checksum: migrationChecksum(sql),
  };

  await applyMigrations(client, [migration], logger);
  await applyMigrations(client, [migration], logger);
  assert.equal(migrationExecutions, 1);

  const changedSql = `${sql}; SELECT 1`;
  await assert.rejects(
    applyMigrations(client, [{
      ...migration,
      sql: changedSql,
      checksum: migrationChecksum(changedSql),
    }], logger),
    /checksum/,
  );
});
