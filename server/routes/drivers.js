import { query } from '../db.js';
import { crudRouter } from '../lib/crud.js';
import { conflict, badRequest } from '../lib/http.js';
import { driverFromRow, DRIVER_COLUMNS } from '../lib/mappers.js';

function normalize(body) {
  const out = { ...body };
  if (out.commissionRate !== undefined) {
    const n = Number(out.commissionRate);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      throw badRequest('Tỷ lệ chiết khấu tài xế phải nằm trong khoảng 0–100.');
    }
    out.commissionRate = n;
  }
  if (out.phone !== undefined) out.phone = String(out.phone).trim();
  if (out.assignedCarId !== undefined && !out.assignedCarId) out.assignedCarId = null;
  // totalTrips tính động từ service_orders
  delete out.totalTrips;
  return out;
}

const router = crudRouter({
  table: 'drivers',
  readFrom: 'drivers_with_stats',
  orderBy: 'created_at DESC, name',
  fromRow: driverFromRow,
  columns: DRIVER_COLUMNS,
  required: ['name', 'phone'],
  normalize,
  beforeDelete: async (id) => {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS n FROM service_orders WHERE driver_id = $1`,
      [id]
    );
    if (rows[0].n > 0) {
      throw conflict(
        `Không thể xoá: tài xế này còn ${rows[0].n} đơn dịch vụ trong lịch sử. ` +
        'Hãy đổi trạng thái tài xế sang "Nghỉ" thay vì xoá để giữ lịch sử đối soát.'
      );
    }
  },
});

export default router;
