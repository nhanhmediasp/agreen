import express from 'express';
import { query } from '../db.js';
import { asyncRoute, badRequest } from '../lib/http.js';
import { settingsFromRow } from '../lib/mappers.js';

const router = express.Router();

const MAX_LOGO_HISTORY = 10;

async function readSettings() {
  const { rows } = await query(
    `INSERT INTO settings (id) VALUES (1)
     ON CONFLICT (id) DO UPDATE SET id = 1
     RETURNING *`
  );
  return rows[0];
}

router.get('/', asyncRoute(async (_req, res) => {
  res.json(settingsFromRow(await readSettings()));
}));

router.patch('/', asyncRoute(async (req, res) => {
  const b = req.body || {};
  const current = await readSettings();

  if (b.primaryColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(b.primaryColor)) {
    throw badRequest('Mã màu phải ở dạng hex 6 ký tự, ví dụ #006837.');
  }

  // Ghi lịch sử logo để có thể rollback, giới hạn số bản để không phình vô hạn
  let history = current.logo_history || ['Auto'];
  if (b.logo !== undefined && b.logo !== current.logo) {
    history = [...history, b.logo].slice(-MAX_LOGO_HISTORY);
  }

  const { rows } = await query(
    `UPDATE settings SET
       logo = COALESCE($1, logo),
       logo_history = $2,
       favicon = COALESCE($3, favicon),
       primary_color = COALESCE($4, primary_color),
       contract_terms = COALESCE($5, contract_terms)
     WHERE id = 1 RETURNING *`,
    [
      b.logo ?? null,
      JSON.stringify(history),
      b.favicon ?? null,
      b.primaryColor ?? null,
      b.contractTerms ?? null,
    ]
  );
  res.json(settingsFromRow(rows[0]));
}));

/** POST /api/settings/rollback-logo — quay lại logo trước đó. */
router.post('/rollback-logo', asyncRoute(async (_req, res) => {
  const current = await readSettings();
  const history = current.logo_history || ['Auto'];
  if (history.length <= 1) {
    throw badRequest('Không còn logo cũ nào để hoàn tác.');
  }
  const next = history.slice(0, -1);
  const { rows } = await query(
    `UPDATE settings SET logo = $1, logo_history = $2 WHERE id = 1 RETURNING *`,
    [next[next.length - 1], JSON.stringify(next)]
  );
  res.json(settingsFromRow(rows[0]));
}));

export default router;
