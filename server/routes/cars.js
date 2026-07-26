import { query } from '../db.js';
import { crudRouter } from '../lib/crud.js';
import { conflict, badRequest } from '../lib/http.js';
import { carFromRow, CAR_COLUMNS } from '../lib/mappers.js';

const VALID_STATUS = ['ready', 'rented', 'maintenance', 'suspended'];

/** Ép kiểu số + rỗng->null cho các cột DATE, tránh lỗi '' không parse được thành date. */
function normalize(body) {
  const out = { ...body };
  if (out.id !== undefined) out.id = String(out.id).trim();
  for (const k of ['km', 'seats', 'pricePerHour', 'pricePerDay', 'pricePerWeek']) {
    if (out[k] !== undefined) out[k] = Number(out[k]) || 0;
  }
  for (const k of ['expiryRegistration', 'expiryInsurance', 'expiryLicense']) {
    if (out[k] !== undefined && !out[k]) out[k] = null;
  }
  if (out.status !== undefined && !VALID_STATUS.includes(out.status)) {
    throw badRequest(`Trạng thái xe không hợp lệ: ${out.status}`);
  }
  return out;
}

const router = crudRouter({
  table: 'cars',
  orderBy: 'created_at DESC, id',
  fromRow: carFromRow,
  columns: CAR_COLUMNS,
  required: ['id', 'name', 'ownerPhone'],
  normalize,
  // Không cho xoá xe đang thuê hoặc còn đơn/đơn dịch vụ tham chiếu
  beforeDelete: async (id) => {
    const { rows } = await query(
      `SELECT
         (SELECT COUNT(*) FROM rentals WHERE car_id = $1 AND status IN ('pending','active')) AS open_rentals,
         (SELECT COUNT(*) FROM rentals WHERE car_id = $1) AS all_rentals,
         (SELECT COUNT(*) FROM service_orders WHERE car_id = $1) AS services,
         (SELECT status FROM cars WHERE id = $1) AS status`,
      [id]
    );
    const r = rows[0];
    if (!r?.status) return; // không tồn tại -> để route trả 404
    if (r.status === 'rented' || Number(r.open_rentals) > 0) {
      throw conflict('Không thể xoá xe đang được thuê hoặc còn đơn thuê chưa hoàn tất.');
    }
    if (Number(r.all_rentals) > 0 || Number(r.services) > 0) {
      throw conflict(
        'Xe này đã có lịch sử đơn thuê/đơn dịch vụ nên không thể xoá. ' +
        'Hãy chuyển trạng thái xe sang "Tạm ngưng" để ngừng khai thác mà vẫn giữ lịch sử.'
      );
    }
  },
});

export default router;
