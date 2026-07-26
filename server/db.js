import pg from 'pg';
import { config } from './config.js';

const { Pool, types } = pg;

// PostgreSQL trả BIGINT (int8) dưới dạng string để không mất chính xác.
// Mọi số tiền trong app này đều < 2^53 nên parse về Number là an toàn,
// và giúp frontend không phải xử lý string ở mọi phép tính.
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)));
// NUMERIC (commission_rate) cũng vậy.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
// DATE: giữ nguyên chuỗi 'YYYY-MM-DD', tránh lệch ngày do timezone.
types.setTypeParser(types.builtins.DATE, (v) => v);

const poolConfig = config.db.connectionString
  ? { connectionString: config.db.connectionString }
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  maxUses: 7_500,
});

pool.on('error', (err) => {
  console.error('[db] Lỗi không mong đợi trên idle client:', err.message);
});

export const query = (text, params) => pool.query(text, params);

/** Chạy một loạt câu lệnh trong 1 transaction, tự ROLLBACK khi lỗi. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function assertConnection() {
  const { rows } = await pool.query('SELECT current_database() AS db, version() AS version');
  return rows[0];
}

export default pool;
