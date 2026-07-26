import { withTransaction } from '../db.js';
import { randomId } from './ids.js';

// ============================================================
// Bộ sinh dữ liệu mẫu — chạy phía SERVER để ghi thẳng vào PostgreSQL.
// Khác bản cũ ở frontend: biển số / SĐT được đảm bảo KHÔNG TRÙNG, và
// trạng thái xe được suy ra từ đơn thuê nên không còn cảnh xe 'rented'
// mà chẳng có hợp đồng nào đang chạy.
// ============================================================

const BRAND_MODELS = [
  { brand: 'Mazda', name: 'Mazda 3 2023', seats: 5, priceHour: 100000, priceDay: 800000, priceWeek: 5000000 },
  { brand: 'Mazda', name: 'Mazda CX-5 2022', seats: 5, priceHour: 130000, priceDay: 1000000, priceWeek: 6500000 },
  { brand: 'Toyota', name: 'Toyota Vios 2023', seats: 5, priceHour: 90000, priceDay: 700000, priceWeek: 4500000 },
  { brand: 'Toyota', name: 'Toyota Fortuner 2022', seats: 7, priceHour: 160000, priceDay: 1300000, priceWeek: 8500000 },
  { brand: 'Toyota', name: 'Toyota Innova Cross 2023', seats: 8, priceHour: 150000, priceDay: 1200000, priceWeek: 7800000 },
  { brand: 'Honda', name: 'Honda City 2023', seats: 5, priceHour: 95000, priceDay: 750000, priceWeek: 4800000 },
  { brand: 'Honda', name: 'Honda CR-V 2022', seats: 7, priceHour: 150000, priceDay: 1200000, priceWeek: 7800000 },
  { brand: 'Kia', name: 'Kia Cerato 2021', seats: 5, priceHour: 100000, priceDay: 800000, priceWeek: 5000000 },
  { brand: 'Kia', name: 'Kia Carnival 2023', seats: 7, priceHour: 250000, priceDay: 2000000, priceWeek: 13000000 },
  { brand: 'Kia', name: 'Kia Seltos 2022', seats: 5, priceHour: 110000, priceDay: 900000, priceWeek: 5800000 },
  { brand: 'Hyundai', name: 'Hyundai Accent 2023', seats: 5, priceHour: 90000, priceDay: 700000, priceWeek: 4500000 },
  { brand: 'Hyundai', name: 'Hyundai Santa Fe 2022', seats: 7, priceHour: 180000, priceDay: 1400000, priceWeek: 9000000 },
  { brand: 'VinFast', name: 'VinFast VF8 2023 (Điện)', seats: 5, priceHour: 150000, priceDay: 1200000, priceWeek: 7500000 },
  { brand: 'VinFast', name: 'VinFast VF9 2023 (Điện)', seats: 7, priceHour: 220000, priceDay: 1800000, priceWeek: 11500000 },
  { brand: 'Ford', name: 'Ford Ranger XLS 2022', seats: 5, priceHour: 130000, priceDay: 1000000, priceWeek: 6500000 },
  { brand: 'Ford', name: 'Ford Everest 2023', seats: 7, priceHour: 200000, priceDay: 1600000, priceWeek: 10000000 },
  { brand: 'Mercedes', name: 'Mercedes-Benz C200 2022', seats: 5, priceHour: 300000, priceDay: 2500000, priceWeek: 16000000 },
  { brand: 'BMW', name: 'BMW 320i SportLine 2022', seats: 5, priceHour: 320000, priceDay: 2700000, priceWeek: 17500000 },
];

const COLORS = ['Trắng', 'Đen', 'Đỏ', 'Xanh bích', 'Xám xi măng', 'Bạc', 'Nâu đất', 'Vàng cát'];
const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Minh', 'Hoàng', 'Đức', 'Anh', 'Thanh', 'Tuấn', 'Phương', 'Khánh', 'Ngọc', 'Quốc'];
const LAST_NAMES = ['Hùng', 'Cường', 'Nam', 'Long', 'Thành', 'Phúc', 'Phương', 'Trinh', 'Linh', 'Trang', 'Hà', 'Vy', 'Đạt', 'Hiếu', 'Thảo', 'Duy', 'Sơn', 'Tấn', 'Sang'];
const PROVINCE_PLATES = ['51F', '51G', '30G', '30H', '43A', '29A', '60A', '61A', '65A', '79A', '92A', '72A'];
const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1502877338535-494e508892f3?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80',
];
const AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomName = () => `${pick(FIRST_NAMES)} ${pick(MIDDLE_NAMES)} ${pick(LAST_NAMES)}`;

/** Bộ sinh giá trị duy nhất — thay cho việc gọi random rồi mong không trùng. */
function uniqueGenerator(makeValue) {
  const seen = new Set();
  return (reserved = []) => {
    reserved.forEach((r) => seen.add(r));
    for (let attempt = 0; attempt < 10_000; attempt++) {
      const value = makeValue(attempt);
      if (!seen.has(value)) {
        seen.add(value);
        return value;
      }
    }
    throw new Error('Không sinh được giá trị duy nhất sau 10.000 lần thử.');
  };
}

const pad = (n, len = 2) => String(n).padStart(len, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const CONTRACT_TEMPLATE = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG CHO THUÊ XE TỰ LÁI

Bên A (Bên cho thuê): AutoManage Car Rental
Bên B (Bên thuê): {ten_khach_hang}
Số điện thoại: {so_dien_thoai}

ĐIỀU 1: NỘI DUNG HỢP ĐỒNG
Bên A đồng ý cho Bên B thuê xe ô tô tự lái có thông tin như sau:
- Dòng xe: {dong_xe}
- Biển số xe: {bien_so_xe}
- Thời gian thuê: Từ {ngay_thue} đến {ngay_tra}

ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG & ĐẶT CỌC
- Tổng tiền thuê: {tong_tien_thue} VNĐ
- Số tiền đặt cọc giữ xe: {tien_dat_coc} VNĐ (Bên A sẽ hoàn trả đầy đủ cho Bên B sau khi nhận lại xe nguyên vẹn).

ĐIỀU 3: QUY ĐỊNH SỬ DỤNG
1. Bên B cam kết sử dụng xe đúng mục đích, không chở hàng cấm, không lái xe khi say rượu bia.
2. Trả xe đúng giờ đã hẹn. Nếu quá giờ phạt 100.000 VNĐ/giờ.`;

/** Xoá dữ liệu nghiệp vụ theo đúng thứ tự khoá ngoại. */
async function truncateAll(client) {
  for (const t of ['violations', 'rentals', 'service_orders', 'expenses', 'drivers', 'cars', 'customers', 'owners', 'images']) {
    await client.query(`DELETE FROM ${t}`);
  }
  await client.query(`SELECT setval('rental_code_seq', 1, false)`);
  await client.query(`SELECT setval('service_code_seq', 1, false)`);
}

async function insertOwner(client, o) {
  await client.query(
    `INSERT INTO owners (id, name, phone, address, notes, image, commission_rate)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (phone) DO NOTHING`,
    [o.id, o.name, o.phone, o.address, o.notes, o.image, o.commissionRate]
  );
}

async function insertCar(client, c) {
  await client.query(
    `INSERT INTO cars (id, name, brand, year, seats, status, color, image, km, owner_phone,
       expiry_registration, expiry_insurance, expiry_license, price_per_hour, price_per_day, price_per_week)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (id) DO NOTHING`,
    [c.id, c.name, c.brand, c.year, c.seats, c.status, c.color, c.image, c.km, c.ownerPhone,
     c.expiryRegistration, c.expiryInsurance, c.expiryLicense, c.pricePerHour, c.pricePerDay, c.pricePerWeek]
  );
}

async function insertCustomer(client, c) {
  await client.query(
    `INSERT INTO customers (id, name, phone, license, cccd, address, classification, notes, status, status_text, image)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (phone) DO NOTHING`,
    [c.id, c.name, c.phone, c.license, c.cccd, c.address, c.classification, c.notes, c.status, c.statusText, c.image]
  );
}

async function insertRental(client, r) {
  await client.query(
    `INSERT INTO rentals (id, car_id, customer_name, customer_phone, start_date, end_date,
       rental_fee, delivery_fee, deposit, extra_fee, total_amount, payment_status, status,
       start_km, end_km, start_fuel, end_fuel, source, owner_commission_amount,
       condition_images, created_at, delivered_at, returned_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [r.id, r.carId, r.customerName, r.customerPhone, r.startDate, r.endDate,
     r.rentalFee, r.deliveryFee, r.deposit, r.extraFee, r.totalAmount, r.paymentStatus, r.status,
     r.startKm, r.endKm ?? null, r.startFuel, r.endFuel ?? null, r.source, r.ownerCommissionAmount,
     JSON.stringify(r.conditionImages || []), r.createdAt, r.deliveredAt ?? null, r.returnedAt ?? null]
  );
}

async function insertExpense(client, e) {
  await client.query(
    `INSERT INTO expenses (id, title, amount, category, date, ref, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [e.id, e.title, e.amount, e.category, e.date, e.ref, e.location ?? null]
  );
}

async function insertDriver(client, d) {
  await client.query(
    `INSERT INTO drivers (id, name, phone, license_number, license_class, status, address, notes,
       assigned_car_id, avatar, commission_rate)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (phone) DO NOTHING`,
    [d.id, d.name, d.phone, d.licenseNumber, d.licenseClass, d.status, d.address ?? null,
     d.notes ?? null, d.assignedCarId ?? null, d.avatar ?? null, d.commissionRate]
  );
}

async function insertServiceOrder(client, s) {
  await client.query(
    `INSERT INTO service_orders (id, car_id, driver_id, driver_name, driver_phone, customer_name,
       customer_phone, service_date, start_km, end_km, distance_km, price_per_km, extra_fee,
       total_amount, driver_commission_rate, driver_commission_amount, payment_status, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [s.id, s.carId, s.driverId, s.driverName, s.driverPhone, s.customerName, s.customerPhone,
     s.serviceDate, s.startKm, s.endKm, s.distanceKm, s.pricePerKm, s.extraFee, s.totalAmount,
     s.driverCommissionRate, s.driverCommissionAmount, s.paymentStatus, s.status, s.notes ?? null]
  );
}

async function ensureSettings(client) {
  await client.query(
    `INSERT INTO settings (id, contract_terms) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET contract_terms =
       CASE WHEN settings.contract_terms = '' THEN EXCLUDED.contract_terms ELSE settings.contract_terms END`,
    [CONTRACT_TEMPLATE]
  );
}

/**
 * Bộ dữ liệu khởi tạo nhỏ — tương ứng các INITIAL_* cũ trong AppContext.
 * Ngày tháng tính tương đối so với HÔM NAY, không còn cắm cứng tháng 7/2026.
 */
export async function seedBaseData({ truncate = false } = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return withTransaction(async (client) => {
    if (truncate) await truncateAll(client);
    await ensureSettings(client);

    const owners = [
      { id: randomId(), name: 'Nguyễn Thị E', phone: '0901234567', address: '12 Nguyễn Huệ, Quận 1, TP.HCM', notes: 'Sở hữu chiếc Mazda 3, rất cẩn thận bảo dưỡng.', image: AVATARS[4], commissionRate: 75 },
      { id: randomId(), name: 'Toyota Gia Định', phone: '0907654321', address: '300 Quốc Lộ 13, Bình Thạnh, TP.HCM', notes: 'Hợp tác ký gửi xe Toyota Vios và Honda CR-V.', image: AVATARS[1], commissionRate: 80 },
      { id: randomId(), name: 'Trần Hùng', phone: '0988888888', address: '55 Lê Văn Lương, Quận 7, TP.HCM', notes: 'Chủ xe Kia Cerato.', image: AVATARS[2], commissionRate: 70 },
    ];
    for (const o of owners) await insertOwner(client, o);

    const cars = [
      { id: '51F-123.45', name: 'Mazda 3 2022', brand: 'Mazda', year: '2022', seats: 5, status: 'ready', color: 'Trắng', image: CAR_IMAGES[0], km: 45210, ownerPhone: '0901234567', pricePerDay: 800000, pricePerHour: 100000, pricePerWeek: 5000000 },
      { id: '30G-789.10', name: 'Toyota Vios 2023', brand: 'Toyota', year: '2023', seats: 5, status: 'ready', color: 'Đen', image: CAR_IMAGES[1], km: 12500, ownerPhone: '0907654321', pricePerDay: 700000, pricePerHour: 90000, pricePerWeek: 4500000 },
      { id: '51G-001.23', name: 'Honda CR-V 2021', brand: 'Honda', year: '2021', seats: 7, status: 'maintenance', color: 'Đỏ', image: CAR_IMAGES[2], km: 80120, ownerPhone: '0907654321', pricePerDay: 1200000, pricePerHour: 150000, pricePerWeek: 7500000 },
      { id: '29A-456.78', name: 'Kia Cerato 2020', brand: 'Kia', year: '2020', seats: 5, status: 'ready', color: 'Xanh bích', image: CAR_IMAGES[3], km: 65000, ownerPhone: '0988888888', pricePerDay: 800000, pricePerHour: 100000, pricePerWeek: 5000000 },
    ].map((c, i) => ({
      ...c,
      expiryRegistration: ymd(addDays(today, 150 + i * 40)),
      expiryInsurance: ymd(addDays(today, i === 2 ? 12 : 90 + i * 30)), // 1 xe sắp hết hạn để thấy cảnh báo
      expiryLicense: ymd(addDays(today, 300 + i * 25)),
    }));
    for (const c of cars) await insertCar(client, c);

    const customers = [
      { id: randomId(), name: 'Nguyễn Văn A', phone: '0901234567', license: 'GPLX: 790123456789', cccd: '079090001234', address: '123 Nguyễn Trãi, Quận 5, TP.HCM', classification: 'vip', notes: 'Khách quen thân thiết, giao xe sạch sẽ.', status: 'verified', statusText: 'Đã xác minh', image: AVATARS[0] },
      { id: randomId(), name: 'Trần Thị B', phone: '0988888888', license: 'GPLX: 790987654321', cccd: '030090004567', address: '456 Lê Lợi, Quận 1, TP.HCM', classification: 'normal', notes: 'Thanh toán nhanh gọn.', status: 'verified', statusText: 'Đã xác minh', image: AVATARS[1] },
      { id: randomId(), name: 'Lê Văn C', phone: '0912345678', license: 'GPLX: 790111222333', cccd: '025090008888', address: '789 Trần Hưng Đạo, Quận 5, TP.HCM', classification: 'warning', notes: 'Lưu ý: Có lịch sử trả xe trễ 2 lần.', status: 'expired', statusText: 'GPLX hết hạn', image: AVATARS[2] },
      { id: randomId(), name: 'Phạm Minh D', phone: '0977665544', license: 'GPLX: 790555666777', cccd: '012090009999', address: '101 Cách Mạng Tháng Tám, Quận 3, TP.HCM', classification: 'normal', notes: 'Không có ghi chú gì đặc biệt.', status: 'verified', statusText: 'Đã xác minh', image: AVATARS[3] },
    ];
    for (const c of customers) await insertCustomer(client, c);

    // 1 đơn ĐANG CHẠY (bao trùm hôm nay) + 1 đơn đã hoàn tất + 1 đơn sắp tới
    const rentals = [
      {
        id: 'RNT-000001', carId: '51F-123.45', customerName: 'Nguyễn Văn A', customerPhone: '0901234567',
        startDate: `${ymd(addDays(today, -1))}T08:00`, endDate: `${ymd(addDays(today, 2))}T17:00`,
        rentalFee: 2400000, deliveryFee: 150000, deposit: 10000000, extraFee: 0, totalAmount: 2550000,
        paymentStatus: 'deposit', status: 'active', startKm: 45000, startFuel: '8/8',
        source: 'system', ownerCommissionAmount: 1800000,
        createdAt: `${ymd(addDays(today, -2))}T09:30`, deliveredAt: `${ymd(addDays(today, -1))}T08:00`,
      },
      {
        id: 'RNT-000002', carId: '30G-789.10', customerName: 'Trần Thị B', customerPhone: '0988888888',
        startDate: `${ymd(addDays(today, -12))}T08:00`, endDate: `${ymd(addDays(today, -8))}T17:00`,
        rentalFee: 2800000, deliveryFee: 150000, deposit: 10000000, extraFee: 300000, totalAmount: 3250000,
        paymentStatus: 'paid', status: 'completed', startKm: 11000, endKm: 12100,
        startFuel: '8/8', endFuel: '8/8', source: 'system', ownerCommissionAmount: 2240000,
        createdAt: `${ymd(addDays(today, -13))}T09:30`, deliveredAt: `${ymd(addDays(today, -12))}T08:00`,
        returnedAt: `${ymd(addDays(today, -8))}T17:00`,
      },
      {
        id: 'RNT-000003', carId: '29A-456.78', customerName: 'Phạm Minh D', customerPhone: '0977665544',
        startDate: `${ymd(addDays(today, 3))}T07:00`, endDate: `${ymd(addDays(today, 5))}T19:00`,
        rentalFee: 1600000, deliveryFee: 0, deposit: 10000000, extraFee: 0, totalAmount: 1600000,
        paymentStatus: 'deposit', status: 'pending', startKm: 65000, startFuel: '8/8',
        source: 'system', ownerCommissionAmount: 1120000,
        createdAt: `${ymd(today)}T10:00`,
      },
    ];
    for (const r of rentals) await insertRental(client, r);
    await client.query(`SELECT setval('rental_code_seq', 3)`);

    // Xe của đơn đang chạy phải ở trạng thái 'rented' — suy ra từ dữ liệu, không đặt tay
    await client.query(
      `UPDATE cars c SET status = 'rented', customer = r.customer_name
         FROM rentals r WHERE r.car_id = c.id AND r.status = 'active'`
    );

    const expenses = [
      { id: randomId(), title: 'Thay nhớt xe Mazda 3', amount: 850000, category: 'Bảo dưỡng', date: ymd(addDays(today, -3)), ref: '51F-123.45', location: 'Gara Mazda Cộng Hòa' },
      { id: randomId(), title: 'Rửa xe + dọn nội thất', amount: 200000, category: 'Vệ sinh', date: ymd(addDays(today, -1)), ref: '30G-789.10', location: 'Car Wash Q5' },
      { id: randomId(), title: 'Sửa chữa phanh trước Honda CR-V', amount: 2500000, category: 'Sửa chữa', date: ymd(addDays(today, -5)), ref: '51G-001.23', location: 'Gara Honda Kim Thanh' },
      { id: randomId(), title: 'Mua bảo hiểm TNDS mới', amount: 750000, category: 'Giấy tờ', date: ymd(today), ref: '29A-456.78', location: 'Bảo hiểm PVI' },
      { id: randomId(), title: 'Chiết khấu doanh thu cho chủ xe Nguyễn Thị E', amount: 1312500, category: 'Chiết khấu chủ xe', date: ymd(today), ref: 'Chủ xe Nguyễn Thị E', location: 'Chuyển khoản VCB' },
    ];
    for (const e of expenses) await insertExpense(client, e);

    const drivers = [
      { id: randomId(), name: 'Phạm Quốc Hùng', phone: '0912999888', licenseNumber: 'GPLX-790182938', licenseClass: 'B2', status: 'available', address: '15 Nguyễn Văn Linh, Q.7, TP.HCM', notes: 'Tài xế kinh nghiệm 5 năm, thông thuộc TP.HCM & miền Tây', assignedCarId: '51F-123.45', avatar: AVATARS[0], commissionRate: 80 },
      { id: randomId(), name: 'Trần Văn Minh', phone: '0908777666', licenseNumber: 'GPLX-790444555', licenseClass: 'C', status: 'on_trip', address: '88 Lê Trọng Tấn, Tân Phú, TP.HCM', notes: 'Chuyên chạy các chuyến đi xa liên tỉnh', assignedCarId: '30G-789.10', avatar: AVATARS[1], commissionRate: 75 },
      { id: randomId(), name: 'Nguyễn Tiến Dũng', phone: '0977112233', licenseNumber: 'GPLX-790666777', licenseClass: 'B2', status: 'off', address: '24 Hoàng Hoa Thám, Bình Thạnh, TP.HCM', notes: 'Lịch làm việc ca ngày', avatar: AVATARS[2], commissionRate: 80 },
    ];
    for (const d of drivers) await insertDriver(client, d);

    const serviceOrders = [
      { id: 'SRV-000001', carId: '51F-123.45', driverId: drivers[0].id, driverName: drivers[0].name, driverPhone: drivers[0].phone, customerName: 'Tài xế tự bắt khách', customerPhone: '---', serviceDate: `${ymd(addDays(today, -2))}T14:30`, startKm: 45100, endKm: 45125, distanceKm: 25, pricePerKm: 15000, extraFee: 30000, totalAmount: 405000, driverCommissionRate: 80, driverCommissionAmount: 324000, paymentStatus: 'paid', status: 'completed', notes: 'Chuyến đưa khách tự do' },
      { id: 'SRV-000002', carId: '30G-789.10', driverId: drivers[1].id, driverName: drivers[1].name, driverPhone: drivers[1].phone, customerName: 'Tài xế tự bắt khách', customerPhone: '---', serviceDate: `${ymd(addDays(today, -1))}T07:00`, startKm: 12400, endKm: 12510, distanceKm: 110, pricePerKm: 14000, extraFee: 120000, totalAmount: 1660000, driverCommissionRate: 75, driverCommissionAmount: 1245000, paymentStatus: 'unpaid', status: 'completed', notes: 'Chuyến Vũng Tàu, phụ phí vé trạm 120k' },
    ];
    for (const s of serviceOrders) await insertServiceOrder(client, s);
    await client.query(`SELECT setval('service_code_seq', 2)`);

    for (const url of CAR_IMAGES.slice(0, 4)) {
      await client.query(
        `INSERT INTO images (id, url, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [randomId(), url, 'Ảnh xe mẫu']
      );
    }

    return {
      owners: owners.length, cars: cars.length, customers: customers.length,
      rentals: rentals.length, expenses: expenses.length,
      drivers: drivers.length, serviceOrders: serviceOrders.length,
    };
  });
}

/**
 * Bộ dữ liệu lớn để kiểm thử hiệu năng & phân trang.
 * Đơn thuê của mỗi xe được sinh KHÔNG trùng khoảng thời gian, và tối đa
 * 1 đơn 'active' / xe — đúng như ràng buộc thật của hệ thống.
 */
export async function generateDemoDataset({
  ownerCount = 30, carCount = 50, customerCount = 80, rentalCount = 500, expenseCount = 150,
} = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextPlate = uniqueGenerator(() => `${pick(PROVINCE_PLATES)}-${randInt(100, 999)}.${randInt(10, 99)}`);
  const nextPhone = uniqueGenerator(() => `${pick(['090', '091', '098', '097', '093', '088', '039', '077'])}${randInt(1000000, 9999999)}`);

  return withTransaction(async (client) => {
    await truncateAll(client);
    await ensureSettings(client);

    // ---- Owners
    const owners = [];
    for (let i = 0; i < ownerCount; i++) {
      owners.push({
        id: randomId(),
        name: randomName(),
        phone: nextPhone(),
        address: `${randInt(1, 999)} Nguyễn Trãi, Phường ${randInt(1, 15)}, Quận ${randInt(1, 12)}, TP.HCM`,
        notes: i % 3 === 0 ? 'Đối tác góp xe 7 chỗ cao cấp.' : 'Chủ xe cá nhân uy tín, bảo dưỡng định kỳ.',
        image: pick(AVATARS),
        commissionRate: pick([70, 75, 80, 85]),
      });
    }
    for (const o of owners) await insertOwner(client, o);

    // ---- Cars (biển số đảm bảo duy nhất)
    const cars = [];
    for (let i = 0; i < carCount; i++) {
      const model = BRAND_MODELS[i % BRAND_MODELS.length];
      const owner = owners[i % owners.length];
      cars.push({
        id: nextPlate(),
        name: model.name,
        brand: model.brand,
        year: pick(['2020', '2021', '2022', '2023']),
        seats: model.seats,
        status: 'ready', // sẽ suy ra lại từ đơn thuê ở cuối
        color: pick(COLORS),
        image: CAR_IMAGES[i % CAR_IMAGES.length],
        km: randInt(8000, 95000),
        ownerPhone: owner.phone,
        expiryRegistration: ymd(addDays(today, randInt(-20, 400))),
        expiryInsurance: ymd(addDays(today, randInt(-10, 380))),
        expiryLicense: ymd(addDays(today, randInt(20, 500))),
        pricePerHour: model.priceHour,
        pricePerDay: model.priceDay,
        pricePerWeek: model.priceWeek,
      });
    }
    for (const c of cars) await insertCar(client, c);

    // ---- Customers (SĐT duy nhất)
    const customers = [];
    for (let i = 0; i < customerCount; i++) {
      customers.push({
        id: randomId(),
        name: randomName(),
        phone: nextPhone(),
        license: `GPLX: 790${randInt(100000000, 999999999)}`,
        cccd: `079${randInt(100000000, 999999999)}`,
        address: `${randInt(1, 500)} Đường Lê Văn Lương, Quận 7, TP.HCM`,
        classification: i % 7 === 0 ? 'warning' : i % 4 === 0 ? 'vip' : 'normal',
        notes: i % 7 === 0 ? 'Cảnh báo: Từng có nợ đọng cần nhắc nhở.' : i % 4 === 0 ? 'Khách hàng VIP, thuê thường xuyên.' : 'Giao dịch chuẩn mực.',
        status: i % 10 === 0 ? 'expired' : 'verified',
        statusText: i % 10 === 0 ? 'GPLX hết hạn' : 'Đã xác minh',
        image: pick(AVATARS),
      });
    }
    for (const c of customers) await insertCustomer(client, c);

    // ---- Rentals: mỗi xe một chuỗi thời gian lùi dần, không chồng lấn
    const VIOLATION_SAMPLES = [
      { description: 'Chạy quá tốc độ 10-20km/h (phạt nguội cao tốc)', amount: 4000000, status: 'unpaid' },
      { description: 'Đỗ xe nơi có biển cấm đỗ', amount: 900000, status: 'paid' },
      { description: 'Trầy xước cản trước', amount: 1500000, status: 'paid' },
      { description: 'Đi vào làn đường xe buýt BRT', amount: 2500000, status: 'unpaid' },
    ];

    const perCar = Math.max(1, Math.ceil(rentalCount / cars.length));
    const rentals = [];
    let seq = 0;

    for (const car of cars) {
      // ~25% xe có đơn đang chạy bao trùm hôm nay
      const hasActive = Math.random() < 0.25;
      // Con trỏ thời gian: nếu có đơn active thì bắt đầu từ tương lai gần
      let cursor = hasActive ? addDays(today, randInt(1, 3)) : addDays(today, -randInt(1, 10));

      for (let k = 0; k < perCar && rentals.length < rentalCount; k++) {
        const durationDays = randInt(1, 5);
        const end = new Date(cursor);
        const start = addDays(end, -durationDays);

        let status;
        if (k === 0 && hasActive) status = 'active';
        else if (start > today) status = 'pending';
        else if (Math.random() < 0.02) status = 'cancelled';
        else status = 'completed';

        // Đơn 'active' phải bao trùm hôm nay
        const realStart = status === 'active' ? addDays(today, -randInt(1, durationDays)) : start;
        const realEnd = status === 'active' ? addDays(today, randInt(1, 3)) : end;

        const owner = owners.find((o) => o.phone === car.ownerPhone);
        const customer = customers[randInt(0, customers.length - 1)];
        const rentalFee = durationDays * car.pricePerDay;
        const deliveryFee = Math.random() < 0.33 ? 150000 : 0;
        const extraFee = Math.random() < 0.1 ? 300000 : 0;

        const violations = Math.random() < 0.06 ? [pick(VIOLATION_SAMPLES)] : [];
        const violationTotal = violations.reduce((s, v) => s + v.amount, 0);

        seq += 1;
        const id = `RNT-${pad(seq, 6)}`;
        rentals.push({
          id,
          carId: car.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          startDate: `${ymd(realStart)}T08:00`,
          endDate: `${ymd(realEnd)}T17:00`,
          rentalFee,
          deliveryFee,
          deposit: 10000000,
          extraFee,
          totalAmount: rentalFee + deliveryFee + extraFee + violationTotal,
          paymentStatus: status === 'completed' ? 'paid' : status === 'active' ? pick(['deposit', 'debt']) : 'deposit',
          status,
          startKm: Math.max(0, car.km - randInt(500, 3000)),
          endKm: status === 'completed' ? car.km : undefined,
          startFuel: '8/8',
          endFuel: status === 'completed' ? '8/8' : undefined,
          source: 'system',
          ownerCommissionAmount: Math.round((rentalFee * (owner?.commissionRate ?? 75)) / 100),
          conditionImages: CAR_IMAGES.slice(0, 3),
          createdAt: `${ymd(addDays(realStart, -1))}T09:30`,
          deliveredAt: status === 'active' || status === 'completed' ? `${ymd(realStart)}T08:00` : undefined,
          returnedAt: status === 'completed' ? `${ymd(realEnd)}T17:00` : undefined,
          _violations: violations,
        });

        // Lùi con trỏ về trước, chừa khoảng trống để không chồng lấn đơn kế tiếp
        cursor = addDays(start, -randInt(1, 4));
      }
    }

    for (const r of rentals) {
      await insertRental(client, r);
      for (const v of r._violations) {
        await client.query(
          `INSERT INTO violations (id, rental_id, date, description, amount, status)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [randomId(), r.id, r.startDate.split('T')[0], v.description, v.amount, v.status]
        );
      }
    }
    await client.query(`SELECT setval('rental_code_seq', $1)`, [Math.max(seq, 1)]);

    // Trạng thái xe suy ra từ đơn đang chạy (không đặt tay -> không bao giờ lệch)
    await client.query(
      `UPDATE cars c SET status = 'rented', customer = r.customer_name
         FROM rentals r WHERE r.car_id = c.id AND r.status = 'active'`
    );
    // Rải một ít xe bảo trì / tạm ngưng trong số xe đang trống
    await client.query(
      `UPDATE cars SET status = 'maintenance'
        WHERE id IN (SELECT id FROM cars WHERE status = 'ready' ORDER BY random() LIMIT 4)`
    );
    await client.query(
      `UPDATE cars SET status = 'suspended'
        WHERE id IN (SELECT id FROM cars WHERE status = 'ready' ORDER BY random() LIMIT 2)`
    );

    // ---- Expenses
    const categories = ['Bảo dưỡng', 'Sửa chữa', 'Vệ sinh', 'Giấy tờ', 'Chiết khấu chủ xe', 'Khác'];
    const titles = [
      'Thay nhớt định kỳ', 'Thay 4 lốp Michelin mới', 'Rửa xe + dọn nội thất',
      'Gia hạn bảo hiểm TNDS', 'Đăng kiểm xe định kỳ', 'Sửa phanh đĩa trước',
      'Thanh toán chi trả doanh thu cho chủ xe', 'Bảo dưỡng điều hòa', 'Mua thảm lót sàn da 5D',
    ];
    for (let i = 0; i < expenseCount; i++) {
      const car = cars[i % cars.length];
      const category = pick(categories);
      await insertExpense(client, {
        id: randomId(),
        title: pick(titles),
        amount: pick([150000, 350000, 850000, 1500000, 2500000, 4800000, 8000000]),
        category,
        date: ymd(addDays(today, -randInt(0, 180))),
        ref: category === 'Chiết khấu chủ xe' ? `Chủ xe ${pick(owners).name}` : car.id,
        location: 'Gara Ô tô Quốc Tế',
      });
    }

    // ---- Drivers + service orders
    const drivers = [];
    for (let i = 0; i < 12; i++) {
      drivers.push({
        id: randomId(),
        name: randomName(),
        phone: nextPhone(),
        licenseNumber: `GPLX-790${randInt(100000, 999999)}`,
        licenseClass: pick(['B2', 'C', 'D']),
        status: pick(['available', 'on_trip', 'off']),
        address: `${randInt(1, 300)} Nguyễn Văn Linh, Q.7, TP.HCM`,
        notes: 'Tài xế hợp tác theo chuyến.',
        assignedCarId: cars[i % cars.length].id,
        avatar: pick(AVATARS),
        commissionRate: pick([70, 75, 80, 85]),
      });
    }
    for (const d of drivers) await insertDriver(client, d);

    let srvSeq = 0;
    for (let i = 0; i < 60; i++) {
      const driver = drivers[i % drivers.length];
      const car = cars[i % cars.length];
      const startKm = randInt(10000, 90000);
      const distance = randInt(10, 250);
      const pricePerKm = pick([12000, 14000, 15000, 18000]);
      const extraFee = pick([0, 30000, 60000, 120000]);
      const total = distance * pricePerKm + extraFee;
      srvSeq += 1;
      await insertServiceOrder(client, {
        id: `SRV-${pad(srvSeq, 6)}`,
        carId: car.id,
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        customerName: 'Tài xế tự bắt khách',
        customerPhone: '---',
        serviceDate: `${ymd(addDays(today, -randInt(0, 90)))}T${pad(randInt(6, 20))}:00`,
        startKm,
        endKm: startKm + distance,
        distanceKm: distance,
        pricePerKm,
        extraFee,
        totalAmount: total,
        driverCommissionRate: driver.commissionRate,
        driverCommissionAmount: Math.round((total * driver.commissionRate) / 100),
        paymentStatus: Math.random() < 0.7 ? 'paid' : 'unpaid',
        status: 'completed',
        notes: null,
      });
    }
    await client.query(`SELECT setval('service_code_seq', $1)`, [Math.max(srvSeq, 1)]);

    for (const url of CAR_IMAGES) {
      await client.query(
        `INSERT INTO images (id, url, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [randomId(), url, 'Ảnh xe mẫu']
      );
    }

    return {
      owners: owners.length,
      cars: cars.length,
      customers: customers.length,
      rentals: rentals.length,
      expenses: expenseCount,
      drivers: drivers.length,
      serviceOrders: srvSeq,
    };
  });
}

export { CONTRACT_TEMPLATE };
