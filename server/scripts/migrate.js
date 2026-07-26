import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import pool, { assertConnection } from '../db.js';

/**
 * Chạy database/schema.sql. File này idempotent nên chạy lại bao nhiêu lần cũng được.
 *   npm run db:migrate
 */
async function main() {
  const schemaPath = path.join(config.rootDir, 'database', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  const info = await assertConnection();
  console.log(`[migrate] Kết nối tới: ${info.db}`);

  await pool.query(sql);
  console.log('[migrate] ✅ Đã áp dụng schema thành công.');
}

main()
  .catch((err) => {
    console.error('[migrate] ❌ Lỗi:', err.message);
    if (err.position) console.error(`         (vị trí ký tự ${err.position} trong schema.sql)`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
