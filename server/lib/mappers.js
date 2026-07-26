/**
 * Chuyển đổi giữa cột snake_case của PostgreSQL và field camelCase của frontend.
 * Mỗi entity khai báo 1 lần ở đây, tránh viết tay SQL lặp lại.
 */

/** ISO string hoặc null — dùng cho các cột TIMESTAMPTZ. */
const iso = (v) => (v instanceof Date ? v.toISOString() : v ?? undefined);

/** 'YYYY-MM-DDTHH:mm' theo giờ địa phương — khớp với <input type="datetime-local">. */
export function toLocalInput(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const undef = (v) => (v === null ? undefined : v);

// ------------------------------------------------------------------ OWNER
export const ownerFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  address: r.address,
  notes: r.notes,
  image: r.image,
  commissionRate: r.commission_rate,
});

export const OWNER_COLUMNS = {
  name: 'name',
  phone: 'phone',
  address: 'address',
  notes: 'notes',
  image: 'image',
  commissionRate: 'commission_rate',
};

// -------------------------------------------------------------------- CAR
export const carFromRow = (r) => ({
  id: r.id,
  name: r.name,
  brand: r.brand,
  year: r.year,
  seats: r.seats,
  status: r.status,
  color: r.color,
  image: r.image,
  km: r.km,
  customer: undef(r.customer),
  timeRemaining: undef(r.time_remaining),
  ownerPhone: r.owner_phone,
  expiryRegistration: r.expiry_registration || '',
  expiryInsurance: r.expiry_insurance || '',
  expiryLicense: r.expiry_license || '',
  pricePerHour: r.price_per_hour,
  pricePerDay: r.price_per_day,
  pricePerWeek: r.price_per_week,
});

export const CAR_COLUMNS = {
  name: 'name',
  brand: 'brand',
  year: 'year',
  seats: 'seats',
  status: 'status',
  color: 'color',
  image: 'image',
  km: 'km',
  customer: 'customer',
  timeRemaining: 'time_remaining',
  ownerPhone: 'owner_phone',
  expiryRegistration: 'expiry_registration',
  expiryInsurance: 'expiry_insurance',
  expiryLicense: 'expiry_license',
  pricePerHour: 'price_per_hour',
  pricePerDay: 'price_per_day',
  pricePerWeek: 'price_per_week',
};

// --------------------------------------------------------------- CUSTOMER
export const customerFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  license: r.license,
  cccd: r.cccd,
  address: r.address,
  classification: r.classification,
  notes: r.notes,
  status: r.status,
  statusText: r.status_text,
  image: r.image,
  // Từ view customers_with_stats — tính động, không bao giờ lệch.
  activeRentals: r.active_rentals ?? 0,
  totalRentals: r.total_rentals ?? 0,
});

export const CUSTOMER_COLUMNS = {
  name: 'name',
  phone: 'phone',
  license: 'license',
  cccd: 'cccd',
  address: 'address',
  classification: 'classification',
  notes: 'notes',
  status: 'status',
  statusText: 'status_text',
  image: 'image',
};

// -------------------------------------------------------------- VIOLATION
export const violationFromRow = (r) => ({
  id: r.id,
  date: r.date,
  description: r.description,
  amount: r.amount,
  evidenceUrl: undef(r.evidence_url),
  status: r.status,
});

// ----------------------------------------------------------------- RENTAL
export const rentalFromRow = (r) => ({
  id: r.id,
  carId: r.car_id,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  startDate: toLocalInput(r.start_date),
  endDate: toLocalInput(r.end_date),
  rentalFee: r.rental_fee,
  deliveryFee: r.delivery_fee,
  deposit: r.deposit,
  extraFee: r.extra_fee,
  totalAmount: r.total_amount,
  paymentStatus: r.payment_status,
  status: r.status,
  startKm: r.start_km,
  endKm: undef(r.end_km),
  startFuel: r.start_fuel,
  endFuel: undef(r.end_fuel),
  source: r.source,
  fileUrl: undef(r.file_url),
  fileName: undef(r.file_name),
  ownerCommissionAmount: r.owner_commission_amount,
  conditionImages: r.condition_images || [],
  createdAt: iso(r.created_at),
  deliveredAt: iso(r.delivered_at),
  returnedAt: iso(r.returned_at),
  violations: r.violations || [],
});

export const RENTAL_COLUMNS = {
  carId: 'car_id',
  customerName: 'customer_name',
  customerPhone: 'customer_phone',
  startDate: 'start_date',
  endDate: 'end_date',
  rentalFee: 'rental_fee',
  deliveryFee: 'delivery_fee',
  deposit: 'deposit',
  extraFee: 'extra_fee',
  totalAmount: 'total_amount',
  paymentStatus: 'payment_status',
  status: 'status',
  startKm: 'start_km',
  endKm: 'end_km',
  startFuel: 'start_fuel',
  endFuel: 'end_fuel',
  source: 'source',
  fileUrl: 'file_url',
  fileName: 'file_name',
  ownerCommissionAmount: 'owner_commission_amount',
  conditionImages: 'condition_images',
  deliveredAt: 'delivered_at',
  returnedAt: 'returned_at',
};

// ----------------------------------------------------------------- DRIVER
export const driverFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  licenseNumber: r.license_number,
  licenseClass: r.license_class,
  status: r.status,
  address: undef(r.address),
  notes: undef(r.notes),
  totalTrips: r.total_trips ?? 0,
  assignedCarId: undef(r.assigned_car_id),
  avatar: undef(r.avatar),
  commissionRate: r.commission_rate,
});

export const DRIVER_COLUMNS = {
  name: 'name',
  phone: 'phone',
  licenseNumber: 'license_number',
  licenseClass: 'license_class',
  status: 'status',
  address: 'address',
  notes: 'notes',
  assignedCarId: 'assigned_car_id',
  avatar: 'avatar',
  commissionRate: 'commission_rate',
};

// ---------------------------------------------------------- SERVICE ORDER
export const serviceOrderFromRow = (r) => ({
  id: r.id,
  carId: r.car_id,
  driverId: r.driver_id || '',
  driverName: r.driver_name,
  driverPhone: r.driver_phone,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  pickupLocation: undef(r.pickup_location),
  dropoffLocation: undef(r.dropoff_location),
  serviceDate: toLocalInput(r.service_date),
  startKm: r.start_km,
  endKm: r.end_km,
  distanceKm: r.distance_km,
  pricePerKm: r.price_per_km,
  extraFee: r.extra_fee,
  totalAmount: r.total_amount,
  driverCommissionRate: r.driver_commission_rate,
  driverCommissionAmount: r.driver_commission_amount,
  paymentStatus: r.payment_status,
  status: r.status,
  notes: undef(r.notes),
  createdAt: iso(r.created_at),
});

export const SERVICE_ORDER_COLUMNS = {
  carId: 'car_id',
  driverId: 'driver_id',
  driverName: 'driver_name',
  driverPhone: 'driver_phone',
  customerName: 'customer_name',
  customerPhone: 'customer_phone',
  pickupLocation: 'pickup_location',
  dropoffLocation: 'dropoff_location',
  serviceDate: 'service_date',
  startKm: 'start_km',
  endKm: 'end_km',
  distanceKm: 'distance_km',
  pricePerKm: 'price_per_km',
  extraFee: 'extra_fee',
  totalAmount: 'total_amount',
  driverCommissionRate: 'driver_commission_rate',
  driverCommissionAmount: 'driver_commission_amount',
  paymentStatus: 'payment_status',
  status: 'status',
  notes: 'notes',
};

// ---------------------------------------------------------------- EXPENSE
export const expenseFromRow = (r) => ({
  id: r.id,
  title: r.title,
  amount: r.amount,
  category: r.category,
  date: r.date,
  ref: r.ref,
  location: undef(r.location),
});

export const EXPENSE_COLUMNS = {
  title: 'title',
  amount: 'amount',
  category: 'category',
  date: 'date',
  ref: 'ref',
  location: 'location',
};

// ------------------------------------------------------------------ IMAGE
export const imageFromRow = (r) => ({
  id: r.id,
  url: r.url,
  name: r.name,
  usedIn: r.used_in ?? null,
  sizeBytes: r.size_bytes,
  mimeType: r.mime_type,
});

// --------------------------------------------------------------- SETTINGS
export const settingsFromRow = (r) => ({
  logo: r.logo,
  logoHistory: r.logo_history || ['Auto'],
  favicon: r.favicon,
  primaryColor: r.primary_color,
  contractTerms: r.contract_terms,
});

export const SETTINGS_COLUMNS = {
  logo: 'logo',
  logoHistory: 'logo_history',
  favicon: 'favicon',
  primaryColor: 'primary_color',
  contractTerms: 'contract_terms',
};

// ---------------------------------------------------------------- SECURITY
export const securityLogFromRow = (r) => ({
  id: r.id,
  type: r.type,
  message: r.message,
  username: r.username,
  timestamp: iso(r.created_at),
});

/**
 * Sinh câu UPDATE động chỉ với những field client thực sự gửi lên.
 * Trả về null nếu không có gì để cập nhật.
 */
export function buildUpdate(table, columnMap, patch, idValue, idColumn = 'id') {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    let value = patch[key];
    if (value === undefined) value = null;
    if (column === 'condition_images' || column === 'logo_history') {
      value = JSON.stringify(value ?? []);
    }
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }
  if (sets.length === 0) return null;
  values.push(idValue);
  return {
    text: `UPDATE ${table} SET ${sets.join(', ')} WHERE ${idColumn} = $${values.length} RETURNING *`,
    values,
  };
}
