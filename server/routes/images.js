import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncRoute, badRequest, notFound } from '../lib/http.js';
import { randomId } from '../lib/ids.js';
import { imageFromRow } from '../lib/mappers.js';

const router = express.Router();

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf',
]);

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) => {
      // Không bao giờ dùng tên file do client gửi để đặt tên trên đĩa (chống path traversal)
      const ext = EXT_BY_MIME[file.mimetype] || '';
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(badRequest(`Định dạng tệp không được phép: ${file.mimetype}. Chỉ nhận ảnh (JPG/PNG/WebP/GIF/SVG) và PDF.`));
    }
    cb(null, true);
  },
});

/** GET /api/images — thư viện dùng chung, đọc từ DB (không còn DUMMY_IMAGES cứng). */
router.get('/', asyncRoute(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM images ORDER BY created_at DESC`);
  res.json(rows.map(imageFromRow));
}));

/** POST /api/images — upload 1..n tệp, lưu file lên đĩa, DB chỉ giữ đường dẫn. */
router.post('/', upload.array('files', 10), asyncRoute(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw badRequest('Không có tệp nào được tải lên.');

  const created = [];
  for (const f of files) {
    const url = `/uploads/${path.basename(f.filename)}`;
    const { rows } = await query(
      `INSERT INTO images (id, url, name, mime_type, size_bytes, used_in)
       VALUES ($1,$2,$3,$4,$5,NULL) RETURNING *`,
      [randomId(), url, f.originalname.slice(0, 255), f.mimetype, f.size]
    );
    created.push(imageFromRow(rows[0]));
  }
  res.status(201).json(created);
}));

/** POST /api/images/link — thêm ảnh từ URL bên ngoài vào thư viện. */
router.post('/link', asyncRoute(async (req, res) => {
  const { url, name, usedIn } = req.body || {};
  if (typeof url !== 'string' || !/^https?:\/\/|^\/uploads\//.test(url)) {
    throw badRequest('URL ảnh không hợp lệ.');
  }
  const { rows } = await query(
    `INSERT INTO images (id, url, name, used_in) VALUES ($1,$2,$3,$4) RETURNING *`,
    [randomId(), url, (name || '').slice(0, 255), usedIn || null]
  );
  res.status(201).json(imageFromRow(rows[0]));
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const { usedIn, name } = req.body || {};
  const { rows } = await query(
    `UPDATE images SET used_in = COALESCE($2, used_in), name = COALESCE($3, name)
      WHERE id = $1 RETURNING *`,
    [req.params.id, usedIn ?? null, name ?? null]
  );
  if (!rows[0]) throw notFound('Không tìm thấy ảnh.');
  res.json(imageFromRow(rows[0]));
}));

/** DELETE /api/images/:id — xoá bản ghi và cả file trên đĩa nếu là file nội bộ. */
router.delete('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query(`DELETE FROM images WHERE id = $1 RETURNING *`, [req.params.id]);
  if (!rows[0]) throw notFound('Không tìm thấy ảnh.');

  const url = rows[0].url || '';
  if (url.startsWith('/uploads/')) {
    // basename() chặn mọi mưu toan '../' thoát khỏi thư mục uploads
    const filePath = path.join(config.uploadDir, path.basename(url));
    fs.promises.unlink(filePath).catch(() => {});
  }
  res.json({ ok: true });
}));

export default router;
