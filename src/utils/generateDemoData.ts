import type { Car, Customer, Owner, Expense, Rental, Violation } from '../context/AppContext';

// Sample data pools for realistic Vietnamese car rental business
const BRAND_MODELS: { brand: string; name: string; seats: number; priceHour: number; priceDay: number; priceWeek: number }[] = [
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

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngo', 'Dương', 'Lý'];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Minh', 'Hoàng', 'Đức', 'Anh', 'Thanh', 'Tuấn', 'Phương', 'Khánh', 'Ngọc', 'Quốc'];
const LAST_NAMES = ['Hùng', 'Cường', 'Nam', 'Long', 'Thành', 'Phúc', 'Phương', 'Trinh', 'Linh', 'Trang', 'Hà', 'Vy', 'Đạt', 'Hiếu', 'Thảo', 'Duy', 'Sơn', 'Tấn', 'Sang'];

const PROVINCES_PLATES = ['51F', '51G', '30G', '30H', '43A', '29A', '60A', '61A', '65A', '79A', '92A', '72A'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomName(): string {
  return `${getRandomElement(FIRST_NAMES)} ${getRandomElement(MIDDLE_NAMES)} ${getRandomElement(LAST_NAMES)}`;
}

function getRandomPhone(): string {
  const prefixes = ['090', '091', '098', '097', '093', '088', '039', '077'];
  return `${getRandomElement(prefixes)}${getRandomInt(1000000, 9999999)}`;
}

function getRandomCCCD(): string {
  return `079${getRandomInt(100000000, 999999999)}`;
}

function getRandomPlate(): string {
  const prov = getRandomElement(PROVINCES_PLATES);
  const num1 = getRandomInt(100, 999);
  const num2 = getRandomInt(10, 99);
  return `${prov}-${num1}.${num2}`;
}

export function generate500DemoDataset() {
  // 1. Generate 30 Owners
  const owners: Owner[] = [];
  for (let i = 1; i <= 30; i++) {
    owners.push({
      id: i.toString(),
      name: i === 1 ? 'Nguyễn Thị E' : i === 2 ? 'Toyota Gia Định' : i === 3 ? 'Trần Hùng' : getRandomName(),
      phone: i === 1 ? '0901234567' : i === 2 ? '0907654321' : i === 3 ? '0988888888' : getRandomPhone(),
      address: `${getRandomInt(1, 999)} Nguyễn Trãi, Phường ${getRandomInt(1, 15)}, Quận ${getRandomInt(1, 12)}, TP.HCM`,
      notes: i % 3 === 0 ? 'Đối tác góp xe 7 chỗ cao cấp.' : 'Chủ xe cá nhân uy tín, bảo dưỡng định kỳ.',
      image: `https://images.unsplash.com/photo-${1535713875002 + i}?auto=format&fit=crop&w=150&q=80`,
      commissionRate: getRandomElement([70, 75, 80, 85])
    });
  }

  // 2. Generate 50 Cars
  const cars: Car[] = [];
  const carImages = [
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1502877338535-494e508892f3?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80'
  ];

  for (let i = 0; i < 50; i++) {
    const model = BRAND_MODELS[i % BRAND_MODELS.length];
    const owner = owners[i % owners.length];
    const plate = i === 0 ? '51F-123.45' : i === 1 ? '30G-789.10' : i === 2 ? '51G-001.23' : i === 3 ? '29A-456.78' : getRandomPlate();
    
    cars.push({
      id: plate,
      name: model.name,
      brand: model.brand,
      year: getRandomElement(['2020', '2021', '2022', '2023']),
      seats: model.seats,
      status: i % 5 === 0 ? 'rented' : i % 8 === 0 ? 'maintenance' : i % 15 === 0 ? 'suspended' : 'ready',
      color: getRandomElement(COLORS),
      image: carImages[i % carImages.length],
      km: getRandomInt(8000, 95000),
      ownerPhone: owner.phone,
      expiryRegistration: `2026-${getRandomInt(8, 12).toString().padStart(2, '0')}-${getRandomInt(10, 28).toString().padStart(2, '0')}`,
      expiryInsurance: `2026-${getRandomInt(8, 12).toString().padStart(2, '0')}-${getRandomInt(10, 28).toString().padStart(2, '0')}`,
      expiryLicense: `2027-${getRandomInt(1, 12).toString().padStart(2, '0')}-${getRandomInt(10, 28).toString().padStart(2, '0')}`,
      pricePerHour: model.priceHour,
      pricePerDay: model.priceDay,
      pricePerWeek: model.priceWeek
    });
  }

  // 3. Generate 80 Customers
  const customers: Customer[] = [];
  for (let i = 1; i <= 80; i++) {
    const name = i === 1 ? 'Nguyễn Văn A' : i === 2 ? 'Trần Thị B' : i === 3 ? 'Lê Văn C' : getRandomName();
    const phone = i === 1 ? '0901234567' : i === 2 ? '0988888888' : i === 3 ? '0912345678' : getRandomPhone();
    customers.push({
      id: i.toString(),
      name,
      phone,
      license: `GPLX: 790${getRandomInt(100000000, 999999999)}`,
      cccd: getRandomCCCD(),
      address: `${getRandomInt(1, 500)} Đường Lê Văn Lương, Quận 7, TP.HCM`,
      classification: i % 7 === 0 ? 'warning' : i % 4 === 0 ? 'vip' : 'normal',
      notes: i % 7 === 0 ? 'Cảnh báo: Từng có nợ đọng cần nhắc nhở.' : i % 4 === 0 ? 'Khách hàng VIP, thuê thường xuyên.' : 'Giao dịch chuẩn mực.',
      activeRentals: getRandomInt(0, 1),
      totalRentals: getRandomInt(1, 15),
      status: i % 10 === 0 ? 'expired' : 'verified',
      statusText: i % 10 === 0 ? 'GPLX hết hạn' : 'Đã xác minh',
      image: `https://images.unsplash.com/photo-${1535713875002 + (i % 10)}?auto=format&fit=crop&w=150&q=80`
    });
  }

  // 4. Generate 500 Rentals (spanning Jan 2026 to July 2026)
  const rentals: Rental[] = [];
  const violationsList: Violation[] = [
    { id: 'v1', description: 'Chạy quá tốc độ 10-20km/h (Phạt nguội cao tốc)', date: '2026-06-12', amount: 4000000, status: 'unpaid' },
    { id: 'v2', description: 'Đỗ xe nơi có biển cấm đỗ', date: '2026-05-20', amount: 900000, status: 'paid' },
    { id: 'v3', description: 'Hỏng trầy xước cản trước', date: '2026-06-01', amount: 1500000, status: 'paid' },
    { id: 'v4', description: 'Đi vào làn đường xe buýt BRT', date: '2026-04-15', amount: 2500000, status: 'unpaid' }
  ];

  for (let i = 1; i <= 500; i++) {
    const id = `RNT-${(5000 + i).toString()}`;
    const car = cars[i % cars.length];
    const customer = customers[i % customers.length];
    const owner = owners.find(o => o.phone === car.ownerPhone);
    const commRate = owner?.commissionRate ?? 75;

    const month = getRandomInt(1, 7);
    const day = getRandomInt(1, 28);
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const endDayStr = Math.min(day + getRandomInt(1, 5), 28).toString().padStart(2, '0');

    const startDate = `2026-${monthStr}-${dayStr}T08:00`;
    const endDate = `2026-${monthStr}-${endDayStr}T17:00`;

    const durDays = Math.max(1, parseInt(endDayStr) - parseInt(dayStr));
    const rentalFee = durDays * car.pricePerDay;
    const deliveryFee = i % 3 === 0 ? 150000 : 0;
    const deposit = 10000000;
    const extraFee = i % 10 === 0 ? 300000 : 0;
    const ownerCommissionAmount = Math.round((rentalFee * commRate) / 100);

    const hasViolation = i % 18 === 0;
    const violations = hasViolation ? [getRandomElement(violationsList)] : undefined;
    const violationTotal = violations ? violations.reduce((s, v) => s + v.amount, 0) : 0;
    const totalAmount = rentalFee + deliveryFee + extraFee + violationTotal;

    const status: Rental['status'] = i <= 15 ? 'pending' : i <= 40 ? 'active' : i === 41 ? 'cancelled' : 'completed';
    const paymentStatus: Rental['paymentStatus'] = status === 'pending' ? 'deposit' : status === 'active' ? (i % 2 === 0 ? 'deposit' : 'debt') : 'paid';

    const createdAt = `2026-${monthStr}-${Math.max(1, day - 1).toString().padStart(2, '0')}T09:30`;
    const deliveredAt = (status === 'active' || status === 'completed') ? startDate : undefined;
    const returnedAt = status === 'completed' ? endDate : undefined;

    rentals.push({
      id,
      carId: car.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      startDate,
      endDate,
      rentalFee,
      deliveryFee,
      deposit,
      extraFee,
      totalAmount,
      paymentStatus,
      status,
      startKm: car.km - getRandomInt(500, 3000),
      endKm: status === 'completed' ? car.km : undefined,
      startFuel: '8/8 (Đầy)',
      endFuel: status === 'completed' ? '8/8 (Đầy)' : undefined,
      source: 'system',
      ownerCommissionAmount,
      violations,
      createdAt,
      deliveredAt,
      returnedAt,
      conditionImages: [
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80'
      ]
    });
  }

  // 5. Generate 150 Expenses
  const expenses: Expense[] = [];
  const categories = ['Bảo dưỡng', 'Sửa chữa', 'Vệ sinh', 'Giấy tờ', 'Chiết khấu chủ xe', 'Khác'];
  const expenseTitles = [
    'Thay nhớt định kỳ', 'Thay 4 lốp Michelin mới', 'Rửa xe + dọn nội thất',
    'Gia hạn bảo hiểm TNDS', 'Đăng kiểm xe định kỳ', 'Sửa phanh đĩa trước',
    'Thanh toán chi trả doanh thu cho chủ xe', 'Bảo dưỡng điều hòa không khí', 'Mua thảm lót sàn da 5D'
  ];

  for (let i = 1; i <= 150; i++) {
    const car = cars[i % cars.length];
    const monthStr = getRandomInt(1, 7).toString().padStart(2, '0');
    const dayStr = getRandomInt(1, 28).toString().padStart(2, '0');
    const category = getRandomElement(categories);

    expenses.push({
      id: (1000 + i).toString(),
      title: getRandomElement(expenseTitles),
      amount: getRandomElement([150000, 350000, 850000, 1500000, 2500000, 4800000, 8000000]),
      category,
      date: `2026-${monthStr}-${dayStr}`,
      ref: category === 'Chiết khấu chủ xe' ? `Chủ xe #${getRandomInt(1, 30)}` : car.id,
      location: 'Gara Ô tô Quốc Tế'
    });
  }

  return { owners, cars, customers, rentals, expenses };
}
