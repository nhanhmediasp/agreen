import { query } from '../db.js';
import { crudRouter } from '../lib/crud.js';
import { conflict, badRequest } from '../lib/http.js';
import { ownerFromRow, OWNER_COLUMNS } from '../lib/mappers.js';

function normalize(body) {
  const out = { ...body };
  if (out.commissionRate !== undefined) {
    // Chú ý: dùng ?? chứ không dùng || để giữ được giá trị 0%
    const n = Number(out.commissionRate);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      throw badRequest('Tỷ lệ chiết khấu chủ xe phải nằm trong khoảng 0–100.');
    }
    out.commissionRate = n;
  }
  if (out.phone !== undefined) out.phone = String(out.phone).trim();
  return out;
}

const router = crudRouter({
  table: 'owners',
  orderBy: 'created_at DESC, name',
  fromRow: ownerFromRow,
  columns: OWNER_COLUMNS,
  required: ['name', 'phone'],
  normalize,
  // Chặn xoá chủ xe khi còn xe gán cho họ -> tránh xe "mồ côi"
  beforeDelete: async (id) => {
    const { rows } = await query(
      `SELECT c.id AS plate
         FROM cars c
         JOIN owners o ON o.phone = c.owner_phone
        WHERE o.id = $1
        LIMIT 5`,
      [id]
    );
    if (rows.length) {
      throw conflict(
        `Không thể xoá: chủ xe này còn ${rows.length} xe trong hệ thống (${rows.map((r) => r.plate).join(', ')}). ` +
        'Hãy chuyển các xe đó sang chủ xe khác trước.'
      );
    }
  },
});

export default router;
