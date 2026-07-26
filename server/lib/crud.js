import express from 'express';
import { query } from '../db.js';
import { asyncRoute, badRequest, notFound } from './http.js';
import { buildUpdate } from './mappers.js';
import { randomId } from './ids.js';

/**
 * Sinh router CRUD chuẩn cho một bảng đơn giản.
 *
 * @param {object} opts
 * @param {string} opts.table            tên bảng để INSERT/UPDATE/DELETE
 * @param {string} [opts.readFrom]       tên bảng/view để SELECT (mặc định = table)
 * @param {string} opts.orderBy          mệnh đề ORDER BY
 * @param {Function} opts.fromRow        row -> object cho frontend
 * @param {object} opts.columns          map camelCase -> snake_case
 * @param {string[]} opts.required       các field bắt buộc khi tạo mới
 * @param {Function} [opts.makeId]       hàm sinh id (mặc định randomId)
 * @param {Function} [opts.beforeDelete] async (id) => void, throw để chặn xoá
 * @param {Function} [opts.normalize]    (body) => body, chuẩn hoá/ép kiểu trước khi ghi
 */
export function crudRouter(opts) {
  const {
    table,
    readFrom = opts.table,
    orderBy,
    fromRow,
    columns,
    required = [],
    makeId = randomId,
    beforeDelete,
    normalize = (b) => b,
  } = opts;

  const router = express.Router();

  router.get('/', asyncRoute(async (_req, res) => {
    const { rows } = await query(`SELECT * FROM ${readFrom} ORDER BY ${orderBy}`);
    res.json(rows.map(fromRow));
  }));

  router.get('/:id', asyncRoute(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${readFrom} WHERE id = $1`, [req.params.id]);
    if (!rows[0]) throw notFound();
    res.json(fromRow(rows[0]));
  }));

  router.post('/', asyncRoute(async (req, res) => {
    const body = normalize({ ...req.body });

    const missing = required.filter((f) => {
      const v = body[f];
      return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    });
    if (missing.length) {
      throw badRequest(`Thiếu thông tin bắt buộc: ${missing.join(', ')}`);
    }

    const cols = ['id'];
    const params = [body.id && String(body.id).trim() ? String(body.id).trim() : await makeId(body)];

    for (const [key, column] of Object.entries(columns)) {
      if (body[key] === undefined) continue;
      cols.push(column);
      params.push(body[key]);
    }

    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      params
    );
    // Đọc lại từ view để lấy cả các field tính động (vd activeRentals)
    const { rows: fresh } = await query(`SELECT * FROM ${readFrom} WHERE id = $1`, [rows[0].id]);
    res.status(201).json(fromRow(fresh[0]));
  }));

  router.patch('/:id', asyncRoute(async (req, res) => {
    const patch = normalize({ ...req.body });
    const update = buildUpdate(table, columns, patch, req.params.id);
    if (!update) throw badRequest('Không có thay đổi nào để cập nhật.');

    const { rowCount } = await query(update.text, update.values);
    if (rowCount === 0) throw notFound();

    const { rows: fresh } = await query(`SELECT * FROM ${readFrom} WHERE id = $1`, [req.params.id]);
    res.json(fromRow(fresh[0]));
  }));

  router.delete('/:id', asyncRoute(async (req, res) => {
    if (beforeDelete) await beforeDelete(req.params.id);
    const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    if (rowCount === 0) throw notFound();
    res.json({ ok: true });
  }));

  return router;
}
