import crypto from 'node:crypto';
import { query } from '../db.js';

/** ID ngẫu nhiên không trùng — thay cho Date.now().toString().slice(-4). */
export const randomId = () => crypto.randomUUID();

/**
 * Mã đơn dễ đọc, tăng dần và duy nhất tuyệt đối nhờ SEQUENCE của Postgres.
 * VD: nextCode('RNT', 'rental_code_seq') -> 'RNT-000128'
 */
export async function nextCode(prefix, sequence) {
  const { rows } = await query(`SELECT nextval($1) AS n`, [sequence]);
  return `${prefix}-${String(rows[0].n).padStart(6, '0')}`;
}
