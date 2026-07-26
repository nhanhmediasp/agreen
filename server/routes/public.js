import express from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { asyncRoute, badRequest, notFound } from '../lib/http.js';

const router = express.Router();

/**
 * Cổng tra cứu cho chủ xe — KHÔNG cần đăng nhập, nên phải siết chặt:
 *  1. Bắt buộc CẢ biển số VÀ số điện thoại (trước đây chỉ cần 1 trong 2).
 *  2. So khớp CHÍNH XÁC, không dùng `includes` (nhập "5" từng trả về toàn bộ đội xe).
 *  3. Rate limit để không thể quét sạch dữ liệu bằng brute-force.
 *  4. Chỉ trả về đúng các field cần thiết — không lộ giá thuê, tên khách, doanh thu.
 */
const lookupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 10 phút.' },
});

/** Bỏ mọi ký tự không phải chữ/số để '51F-123.45' == '51f12345'. */
const normalizeKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

router.post('/car-status', lookupLimiter, asyncRoute(async (req, res) => {
  const plateKey = normalizeKey(req.body?.plate);
  const phoneKey = normalizeKey(req.body?.phone);

  if (!plateKey || !phoneKey) {
    throw badRequest('Vui lòng nhập ĐỦ cả biển số xe và số điện thoại chủ xe để tra cứu.');
  }
  if (plateKey.length < 6 || phoneKey.length < 9) {
    throw badRequest('Biển số hoặc số điện thoại chưa đúng định dạng.');
  }

  const { rows } = await query(
    `SELECT c.id, c.name, c.brand, c.color, c.seats, c.km, c.status, c.image,
            c.expiry_registration, c.expiry_insurance, c.expiry_license,
            r.end_date AS expected_return
       FROM cars c
       LEFT JOIN rentals r ON r.car_id = c.id AND r.status = 'active'
      WHERE regexp_replace(lower(c.id), '[^a-z0-9]', '', 'g') = $1
        AND regexp_replace(lower(c.owner_phone), '[^a-z0-9]', '', 'g') = $2`,
    [plateKey, phoneKey]
  );

  if (!rows.length) {
    throw notFound('Không tìm thấy xe khớp với biển số và số điện thoại bạn nhập.');
  }

  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    color: r.color,
    seats: r.seats,
    km: r.km,
    status: r.status,
    image: r.image,
    expiryRegistration: r.expiry_registration || '',
    expiryInsurance: r.expiry_insurance || '',
    expiryLicense: r.expiry_license || '',
    expectedReturn: r.expected_return ? new Date(r.expected_return).toISOString() : null,
  })));
}));

export default router;
