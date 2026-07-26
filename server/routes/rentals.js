import express from 'express';
import { query, withTransaction } from '../db.js';
import { asyncRoute, badRequest, notFound, conflict } from '../lib/http.js';
import { nextCode, randomId } from '../lib/ids.js';
import { rentalFromRow, violationFromRow, buildUpdate, RENTAL_COLUMNS } from '../lib/mappers.js';

const router = express.Router();

/**
 * MỘT công thức tổng tiền duy nhất cho toàn hệ thống.
 * Trước đây AppContext.completeRental cộng dồn `totalAmount + extraFee` trong khi
 * Contracts lại tính lại từ đầu -> hai nơi ra hai con số khác nhau trên cùng một đơn.
 */
export const computeTotal = ({ rentalFee = 0, deliveryFee = 0, extraFee = 0, violationTotal = 0 }) =>
  Math.round(Number(rentalFee) + Number(deliveryFee) + Number(extraFee) + Number(violationTotal));

const SELECT_RENTALS = `
  SELECT r.*,
         COALESCE(v.violations, '[]'::json) AS violations
    FROM rentals r
    LEFT JOIN (
      SELECT rental_id,
             json_agg(json_build_object(
               'id', id, 'date', date, 'description', description,
               'amount', amount, 'evidenceUrl', evidence_url, 'status', status
             ) ORDER BY date DESC) AS violations
        FROM violations GROUP BY rental_id
    ) v ON v.rental_id = r.id
`;

async function loadRental(id, client = { query }) {
  const { rows } = await client.query(`${SELECT_RENTALS} WHERE r.id = $1`, [id]);
  return rows[0] ? rentalFromRow(rows[0]) : null;
}

async function violationTotalOf(rentalId, client = { query }) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::bigint AS total FROM violations WHERE rental_id = $1`,
    [rentalId]
  );
  return Number(rows[0].total);
}

/** Đồng bộ trạng thái xe theo các đơn của nó — nguồn sự thật là bảng rentals. */
async function syncCarStatus(carId, client) {
  const { rows } = await client.query(
    `SELECT id, customer_name, end_date FROM rentals
      WHERE car_id = $1 AND status = 'active'
      ORDER BY start_date DESC LIMIT 1`,
    [carId]
  );
  const active = rows[0];

  if (active) {
    await client.query(
      `UPDATE cars SET status = 'rented', customer = $2, time_remaining = NULL WHERE id = $1`,
      [carId, active.customer_name]
    );
  } else {
    // Chỉ nhả về 'ready' khi xe đang ở trạng thái 'rented';
    // không ghi đè 'maintenance' / 'suspended' do người dùng chủ động đặt.
    await client.query(
      `UPDATE cars SET status = 'ready', customer = NULL, time_remaining = NULL
        WHERE id = $1 AND status = 'rented'`,
      [carId]
    );
  }
}

// ------------------------------------------------------------------ LIST
router.get('/', asyncRoute(async (_req, res) => {
  const { rows } = await query(`${SELECT_RENTALS} ORDER BY r.created_at DESC, r.id DESC`);
  res.json(rows.map(rentalFromRow));
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const rental = await loadRental(req.params.id);
  if (!rental) throw notFound('Không tìm thấy đơn thuê.');
  res.json(rental);
}));

// ---------------------------------------------------------------- CREATE
router.post('/', asyncRoute(async (req, res) => {
  const b = req.body || {};

  for (const f of ['carId', 'customerName', 'customerPhone', 'startDate', 'endDate']) {
    if (!b[f]) throw badRequest(`Thiếu thông tin bắt buộc: ${f}`);
  }
  if (new Date(b.endDate) < new Date(b.startDate)) {
    throw badRequest('Ngày trả xe phải sau hoặc bằng ngày nhận xe.');
  }

  const rental = await withTransaction(async (client) => {
    const { rows: carRows } = await client.query(
      `SELECT id, km, status FROM cars WHERE id = $1 FOR UPDATE`,
      [b.carId]
    );
    const car = carRows[0];
    if (!car) throw badRequest(`Không tìm thấy xe ${b.carId}.`);

    const status = b.status === 'active' ? 'active' : 'pending';

    // Chặn đặt trùng khoảng thời gian với đơn khác chưa hoàn tất của cùng xe
    const { rows: overlap } = await client.query(
      `SELECT id FROM rentals
        WHERE car_id = $1
          AND status IN ('pending','active')
          AND tstzrange(start_date, end_date, '[]') && tstzrange($2::timestamptz, $3::timestamptz, '[]')
        LIMIT 1`,
      [b.carId, b.startDate, b.endDate]
    );
    if (overlap.length) {
      throw conflict(`Xe ${b.carId} đã có đơn ${overlap[0].id} trùng khoảng thời gian này.`);
    }

    const id = await nextCode('RNT', 'rental_code_seq');
    const rentalFee = Math.round(Number(b.rentalFee) || 0);
    const deliveryFee = Math.round(Number(b.deliveryFee) || 0);
    const extraFee = Math.round(Number(b.extraFee) || 0);
    const totalAmount = computeTotal({ rentalFee, deliveryFee, extraFee });

    await client.query(
      `INSERT INTO rentals (
         id, car_id, customer_name, customer_phone, start_date, end_date,
         rental_fee, delivery_fee, deposit, extra_fee, total_amount,
         payment_status, status, start_km, start_fuel, source,
         file_url, file_name, owner_commission_amount, condition_images, delivered_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        id, b.carId, b.customerName, String(b.customerPhone).trim(), b.startDate, b.endDate,
        rentalFee, deliveryFee, Math.round(Number(b.deposit) || 0), extraFee, totalAmount,
        b.paymentStatus || 'deposit', status, Math.round(Number(b.startKm) || 0),
        b.startFuel || '8/8', b.source === 'uploaded' ? 'uploaded' : 'system',
        b.fileUrl || null, b.fileName || null,
        Math.round(Number(b.ownerCommissionAmount) || 0),
        JSON.stringify(b.conditionImages || []),
        status === 'active' ? new Date() : null,
      ]
    );

    await syncCarStatus(b.carId, client);
    const { rows } = await client.query(`${SELECT_RENTALS} WHERE r.id = $1`, [id]);
    return rentalFromRow(rows[0]);
  });

  res.status(201).json(rental);
}));

// ---------------------------------------------------------------- UPDATE
router.patch('/:id', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const patch = { ...req.body };

  // Các field dẫn xuất: server tự tính, không nhận từ client
  delete patch.totalAmount;
  delete patch.violations;

  const rental = await withTransaction(async (client) => {
    const { rows: current } = await client.query(`SELECT * FROM rentals WHERE id = $1 FOR UPDATE`, [id]);
    if (!current[0]) throw notFound('Không tìm thấy đơn thuê.');
    const before = current[0];

    if (patch.startDate && patch.endDate && new Date(patch.endDate) < new Date(patch.startDate)) {
      throw badRequest('Ngày trả xe phải sau hoặc bằng ngày nhận xe.');
    }

    const update = buildUpdate('rentals', RENTAL_COLUMNS, patch, id);
    if (update) await client.query(update.text, update.values);

    // Tính lại tổng tiền theo công thức duy nhất
    const { rows: after } = await client.query(`SELECT * FROM rentals WHERE id = $1`, [id]);
    const total = computeTotal({
      rentalFee: after[0].rental_fee,
      deliveryFee: after[0].delivery_fee,
      extraFee: after[0].extra_fee,
      violationTotal: await violationTotalOf(id, client),
    });
    await client.query(`UPDATE rentals SET total_amount = $2 WHERE id = $1`, [id, total]);

    // Đơn chuyển sang active/completed/cancelled -> đồng bộ trạng thái xe
    await syncCarStatus(after[0].car_id, client);
    if (before.car_id !== after[0].car_id) {
      await syncCarStatus(before.car_id, client);
    }

    const { rows } = await client.query(`${SELECT_RENTALS} WHERE r.id = $1`, [id]);
    return rentalFromRow(rows[0]);
  });

  res.json(rental);
}));

// -------------------------------------------------------------- COMPLETE
/** POST /api/rentals/:id/complete — trả xe, chốt km/nhiên liệu/phụ phí. */
router.post('/:id/complete', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const { endKm, extraFee = 0, endFuel, paymentStatus } = req.body || {};

  const result = await withTransaction(async (client) => {
    const { rows: current } = await client.query(`SELECT * FROM rentals WHERE id = $1 FOR UPDATE`, [id]);
    const rental = current[0];
    if (!rental) throw notFound('Không tìm thấy đơn thuê.');
    if (rental.status === 'completed') throw conflict('Đơn thuê này đã được hoàn tất trước đó.');
    if (rental.status === 'cancelled') throw conflict('Đơn thuê đã bị huỷ, không thể hoàn tất.');

    const endKmNum = Math.round(Number(endKm));
    if (!Number.isFinite(endKmNum)) throw badRequest('Số km lúc trả xe không hợp lệ.');
    if (endKmNum < rental.start_km) {
      throw badRequest(`Số km lúc trả (${endKmNum.toLocaleString('vi-VN')}) không thể nhỏ hơn số km lúc nhận (${rental.start_km.toLocaleString('vi-VN')}).`);
    }

    const extra = Math.round(Number(extraFee) || 0);
    if (extra < 0) throw badRequest('Phụ phí không được là số âm.');

    // extra_fee được GHI ĐÈ (không cộng dồn), rồi tổng tiền tính lại từ công thức gốc
    const total = computeTotal({
      rentalFee: rental.rental_fee,
      deliveryFee: rental.delivery_fee,
      extraFee: extra,
      violationTotal: await violationTotalOf(id, client),
    });

    await client.query(
      `UPDATE rentals
          SET end_km = $2, end_fuel = $3, extra_fee = $4, total_amount = $5,
              payment_status = COALESCE($6, payment_status),
              status = 'completed', returned_at = NOW()
        WHERE id = $1`,
      [id, endKmNum, endFuel || null, extra, total, paymentStatus || null]
    );

    // Odometer xe chỉ được tăng
    await client.query(`UPDATE cars SET km = GREATEST(km, $2) WHERE id = $1`, [rental.car_id, endKmNum]);
    await syncCarStatus(rental.car_id, client);

    const { rows } = await client.query(`${SELECT_RENTALS} WHERE r.id = $1`, [id]);
    return rentalFromRow(rows[0]);
  });

  res.json(result);
}));

// ------------------------------------------------------------ VIOLATIONS
/** POST /api/rentals/:id/violations */
router.post('/:id/violations', asyncRoute(async (req, res) => {
  const rentalId = req.params.id;
  const { date, description, amount, evidenceUrl, status } = req.body || {};
  if (!date) throw badRequest('Vui lòng chọn ngày vi phạm.');

  const result = await withTransaction(async (client) => {
    const { rows: exists } = await client.query(`SELECT id FROM rentals WHERE id = $1 FOR UPDATE`, [rentalId]);
    if (!exists[0]) throw notFound('Không tìm thấy đơn thuê.');

    const { rows } = await client.query(
      `INSERT INTO violations (id, rental_id, date, description, amount, evidence_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [randomId(), rentalId, date, description || '', Math.round(Number(amount) || 0),
       evidenceUrl || null, status === 'paid' ? 'paid' : 'unpaid']
    );
    await recalcTotal(rentalId, client);
    return violationFromRow(rows[0]);
  });

  res.status(201).json(result);
}));

/** PATCH /api/rentals/:rentalId/violations/:violationId */
router.patch('/:rentalId/violations/:violationId', asyncRoute(async (req, res) => {
  const { rentalId, violationId } = req.params;
  const { date, description, amount, evidenceUrl, status } = req.body || {};

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE violations
          SET date = COALESCE($3, date),
              description = COALESCE($4, description),
              amount = COALESCE($5, amount),
              evidence_url = $6,
              status = COALESCE($7, status)
        WHERE id = $1 AND rental_id = $2
        RETURNING *`,
      [violationId, rentalId, date || null, description ?? null,
       amount === undefined ? null : Math.round(Number(amount) || 0),
       evidenceUrl || null, status || null]
    );
    if (!rows[0]) throw notFound('Không tìm thấy vi phạm này.');
    await recalcTotal(rentalId, client);
    return violationFromRow(rows[0]);
  });

  res.json(result);
}));

/** DELETE /api/rentals/:rentalId/violations/:violationId */
router.delete('/:rentalId/violations/:violationId', asyncRoute(async (req, res) => {
  const { rentalId, violationId } = req.params;
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `DELETE FROM violations WHERE id = $1 AND rental_id = $2`,
      [violationId, rentalId]
    );
    if (rowCount === 0) throw notFound('Không tìm thấy vi phạm này.');
    await recalcTotal(rentalId, client);
  });
  res.json({ ok: true });
}));

async function recalcTotal(rentalId, client) {
  const { rows } = await client.query(`SELECT * FROM rentals WHERE id = $1`, [rentalId]);
  const r = rows[0];
  const total = computeTotal({
    rentalFee: r.rental_fee,
    deliveryFee: r.delivery_fee,
    extraFee: r.extra_fee,
    violationTotal: await violationTotalOf(rentalId, client),
  });
  await client.query(`UPDATE rentals SET total_amount = $2 WHERE id = $1`, [rentalId, total]);
}

// ---------------------------------------------------------------- DELETE
router.delete('/:id', asyncRoute(async (req, res) => {
  const removed = await withTransaction(async (client) => {
    const { rows } = await client.query(`DELETE FROM rentals WHERE id = $1 RETURNING car_id`, [req.params.id]);
    if (!rows[0]) throw notFound('Không tìm thấy đơn thuê.');
    await syncCarStatus(rows[0].car_id, client);
    return true;
  });
  res.json({ ok: removed });
}));

export default router;
