import express from 'express';
import { query, withTransaction } from '../db.js';
import { asyncRoute, badRequest, notFound } from '../lib/http.js';
import { nextCode } from '../lib/ids.js';
import { serviceOrderFromRow } from '../lib/mappers.js';

const router = express.Router();

const DEFAULT_COMMISSION_RATE = 80;

/**
 * Tính cước + chiết khấu tài xế.
 * Dùng ?? thay vì || để KHÔNG biến chiết khấu 0% thành 80%.
 */
function computeFare(b, fallbackRate = DEFAULT_COMMISSION_RATE) {
  const startKm = Math.round(Number(b.startKm) || 0);
  const endKm = Math.round(Number(b.endKm) || 0);
  if (endKm < startKm) {
    throw badRequest(`Số km kết thúc (${endKm.toLocaleString('vi-VN')}) phải lớn hơn hoặc bằng số km bắt đầu (${startKm.toLocaleString('vi-VN')}).`);
  }

  const distanceKm = endKm - startKm;
  const pricePerKm = Math.round(Number(b.pricePerKm) || 0);
  const extraFee = Math.round(Number(b.extraFee) || 0);
  const totalAmount = Math.round(distanceKm * pricePerKm + extraFee);

  const rawRate = b.driverCommissionRate ?? fallbackRate;
  const rate = Number(rawRate);
  if (Number.isNaN(rate) || rate < 0 || rate > 100) {
    throw badRequest('Tỷ lệ chiết khấu tài xế phải nằm trong khoảng 0–100.');
  }

  return {
    startKm,
    endKm,
    distanceKm,
    pricePerKm,
    extraFee,
    totalAmount,
    driverCommissionRate: rate,
    driverCommissionAmount: Math.round((totalAmount * rate) / 100),
  };
}

router.get('/', asyncRoute(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM service_orders ORDER BY service_date DESC, created_at DESC`);
  res.json(rows.map(serviceOrderFromRow));
}));

router.post('/', asyncRoute(async (req, res) => {
  const b = req.body || {};
  if (!b.carId) throw badRequest('Vui lòng chọn xe phục vụ.');
  if (!b.serviceDate) throw badRequest('Vui lòng chọn thời gian chạy chuyến.');

  const order = await withTransaction(async (client) => {
    let driver = null;
    if (b.driverId) {
      const { rows } = await client.query(`SELECT * FROM drivers WHERE id = $1`, [b.driverId]);
      driver = rows[0] || null;
    }

    const fare = computeFare(b, driver?.commission_rate ?? DEFAULT_COMMISSION_RATE);
    const id = await nextCode('SRV', 'service_code_seq');

    await client.query(
      `INSERT INTO service_orders (
         id, car_id, driver_id, driver_name, driver_phone, customer_name, customer_phone,
         pickup_location, dropoff_location, service_date, start_km, end_km, distance_km,
         price_per_km, extra_fee, total_amount, driver_commission_rate, driver_commission_amount,
         payment_status, status, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        id, b.carId, driver?.id || null,
        driver?.name || b.driverName || 'Tài xế tự chạy',
        driver?.phone || b.driverPhone || '---',
        b.customerName || 'Tài xế tự bắt khách',
        b.customerPhone || '---',
        b.pickupLocation || null, b.dropoffLocation || null, b.serviceDate,
        fare.startKm, fare.endKm, fare.distanceKm, fare.pricePerKm, fare.extraFee,
        fare.totalAmount, fare.driverCommissionRate, fare.driverCommissionAmount,
        b.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        b.status || 'completed', b.notes || null,
      ]
    );

    // Odometer xe chỉ tăng
    await client.query(`UPDATE cars SET km = GREATEST(km, $2) WHERE id = $1`, [b.carId, fare.endKm]);

    const { rows } = await client.query(`SELECT * FROM service_orders WHERE id = $1`, [id]);
    return serviceOrderFromRow(rows[0]);
  });

  res.status(201).json(order);
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};

  const order = await withTransaction(async (client) => {
    const { rows: cur } = await client.query(`SELECT * FROM service_orders WHERE id = $1 FOR UPDATE`, [id]);
    const before = cur[0];
    if (!before) throw notFound('Không tìm thấy đơn dịch vụ.');

    let driver = null;
    const driverId = b.driverId !== undefined ? b.driverId : before.driver_id;
    if (driverId) {
      const { rows } = await client.query(`SELECT * FROM drivers WHERE id = $1`, [driverId]);
      driver = rows[0] || null;
    }

    // Gộp giá trị cũ + mới rồi tính lại toàn bộ số tiền dẫn xuất
    const merged = {
      startKm: b.startKm ?? before.start_km,
      endKm: b.endKm ?? before.end_km,
      pricePerKm: b.pricePerKm ?? before.price_per_km,
      extraFee: b.extraFee ?? before.extra_fee,
      driverCommissionRate: b.driverCommissionRate ?? before.driver_commission_rate,
    };
    const fare = computeFare(merged, before.driver_commission_rate);

    await client.query(
      `UPDATE service_orders SET
         car_id = COALESCE($2, car_id),
         driver_id = $3,
         driver_name = COALESCE($4, driver_name),
         driver_phone = COALESCE($5, driver_phone),
         customer_name = COALESCE($6, customer_name),
         customer_phone = COALESCE($7, customer_phone),
         pickup_location = $8,
         dropoff_location = $9,
         service_date = COALESCE($10, service_date),
         start_km = $11, end_km = $12, distance_km = $13,
         price_per_km = $14, extra_fee = $15, total_amount = $16,
         driver_commission_rate = $17, driver_commission_amount = $18,
         payment_status = COALESCE($19, payment_status),
         status = COALESCE($20, status),
         notes = $21
       WHERE id = $1`,
      [
        id, b.carId || null, driver?.id || (driverId || null),
        driver?.name || b.driverName || null,
        driver?.phone || b.driverPhone || null,
        b.customerName || null, b.customerPhone || null,
        b.pickupLocation !== undefined ? b.pickupLocation : before.pickup_location,
        b.dropoffLocation !== undefined ? b.dropoffLocation : before.dropoff_location,
        b.serviceDate || null,
        fare.startKm, fare.endKm, fare.distanceKm, fare.pricePerKm, fare.extraFee,
        fare.totalAmount, fare.driverCommissionRate, fare.driverCommissionAmount,
        b.paymentStatus || null, b.status || null,
        b.notes !== undefined ? b.notes : before.notes,
      ]
    );

    const carId = b.carId || before.car_id;
    await client.query(`UPDATE cars SET km = GREATEST(km, $2) WHERE id = $1`, [carId, fare.endKm]);

    const { rows } = await client.query(`SELECT * FROM service_orders WHERE id = $1`, [id]);
    return serviceOrderFromRow(rows[0]);
  });

  res.json(order);
}));

/** POST /api/service-orders/:id/toggle-payment */
router.post('/:id/toggle-payment', asyncRoute(async (req, res) => {
  const { rows } = await query(
    `UPDATE service_orders
        SET payment_status = CASE WHEN payment_status = 'paid' THEN 'unpaid' ELSE 'paid' END
      WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) throw notFound('Không tìm thấy đơn dịch vụ.');
  res.json(serviceOrderFromRow(rows[0]));
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const { rowCount } = await query(`DELETE FROM service_orders WHERE id = $1`, [req.params.id]);
  if (rowCount === 0) throw notFound('Không tìm thấy đơn dịch vụ.');
  res.json({ ok: true });
}));

export default router;
