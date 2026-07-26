import express from 'express';
import { query, withTransaction } from '../db.js';
import { asyncRoute, badRequest } from '../lib/http.js';
import { generateDemoDataset, seedBaseData } from '../lib/demoData.js';

const router = express.Router();

/**
 * GET /api/admin/backup — xuất toàn bộ dữ liệu ra JSON.
 * README từng quảng cáo tính năng này nhưng code chưa hề có; giờ đã có thật.
 */
router.get('/backup', asyncRoute(async (_req, res) => {
  const tables = ['owners', 'cars', 'customers', 'rentals', 'violations', 'drivers', 'service_orders', 'expenses', 'images', 'settings'];
  const dump = {};
  for (const t of tables) {
    const { rows } = await query(`SELECT * FROM ${t}`);
    dump[t] = rows;
  }
  res.setHeader('Content-Disposition', `attachment; filename="agreen-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: dump,
  });
}));

/**
 * POST /api/admin/restore — nhập lại từ file backup.
 * Chạy trong 1 transaction: hỏng giữa đường thì rollback sạch, không để DB nửa vời.
 */
router.post('/restore', asyncRoute(async (req, res) => {
  const payload = req.body;
  if (!payload || payload.version !== 1 || typeof payload.tables !== 'object') {
    throw badRequest('Tệp backup không đúng định dạng (thiếu version hoặc tables).');
  }

  // Thứ tự chèn phải tôn trọng khoá ngoại
  const order = ['owners', 'cars', 'customers', 'drivers', 'rentals', 'violations', 'service_orders', 'expenses', 'images', 'settings'];

  const counts = await withTransaction(async (client) => {
    // Xoá theo thứ tự ngược để không vướng khoá ngoại
    for (const t of [...order].reverse()) {
      if (t === 'settings') continue; // settings là singleton, chỉ update
      await client.query(`DELETE FROM ${t}`);
    }

    const result = {};
    for (const table of order) {
      const rows = payload.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        result[table] = 0;
        continue;
      }

      if (table === 'settings') {
        const s = rows[0];
        await client.query(
          `UPDATE settings SET logo=$1, logo_history=$2, favicon=$3, primary_color=$4, contract_terms=$5 WHERE id=1`,
          [s.logo ?? 'Auto', JSON.stringify(s.logo_history ?? ['Auto']), s.favicon ?? 'Auto',
           s.primary_color ?? '#006837', s.contract_terms ?? '']
        );
        result[table] = 1;
        continue;
      }

      // Tên cột đến từ file do người dùng cung cấp -> chỉ nhận ký tự an toàn,
      // không bao giờ nội suy chuỗi tự do vào câu SQL.
      const columns = Object.keys(rows[0]).filter((c) => /^[a-z_][a-z0-9_]*$/.test(c));
      if (columns.length === 0) {
        throw badRequest(`Bảng "${table}" trong tệp backup không có cột nào hợp lệ.`);
      }
      const colList = columns.map((c) => `"${c}"`).join(', ');
      for (const row of rows) {
        const values = columns.map((c) => {
          const v = row[c];
          return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
        });
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }
      result[table] = rows.length;
    }

    // Đẩy sequence vượt qua các mã đã có, tránh sinh trùng mã sau khi restore
    await client.query(
      `SELECT setval('rental_code_seq', GREATEST(
         (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::bigint), 0) FROM rentals), 1))`
    );
    await client.query(
      `SELECT setval('service_code_seq', GREATEST(
         (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::bigint), 0) FROM service_orders), 1))`
    );

    return result;
  });

  res.json({ ok: true, restored: counts });
}));

/** POST /api/admin/demo-data — sinh dữ liệu mẫu lớn để test hiệu năng. */
router.post('/demo-data', asyncRoute(async (_req, res) => {
  const summary = await generateDemoDataset();
  res.json({ ok: true, ...summary });
}));

/** POST /api/admin/reset-data — xoá sạch và nạp lại bộ dữ liệu khởi tạo. */
router.post('/reset-data', asyncRoute(async (_req, res) => {
  const summary = await seedBaseData({ truncate: true });
  res.json({ ok: true, ...summary });
}));

export default router;
