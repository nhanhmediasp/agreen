import React, { createContext, useContext, useState, useEffect } from 'react';
import { generate500DemoDataset } from '../utils/generateDemoData';
import { mapRentalFromDB } from './rentalMapper';
import { csrfHeaders } from '../auth/clientAuth';

export interface Car {
  id: string; // License plate
  name: string;
  brand: string;
  year: string;
  seats: number;
  status: 'ready' | 'reserved' | 'rented' | 'maintenance' | 'suspended';
  color: string;
  image: string;
  timeRemaining?: string;
  km: number;
  customer?: string;
  ownerPhone: string;
  expiryRegistration: string; // Đăng kiểm
  expiryInsurance: string; // Bảo hiểm
  expiryLicense: string; // Phù hiệu xe
  pricePerDay: number;
  pricePerHour: number;
  pricePerWeek: number;
  images?: string[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  license: string;
  cccd: string;
  address: string;
  classification: 'normal' | 'vip' | 'warning';
  notes: string;
  activeRentals: number;
  totalRentals: number;
  status: 'verified' | 'expired';
  statusText: string;
  image: string; // Khách hàng Avatar
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  image: string; // Chủ xe Avatar
  commissionRate?: number; // Tỷ lệ chiết khấu chủ xe được hưởng (tùy chọn)
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  ref: string;
  location?: string;
}

export interface Violation {
  id: string;
  date: string;
  description: string;
  amount: number;
  evidenceUrl?: string;
  status: 'paid' | 'unpaid';
}

export interface Rental {
  id: string;
  carId: string;
  customerName: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
  rentalFee: number;
  deliveryFee: number;
  deposit: number;
  discountAmount?: number;
  extraFee: number;
  totalAmount: number;
  paymentStatus: 'deposit' | 'paid' | 'debt';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startKm: number;
  endKm?: number;
  startFuel: string;
  endFuel?: string;
  source: 'system' | 'uploaded';
  fileUrl?: string;
  fileName?: string;
  ownerCommissionAmount?: number;
  violations?: Violation[];
  createdAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  conditionImages?: string[];
}

export interface ImageItem {
  id: string;
  url: string;
  usedIn: string | null;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseClass: string;
  status: 'available' | 'on_trip' | 'off';
  address?: string;
  notes?: string;
  totalTrips: number;
  assignedCarId?: string;
  avatar?: string;
  commissionRate?: number; // Tỷ lệ chiết khấu mặc định cho tài xế (%)
}

export interface ServiceOrder {
  id: string;
  carId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  customerName: string;
  customerPhone: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  serviceDate: string;
  scheduledEndAt?: string;
  startKm: number;
  endKm: number;
  distanceKm: number;
  pricePerKm: number;
  extraFee: number;
  totalAmount: number;
  driverCommissionRate?: number; // Tỷ lệ chiết khấu (%)
  driverCommissionAmount?: number; // Số tiền tài xế được nhận (đ)
  paymentStatus: 'paid' | 'unpaid';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface AppSettings {
  logo: string;
  logoHistory: string[];
  favicon: string;
  primaryColor: string;
  siteTitle: string;
  allowIndexing: boolean;
}

interface AppContextType {
  isLoading: boolean;
  loadError: string | null;
  cars: Car[];
  customers: Customer[];
  owners: Owner[];
  expenses: Expense[];
  rentals: Rental[];
  drivers: Driver[];
  serviceOrders: ServiceOrder[];
  images: ImageItem[];
  settings: AppSettings;
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  addCar: (car: Car) => Promise<boolean>;
  updateCar: (id: string, updatedFields: Partial<Car>) => Promise<boolean>;
  deleteCar: (id: string) => Promise<boolean>;
  updateCarStatus: (id: string, status: Car['status'], customer?: string, timeRemaining?: string) => Promise<boolean>;
  addCustomer: (customer: Customer) => Promise<boolean>;
  updateCustomer: (id: string, updatedFields: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  addOwner: (owner: Owner) => Promise<boolean>;
  updateOwner: (id: string, updatedFields: Partial<Owner>) => Promise<boolean>;
  deleteOwner: (id: string) => Promise<boolean>;
  createOwnerPayout: (
    ownerId: string,
    periodStart: string,
    periodEnd: string,
    rentalIds: string[],
  ) => Promise<boolean>;
  addExpense: (expense: Expense) => Promise<boolean>;
  updateExpense: (id: string, updatedFields: Partial<Expense>) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  addRental: (rental: Rental) => Promise<boolean>;
  updateRental: (id: string, updatedFields: Partial<Rental>) => Promise<boolean>;
  handoverRental: (id: string, startKm: number, startFuel: string) => Promise<boolean>;
  cancelRental: (id: string, reason: string) => Promise<boolean>;
  recordRentalPayment: (
    id: string,
    paymentType: 'deposit' | 'deposit_application' | 'balance' | 'deposit_refund' | 'surcharge' | 'refund',
    amount: number,
    note?: string,
  ) => Promise<boolean>;
  completeRental: (id: string, endKm: number, extraFee: number, endFuel: string) => Promise<boolean>;
  addDriver: (driver: Driver) => Promise<boolean>;
  updateDriver: (id: string, updatedFields: Partial<Driver>) => Promise<boolean>;
  deleteDriver: (id: string) => Promise<boolean>;
  addServiceOrder: (order: ServiceOrder) => Promise<boolean>;
  updateServiceOrder: (id: string, updatedFields: Partial<ServiceOrder>) => Promise<boolean>;
  startServiceOrder: (id: string) => Promise<boolean>;
  completeServiceOrder: (id: string, endKm: number) => Promise<boolean>;
  deleteServiceOrder: (id: string, reason?: string) => Promise<boolean>;
  toggleServiceOrderPayment: (id: string) => Promise<boolean>;
  deleteImage: (id: string) => boolean;
  addImage: (url: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  rollbackLogo: () => void;
  load500DemoData: () => void;
  resetDemoData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const dateInVietnam = (offsetDays: number, time?: string) => {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const date = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return time ? `${date}T${time}` : date;
};

const INITIAL_CARS: Car[] = [
  { 
    id: '51F-123.45', 
    name: 'Mazda 3 2022', 
    brand: 'Mazda',
    year: '2022',
    seats: 5,
    status: 'rented', 
    color: 'Trắng', 
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80', 
    timeRemaining: '02:15:30', 
    km: 45210, 
    customer: 'Nguyễn Văn A',
    ownerPhone: '0901234567',
    expiryRegistration: dateInVietnam(180),
    expiryInsurance: dateInVietnam(90),
    expiryLicense: dateInVietnam(365),
    pricePerDay: 800000,
    pricePerHour: 100000,
    pricePerWeek: 5000000
  },
  { 
    id: '30G-789.10', 
    name: 'Toyota Vios 2023', 
    brand: 'Toyota',
    year: '2023',
    seats: 5,
    status: 'ready', 
    color: 'Đen', 
    image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80', 
    km: 12500, 
    ownerPhone: '0907654321',
    expiryRegistration: dateInVietnam(210),
    expiryInsurance: dateInVietnam(120),
    expiryLicense: dateInVietnam(450),
    pricePerDay: 700000,
    pricePerHour: 90000,
    pricePerWeek: 4500000
  },
  { 
    id: '51G-001.23', 
    name: 'Honda CR-V 2021', 
    brand: 'Honda',
    year: '2021',
    seats: 7,
    status: 'maintenance', 
    color: 'Đỏ', 
    image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400&q=80', 
    km: 80120, 
    ownerPhone: '0907654321',
    expiryRegistration: dateInVietnam(14),
    expiryInsurance: dateInVietnam(7),
    expiryLicense: dateInVietnam(30),
    pricePerDay: 1200000,
    pricePerHour: 150000,
    pricePerWeek: 7500000
  },
  { 
    id: '29A-456.78', 
    name: 'Kia Cerato 2020', 
    brand: 'Kia',
    year: '2020',
    seats: 5,
    status: 'rented', 
    color: 'Xanh', 
    image: 'https://images.unsplash.com/photo-1502877338535-494e508892f3?auto=format&fit=crop&w=400&q=80', 
    timeRemaining: '12:00:00', 
    km: 65000, 
    customer: 'Trần Thị B',
    ownerPhone: '0988888888',
    expiryRegistration: dateInVietnam(100),
    expiryInsurance: dateInVietnam(7),
    expiryLicense: dateInVietnam(200),
    pricePerDay: 800000,
    pricePerHour: 100000,
    pricePerWeek: 5000000
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Nguyễn Văn A', phone: '0901234567', license: 'GPLX: 790123456789', cccd: '079090001234', address: '123 Nguyễn Trãi, Quận 5, TP.HCM', classification: 'vip', notes: 'Khách quen thân thiết, giao xe sạch sẽ.', activeRentals: 1, totalRentals: 12, status: 'verified', statusText: 'Đã xác minh', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
  { id: '2', name: 'Trần Thị B', phone: '0988888888', license: 'GPLX: 790987654321', cccd: '030090004567', address: '456 Lê Lợi, Quận 1, TP.HCM', classification: 'normal', notes: 'Thanh toán nhanh gọn.', activeRentals: 1, totalRentals: 5, status: 'verified', statusText: 'Đã xác minh', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: '3', name: 'Lê Văn C', phone: '0912345678', license: 'GPLX: 790111222333', cccd: '025090008888', address: '789 Trần Hưng Đạo, Quận 5, TP.HCM', classification: 'warning', notes: 'Lưu ý: Có lịch sử trả xe trễ 2 lần.', activeRentals: 0, totalRentals: 2, status: 'expired', statusText: 'GPLX hết hạn', image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80' },
  { id: '4', name: 'Phạm Minh D', phone: '0977665544', license: 'GPLX: 790555666777', cccd: '012090009999', address: '101 Cách Mạng Tháng Tám, Quận 3, TP.HCM', classification: 'normal', notes: 'Không có ghi chú gì đặc biệt.', activeRentals: 0, totalRentals: 3, status: 'verified', statusText: 'Đã xác minh', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
];

const INITIAL_OWNERS: Owner[] = [
  { id: '1', name: 'Nguyễn Thị E', phone: '0901234567', address: '12 Nguyễn Huệ, Quận 1, TP.HCM', notes: 'Sở hữu chiếc Mazda 3, rất cẩn thận bảo dưỡng.', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', commissionRate: 75 },
  { id: '2', name: 'Toyota Gia Định', phone: '0907654321', address: '300 Quốc Lộ 13, Bình Thạnh, TP.HCM', notes: 'Hợp tác ký gửi xe Toyota Vios và Honda CR-V.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', commissionRate: 80 },
  { id: '3', name: 'Trần Hùng', phone: '0988888888', address: '55 Lê Văn Lương, Quận 7, TP.HCM', notes: 'Chủ xe Kia Cerato.', image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80', commissionRate: 70 }
];

const INITIAL_EXPENSES: Expense[] = [
  { id: '1', title: 'Thay nhớt xe Mazda 3', amount: 850000, category: 'Bảo dưỡng', date: dateInVietnam(-3), ref: '51F-123.45', location: 'Gara Mazda Cộng Hòa' },
  { id: '2', title: 'Rửa xe + dọn nội thất', amount: 200000, category: 'Vệ sinh', date: dateInVietnam(-1), ref: '30G-789.10', location: 'Car Wash Q5' },
  { id: '3', title: 'Sửa chữa phanh trước Honda CR-V', amount: 2500000, category: 'Sửa chữa', date: dateInVietnam(-5), ref: '51G-001.23', location: 'Gara Honda Kim Thanh' },
  { id: '4', title: 'Mua bảo hiểm TNDS mới', amount: 750000, category: 'Giấy tờ', date: dateInVietnam(0), ref: '29A-456.78', location: 'Bảo hiểm PVI' },
  { id: '5', title: 'Chiết khấu doanh thu thuê xe cho Chủ xe Nguyễn Thị E', amount: 1312500, category: 'Chiết khấu chủ xe', date: dateInVietnam(0), ref: 'Chủ xe #1', location: 'Chuyển khoản VCB' }
];

const INITIAL_RENTALS: Rental[] = [
  {
    id: 'RNT-001',
    carId: '51F-123.45',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    startDate: dateInVietnam(0, '08:00'),
    endDate: dateInVietnam(2, '17:00'),
    rentalFee: 1600000,
    deliveryFee: 150000,
    deposit: 10000000,
    extraFee: 0,
    totalAmount: 1750000,
    paymentStatus: 'deposit',
    status: 'active',
    startKm: 45000,
    startFuel: '8/8',
    source: 'system'
  },
  {
    id: 'RNT-002',
    carId: '29A-456.78',
    customerName: 'Trần Thị B',
    customerPhone: '0988888888',
    startDate: dateInVietnam(-1, '07:00'),
    endDate: dateInVietnam(1, '19:00'),
    rentalFee: 2400000,
    deliveryFee: 0,
    deposit: 10000000,
    extraFee: 0,
    totalAmount: 2400000,
    paymentStatus: 'paid',
    status: 'active',
    startKm: 64800,
    startFuel: '7/8',
    source: 'system'
  },
  {
    id: 'RNT-003',
    carId: '30G-789.10',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    startDate: dateInVietnam(-14, '08:00'),
    endDate: dateInVietnam(-10, '17:00'),
    rentalFee: 3200000,
    deliveryFee: 150000,
    deposit: 10000000,
    extraFee: 300000,
    totalAmount: 3650000,
    paymentStatus: 'paid',
    status: 'completed',
    startKm: 11000,
    endKm: 12100,
    startFuel: '8/8',
    endFuel: '8/8',
    source: 'system'
  }
];

const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'DRV-001',
    name: 'Phạm Quốc Hùng',
    phone: '0912999888',
    licenseNumber: 'GPLX-790182938',
    licenseClass: 'B2',
    status: 'available',
    address: '15 Nguyễn Văn Linh, Q.7, TP.HCM',
    notes: 'Tài xế kinh nghiệm 5 năm, thông thuộc đường đi TP.HCM & các tỉnh miền Tây',
    totalTrips: 42,
    assignedCarId: '51F-123.45',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'DRV-002',
    name: 'Trần Văn Minh',
    phone: '0908777666',
    licenseNumber: 'GPLX-790444555',
    licenseClass: 'C',
    status: 'on_trip',
    address: '88 Lê Trọng Tấn, Tân Phú, TP.HCM',
    notes: 'Chuyên chạy các chuyến đi xa liên tỉnh',
    totalTrips: 68,
    assignedCarId: '30G-789.10',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'DRV-003',
    name: 'Nguyễn Tiến Dũng',
    phone: '0977112233',
    licenseNumber: 'GPLX-790666777',
    licenseClass: 'B2',
    status: 'off',
    address: '24 Hoàng Hoa Thám, Bình Thạnh, TP.HCM',
    notes: 'Lịch làm việc ca ngày',
    totalTrips: 25,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
  }
];

const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [
  {
    id: 'SRV-001',
    carId: '51F-123.45',
    driverId: 'DRV-001',
    driverName: 'Phạm Quốc Hùng',
    driverPhone: '0912999888',
    customerName: 'Tài xế tự bắt khách',
    customerPhone: '---',
    serviceDate: dateInVietnam(-1, '14:30'),
    startKm: 45100,
    endKm: 45125,
    distanceKm: 25,
    pricePerKm: 15000,
    extraFee: 30000,
    totalAmount: 405000,
    driverCommissionRate: 80,
    driverCommissionAmount: 324000,
    paymentStatus: 'paid',
    status: 'completed',
    notes: 'Chuyến đưa khách tự do',
    createdAt: dateInVietnam(-1, '14:00')
  },
  {
    id: 'SRV-002',
    carId: '30G-789.10',
    driverId: 'DRV-002',
    driverName: 'Trần Văn Minh',
    driverPhone: '0908777666',
    customerName: 'Tài xế tự bắt khách',
    customerPhone: '---',
    serviceDate: dateInVietnam(0, '07:00'),
    startKm: 12400,
    endKm: 12510,
    distanceKm: 110,
    pricePerKm: 14000,
    extraFee: 120000,
    totalAmount: 1660000,
    driverCommissionRate: 75,
    driverCommissionAmount: 1245000,
    paymentStatus: 'unpaid',
    status: 'completed',
    notes: 'Chuyến Vũng Tàu, phụ phí vé trạm 120k',
    createdAt: dateInVietnam(0, '06:30')
  }
];

const INITIAL_IMAGES: ImageItem[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80', usedIn: 'Xe 51F-123.45' },
  { id: '2', url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=400&q=80', usedIn: 'Xe 51G-001.23' },
  { id: '3', url: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80', usedIn: 'Xe 30G-789.10' },
  { id: '4', url: 'https://images.unsplash.com/photo-1502877338535-494e508892f3?auto=format&fit=crop&w=400&q=80', usedIn: 'Xe 29A-456.78' },
];

// ============================================================
// API helper – dùng chung toàn bộ context
// ============================================================
const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
}

class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders(), ...options?.headers },
    ...options,
  });
  const payload = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` })) as Partial<ApiResponse<T>>;
  if (!res.ok || payload.success === false) {
    if (res.status === 401) window.dispatchEvent(new Event('agreen:unauthorized'));
    throw new ApiRequestError(payload.error || `HTTP ${res.status}`, res.status, payload.code);
  }
  return {
    success: true,
    data: payload.data as T,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Lỗi không xác định';
}

// ============================================================
// DB mapper functions – chuyển đổi dữ liệu DB → Frontend types
// ============================================================
function mapCarFromDB(db: Record<string, unknown>): Car {
  const status = db.status as string;
  return {
    id: (db.plate_number || db.id) as string,
    name: `${db.brand} ${db.model}`,
    brand: db.brand as string || '',
    year: String(db.year || 2024),
    seats: Number(db.seats) || 4,
    status: status === 'Rented'
      ? 'rented'
      : status === 'Reserved'
        ? 'reserved'
        : status === 'Maintenance'
          ? 'maintenance'
          : status === 'Suspended'
            ? 'suspended'
            : 'ready',
    color: db.color as string || 'Trắng',
    image: db.image_url as string || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
    km: Number(db.current_mileage) || 0,
    ownerPhone: db.owner_phone as string || '',
    expiryRegistration: db.registration_expiry ? (db.registration_expiry as string).split('T')[0] : '',
    expiryInsurance: db.insurance_expiry ? (db.insurance_expiry as string).split('T')[0] : '',
    expiryLicense: db.license_expiry ? (db.license_expiry as string).split('T')[0] : '',
    pricePerDay: Number(db.daily_rate) || 0,
    pricePerHour: Number(db.hourly_rate) || 0,
    pricePerWeek: Number(db.weekly_rate) || 0,
    images: Array.isArray(db.gallery_urls)
      ? db.gallery_urls
      : typeof db.gallery_urls === 'string'
        ? (() => { try { return JSON.parse(db.gallery_urls); } catch { return []; } })()
        : [],
  };
}

function mapCustomerFromDB(db: Record<string, unknown>): Customer {
  const cls = db.classification as string || (db.status === 'VIP' ? 'vip' : db.status === 'Blacklisted' ? 'warning' : 'normal');
  return {
    id: db.id as string,
    name: db.full_name as string || '',
    phone: db.phone as string || '',
    license: db.driver_license as string || '',
    cccd: db.id_card as string || '',
    address: db.address as string || '',
    classification: cls as 'normal' | 'vip' | 'warning',
    notes: db.notes as string || '',
    activeRentals: Number(db.active_rentals) || 0,
    totalRentals: Number(db.total_rentals) || 0,
    status: 'verified',
    statusText: 'Đã xác minh',
    image: db.image_url as string || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  };
}

function mapOwnerFromDB(db: Record<string, unknown>): Owner {
  return {
    id: db.id as string,
    name: db.name as string || '',
    phone: db.phone as string || '',
    address: db.address as string || '',
    notes: db.notes as string || '',
    image: db.image_url as string || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    commissionRate: Number(db.commission_rate) || 0,
  };
}

function mapExpenseFromDB(db: Record<string, unknown>): Expense {
  return {
    id: db.id as string,
    title: db.title as string || db.description as string || '',
    amount: Number(db.amount) || 0,
    category: db.category as string || '',
    date: db.expense_date as string || '',
    ref: db.ref as string || '',
    location: db.location as string || '',
  };
}

function mapServiceOrderFromDB(db: Record<string, unknown>): ServiceOrder {
  return {
    id: db.id as string,
    carId: db.car_id as string,
    driverId: db.driver_id as string || '',
    driverName: db.driver_name as string || '',
    driverPhone: db.driver_phone as string || '',
    customerName: db.customer_name as string || '',
    customerPhone: db.customer_phone as string || '',
    pickupLocation: db.pickup_location as string || '',
    dropoffLocation: db.dropoff_location as string || '',
    serviceDate: db.service_date as string,
    scheduledEndAt: db.scheduled_end_at as string || undefined,
    startKm: Number(db.start_km) || 0,
    endKm: Number(db.end_km) || 0,
    distanceKm: Number(db.distance_km) || 0,
    pricePerKm: Number(db.price_per_km) || 0,
    extraFee: Number(db.extra_fee) || 0,
    totalAmount: Number(db.total_amount) || 0,
    driverCommissionRate: Number(db.driver_commission_rate) || 0,
    driverCommissionAmount: Number(db.driver_commission_amount) || 0,
    paymentStatus: db.payment_status as 'paid' | 'unpaid',
    status: db.status as ServiceOrder['status'],
    notes: db.notes as string || undefined,
    createdAt: db.created_at as string || new Date().toISOString(),
  };
}

function mapDriverFromDB(db: Record<string, unknown>): Driver {
  const st = db.status as string;
  return {
    id: db.id as string,
    name: db.name as string || '',
    phone: db.phone as string || '',
    licenseNumber: db.license_number as string || '',
    licenseClass: db.license_class as string || 'B2',
    status: st === 'on_trip' || st === 'busy' ? 'on_trip' : st === 'off' ? 'off' : 'available',
    address: db.address as string || '',
    notes: db.notes as string || '',
    totalTrips: Number(db.total_trips) || 0,
    assignedCarId: db.assigned_car_id as string || undefined,
    avatar: db.avatar as string || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    commissionRate: Number(db.commission_rate) || 0,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // PostgreSQL is the source of truth for all business data.
  // Start with empty arrays – they'll be populated from the API on mount.
  const [cars, setCars] = useState<Car[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Drivers and service orders are database-backed. Images/settings are local UI preferences.
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [images, setImages] = useState<ImageItem[]>(() => {
    try { const v = localStorage.getItem('agreen_images'); return v ? JSON.parse(v) : INITIAL_IMAGES; } catch { return INITIAL_IMAGES; }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Settings: localStorage only (theme, logo preferences)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings = { 
      logo: 'Auto', 
      logoHistory: ['Auto'], 
      favicon: 'Auto', 
      primaryColor: '#006837', 
      siteTitle: 'Agreen - Dịch Vụ Cho Thuê Xe Điện Tự Lái - 0386619758', 
      allowIndexing: true 
    };
    try {
      const v = localStorage.getItem('agreen_settings');
      return v ? { ...defaultSettings, ...JSON.parse(v) } : defaultSettings;
    } catch { return defaultSettings; }
  });

  // ============================================================
  // LOAD ALL DATA FROM POSTGRESQL ON MOUNT
  // ============================================================
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [vRes, cRes, oRes, rRes, eRes, sRes, dRes] = await Promise.allSettled([
          apiFetch<Record<string, unknown>[]>('/vehicles'),
          apiFetch<Record<string, unknown>[]>('/customers'),
          apiFetch<Record<string, unknown>[]>('/owners'),
          apiFetch<Record<string, unknown>[]>('/rentals'),
          apiFetch<Record<string, unknown>[]>('/expenses'),
          apiFetch<Record<string, unknown>[]>('/service-orders'),
          apiFetch<Record<string, unknown>[]>('/drivers'),
        ]);

        if (vRes.status === 'fulfilled')
          setCars(vRes.value.data.map(mapCarFromDB));
        else console.error('Failed to load vehicles', vRes.reason);

        if (cRes.status === 'fulfilled')
          setCustomers(cRes.value.data.map(mapCustomerFromDB));
        else console.error('Failed to load customers', cRes.reason);

        if (oRes.status === 'fulfilled')
          setOwners(oRes.value.data.map(mapOwnerFromDB));
        else console.error('Failed to load owners', oRes.reason);

        if (rRes.status === 'fulfilled')
          setRentals(rRes.value.data.map(mapRentalFromDB));
        else console.error('Failed to load rentals', rRes.reason);

        if (eRes.status === 'fulfilled')
          setExpenses(eRes.value.data.map(mapExpenseFromDB));
        else console.error('Failed to load expenses', eRes.reason);

        if (sRes.status === 'fulfilled')
          setServiceOrders(sRes.value.data.map(mapServiceOrderFromDB));
        else console.error('Failed to load service orders', sRes.reason);
        
        if (dRes.status === 'fulfilled')
          setDrivers(dRes.value.data.map(mapDriverFromDB));
        else console.error('Failed to load drivers', dRes.reason);

        const failedDomains = [
          { name: 'đội xe', response: vRes },
          { name: 'khách hàng', response: cRes },
          { name: 'chủ xe', response: oRes },
          { name: 'hợp đồng', response: rRes },
          { name: 'chi phí', response: eRes },
          { name: 'đơn dịch vụ', response: sRes },
          { name: 'tài xế', response: dRes },
        ].filter(({ response }) => response.status === 'rejected');
        setLoadError(
          failedDomains.length > 0
            ? `Không tải được: ${failedDomains.map(({ name }) => name).join(', ')}. Vui lòng kiểm tra kết nối API.`
            : null,
        );

      } catch (error) {
        console.error('Failed to load application data', error);
      } finally {
        setDbLoaded(true);
      }
    };
    loadAll();
  }, []);

  // Images and settings are explicitly local-only UI preferences.
  useEffect(() => { localStorage.setItem('agreen_images', JSON.stringify(images)); }, [images]);
  useEffect(() => { localStorage.setItem('agreen_settings', JSON.stringify(settings)); }, [settings]);

  // Apply primary color globally using CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    const darkenColor = (hex: string, percent: number) => {
      let num = parseInt(hex.replace("#",""),16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
      return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
    };
    try {
      const hoverColor = darkenColor(settings.primaryColor, 15);
      document.documentElement.style.setProperty('--primary-hover', hoverColor);
    } catch {
      document.documentElement.style.setProperty('--primary-hover', settings.primaryColor);
    }
  }, [settings.primaryColor]);

  // Dynamically apply siteTitle, allowIndexing, and favicon
  useEffect(() => {
    // 1. Site Title
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    } else {
      document.title = 'Agreen - Dịch Vụ Cho Thuê Xe Điện Tự Lái - 0386619758';
    }

    // 2. Favicon
    let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(faviconLink);
    }
    const isImage = (url: string) => {
      if (!url || url === 'Auto') return false;
      return url.startsWith('http') || 
             url.startsWith('data:') || 
             url.startsWith('/uploads') || 
             url.startsWith('/') || 
             /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url);
    };

    if (settings.favicon && settings.favicon !== 'Auto') {
      faviconLink.href = settings.favicon;
    } else if (settings.logo && settings.logo !== 'Auto' && isImage(settings.logo)) {
      faviconLink.href = settings.logo;
    } else {
      faviconLink.href = '/favicon.ico';
    }

    // 3. Page Indexing (Robots meta tag)
    let robotsMeta = document.querySelector("meta[name='robots']") as HTMLMetaElement;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.getElementsByTagName('head')[0].appendChild(robotsMeta);
    }
    if (settings.allowIndexing === false) {
      robotsMeta.content = 'noindex, nofollow';
    } else {
      robotsMeta.content = 'index, follow';
    }
  }, [settings.siteTitle, settings.favicon, settings.logo, settings.allowIndexing]);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const refreshCars = async () => {
    const response = await apiFetch<Record<string, unknown>[]>('/vehicles');
    setCars(response.data.map(mapCarFromDB));
  };

  const refreshCustomers = async () => {
    const response = await apiFetch<Record<string, unknown>[]>('/customers');
    setCustomers(response.data.map(mapCustomerFromDB));
  };

  const refreshOwners = async () => {
    const response = await apiFetch<Record<string, unknown>[]>('/owners');
    setOwners(response.data.map(mapOwnerFromDB));
  };

  const refreshRentalDomain = async () => {
    const [rentalResponse, vehicleResponse, customerResponse] = await Promise.all([
      apiFetch<Record<string, unknown>[]>('/rentals'),
      apiFetch<Record<string, unknown>[]>('/vehicles'),
      apiFetch<Record<string, unknown>[]>('/customers'),
    ]);
    setRentals(rentalResponse.data.map(mapRentalFromDB));
    setCars(vehicleResponse.data.map(mapCarFromDB));
    setCustomers(customerResponse.data.map(mapCustomerFromDB));
  };

  const refreshServiceDomain = async () => {
    const [orderResponse, vehicleResponse, driverResponse] = await Promise.all([
      apiFetch<Record<string, unknown>[]>('/service-orders'),
      apiFetch<Record<string, unknown>[]>('/vehicles'),
      apiFetch<Record<string, unknown>[]>('/drivers'),
    ]);
    setServiceOrders(orderResponse.data.map(mapServiceOrderFromDB));
    setCars(vehicleResponse.data.map(mapCarFromDB));
    setDrivers(driverResponse.data.map(mapDriverFromDB));
  };

  // ============================================================
  // CAR ACTIONS – đồng bộ với PostgreSQL
  // ============================================================
  const addCar = async (car: Car): Promise<boolean> => {
    const ownerObj = owners.find(o => o.phone === car.ownerPhone);
    const ownerId = ownerObj ? ownerObj.id : null;

    try {
      const res = await apiFetch<Record<string, unknown>>('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          plate_number: car.id,
          brand: car.brand,
          model: car.name.replace(car.brand, '').trim() || car.name,
          year: Number(car.year) || 2024,
          color: car.color,
          seats: car.seats,
          daily_rate: car.pricePerDay,
          hourly_rate: car.pricePerHour,
          weekly_rate: car.pricePerWeek,
          status: car.status === 'maintenance' ? 'Maintenance' : car.status === 'suspended' ? 'Suspended' : 'Available',
          current_mileage: car.km,
          registration_expiry: car.expiryRegistration || null,
          insurance_expiry: car.expiryInsurance || null,
          license_expiry: car.expiryLicense || null,
          image_url: car.image,
          gallery_urls: car.images || [],
          owner_id: ownerId,
          notes: ''
        }),
      });
      if (res.success && res.data) {
        await refreshCars();
        if (car.image && !images.some(img => img.url === car.image)) {
          setImages(prev => [{ id: Date.now().toString(), url: car.image, usedIn: `Xe ${car.id}` }, ...prev]);
        }
        showToast(`Đã thêm xe ${car.id} và đồng bộ CSDL thành công!`, 'success');
        return true;
      } else {
        showToast(`Không thể lưu xe vào CSDL: ${res.error || 'Lỗi không xác định'}`, 'error');
        return false;
      }
    } catch (error) {
      showToast(`Lỗi kết nối máy chủ khi lưu xe: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const updateCar = async (id: string, updatedFields: Partial<Car>): Promise<boolean> => {
    const dbFields: Record<string, unknown> = {};
    if (updatedFields.status && !['rented', 'reserved'].includes(updatedFields.status)) {
      dbFields.status = updatedFields.status === 'maintenance'
        ? 'Maintenance'
        : updatedFields.status === 'suspended'
          ? 'Suspended'
          : 'Available';
    }
    if (updatedFields.name !== undefined) {
      dbFields.model = updatedFields.name.replace(updatedFields.brand ?? '', '').trim() || updatedFields.name;
    }
    if (updatedFields.brand !== undefined) dbFields.brand = updatedFields.brand;
    if (updatedFields.year !== undefined) dbFields.year = Number(updatedFields.year);
    if (updatedFields.ownerPhone !== undefined) {
      const owner = owners.find((item) => item.phone === updatedFields.ownerPhone);
      if (!owner) {
        showToast('Chủ xe phải tồn tại trước khi cập nhật xe.', 'error');
        return false;
      }
      dbFields.owner_id = owner.id;
    }
    if (updatedFields.km !== undefined) dbFields.current_mileage = updatedFields.km;
    if (updatedFields.image) dbFields.image_url = updatedFields.image;
    if (updatedFields.pricePerDay !== undefined) dbFields.daily_rate = updatedFields.pricePerDay;
    if (updatedFields.pricePerHour !== undefined) dbFields.hourly_rate = updatedFields.pricePerHour;
    if (updatedFields.pricePerWeek !== undefined) dbFields.weekly_rate = updatedFields.pricePerWeek;
    if (updatedFields.color) dbFields.color = updatedFields.color;
    if (updatedFields.seats !== undefined) dbFields.seats = updatedFields.seats;
    if (updatedFields.images !== undefined) dbFields.gallery_urls = updatedFields.images;
    if (updatedFields.expiryRegistration !== undefined) dbFields.registration_expiry = updatedFields.expiryRegistration || null;
    if (updatedFields.expiryInsurance !== undefined) dbFields.insurance_expiry = updatedFields.expiryInsurance || null;
    if (updatedFields.expiryLicense !== undefined) dbFields.license_expiry = updatedFields.expiryLicense || null;
    
    if (Object.keys(dbFields).length === 0) return true;
    try {
      await apiFetch(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(dbFields) });
      await refreshCars();
      showToast('Đã đồng bộ thông tin cập nhật xe lên CSDL!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi cập nhật xe: ${errorMessage(error)}`, 'error');
      await refreshCars().catch((refreshError) => console.error('Failed to reload vehicles', refreshError));
      return false;
    }
  };

  const deleteCar = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
      await refreshCars();
      showToast('Đã xóa xe khỏi CSDL vĩnh viễn!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi xóa xe: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const updateCarStatus = async (id: string, status: Car['status'], _customer?: string, _timeRemaining?: string): Promise<boolean> => {
    if (status === 'rented' || status === 'reserved') {
      showToast('Trạng thái Đã đặt/Đang thuê chỉ được thay đổi qua quy trình hợp đồng.', 'error');
      return false;
    }
    const dbStatus = status === 'maintenance' ? 'Maintenance' : status === 'suspended' ? 'Suspended' : 'Available';
    try {
      await apiFetch(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify({ status: dbStatus }) });
      await refreshCars();
      return true;
    } catch (error) {
      showToast(`Lỗi cập nhật trạng thái xe: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  // ============================================================
  // CUSTOMER ACTIONS
  // ============================================================
  const addCustomer = async (customer: Customer): Promise<boolean> => {
    try {
      const res = await apiFetch<Record<string, unknown>>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          full_name: customer.name, phone: customer.phone, email: '',
          id_card: customer.cccd, driver_license: customer.license,
          address: customer.address, classification: customer.classification,
          status: customer.classification === 'vip' ? 'VIP' : customer.classification === 'warning' ? 'Blacklisted' : 'Active',
          notes: customer.notes, image_url: customer.image
        }),
      });
      if (res.success && res.data) {
        await refreshCustomers();
        showToast('Đã lưu khách hàng vào CSDL!', 'success');
        return true;
      } else {
        showToast('Lỗi lưu khách hàng', 'error');
        return false;
      }
    } catch (error) {
      showToast(`Lỗi mạng khi lưu khách hàng: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const updateCustomer = async (id: string, updatedFields: Partial<Customer>): Promise<boolean> => {
    const dbFields: Record<string, unknown> = {};
    if (updatedFields.name) dbFields.full_name = updatedFields.name;
    if (updatedFields.phone) dbFields.phone = updatedFields.phone;
    if (updatedFields.cccd) dbFields.id_card = updatedFields.cccd;
    if (updatedFields.license) dbFields.driver_license = updatedFields.license;
    if (updatedFields.address) dbFields.address = updatedFields.address;
    if (updatedFields.classification) { dbFields.classification = updatedFields.classification; dbFields.status = updatedFields.classification === 'vip' ? 'VIP' : updatedFields.classification === 'warning' ? 'Blacklisted' : 'Active'; }
    if (updatedFields.notes !== undefined) dbFields.notes = updatedFields.notes;
    if (Object.keys(dbFields).length === 0) return true;
    try {
      await apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(dbFields) });
      await refreshCustomers();
      showToast('Đã đồng bộ cập nhật khách hàng lên CSDL!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi cập nhật khách hàng: ${errorMessage(error)}`, 'error');
      await refreshCustomers().catch((refreshError) => console.error('Failed to reload customers', refreshError));
      return false;
    }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/customers/${id}`, { method: 'DELETE' });
      await refreshCustomers();
      showToast('Đã xóa khách hàng khỏi CSDL thành công!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi khi xóa khách hàng: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  // ============================================================
  // OWNER ACTIONS
  // ============================================================
  const addOwner = async (owner: Owner): Promise<boolean> => {
    try {
      const res = await apiFetch<Record<string, unknown>>('/owners', {
        method: 'POST',
        body: JSON.stringify({
          name: owner.name, phone: owner.phone, address: owner.address,
          notes: owner.notes, commission_rate: owner.commissionRate || 0,
          image_url: owner.image
        }),
      });
      if (res.success && res.data) {
        await refreshOwners();
        showToast('Đã thêm chủ xe vào CSDL!', 'success');
        return true;
      } else {
        showToast(`Lỗi thêm chủ xe: ${res.error}`, 'error');
        return false;
      }
    } catch (error) {
      showToast(`Lỗi mạng khi lưu chủ xe: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const updateOwner = async (id: string, updatedFields: Partial<Owner>): Promise<boolean> => {
    const dbFields: Record<string, unknown> = {};
    if (updatedFields.name) dbFields.name = updatedFields.name;
    if (updatedFields.phone) dbFields.phone = updatedFields.phone;
    if (updatedFields.address) dbFields.address = updatedFields.address;
    if (updatedFields.notes !== undefined) dbFields.notes = updatedFields.notes;
    if (updatedFields.commissionRate !== undefined) dbFields.commission_rate = updatedFields.commissionRate;
    
    if (Object.keys(dbFields).length === 0) return true;
    try {
      await apiFetch(`/owners/${id}`, { method: 'PUT', body: JSON.stringify(dbFields) });
      await refreshOwners();
      showToast('Đã đồng bộ thông tin chủ xe!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi cập nhật chủ xe: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const deleteOwner = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/owners/${id}`, { method: 'DELETE' });
      await refreshOwners();
      showToast('Đã xóa chủ xe khỏi CSDL!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi xóa chủ xe: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const createOwnerPayout = async (
    ownerId: string,
    periodStart: string,
    periodEnd: string,
    rentalIds: string[],
  ): Promise<boolean> => {
    try {
      await apiFetch('/owner-payouts', {
        method: 'POST',
        body: JSON.stringify({ ownerId, periodStart, periodEnd, rentalIds }),
      });
      showToast('Đã tạo payout nháp. Kế toán cần kiểm tra và xác nhận trước khi chi tiền.', 'success');
      return true;
    } catch (error) {
      showToast(`Không thể tạo payout: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  // ============================================================
  // EXPENSE ACTIONS
  // ============================================================
  const addExpense = async (expense: Expense): Promise<boolean> => {
    try {
      const res = await apiFetch<Record<string, unknown>>('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          id: expense.id, title: expense.title, category: expense.category,
          amount: expense.amount, expense_date: expense.date,
          ref: expense.ref, location: expense.location || ''
        }),
      });
      if (res.success && res.data) {
        setExpenses(prev => [mapExpenseFromDB(res.data), ...prev]);
        showToast('Đã thêm chi phí thành công!', 'success');
        return true;
      } else {
        showToast(`Lỗi thêm chi phí: ${res.error}`, 'error');
        return false;
      }
    } catch (error) {
      showToast(`Lỗi mạng khi lưu chi phí: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const updateExpense = async (id: string, updatedFields: Partial<Expense>): Promise<boolean> => {
    try {
      const response = await apiFetch<Record<string, unknown>>(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedFields),
      });
      setExpenses((previous) => previous.map((expense) => (
        expense.id === id ? mapExpenseFromDB(response.data) : expense
      )));
      showToast('Đã cập nhật chi phí!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi cập nhật chi phí: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
      setExpenses((previous) => previous.filter((expense) => expense.id !== id));
      showToast('Đã xóa chi phí!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi xóa chi phí: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  // ============================================================
  // RENTAL ACTIONS – dữ liệu quan trọng nhất, lưu ngay vào DB
  // ============================================================
  const addRental = async (rental: Rental): Promise<boolean> => {
    try {
      await apiFetch<Record<string, unknown>>('/rentals', {
        method: 'POST',
        body: JSON.stringify(rental),
      });
      await refreshRentalDomain();
      showToast('Tạo đơn thuê xe thành công!', 'success');
      return true;
    } catch (error) {
      const message = error instanceof ApiRequestError && error.status === 409
        ? 'Xe đã có đơn thuê trùng khoảng thời gian này.'
        : errorMessage(error);
      showToast(`Lỗi tạo đơn thuê: ${message}`, 'error');
      return false;
    }
  };

  const updateRental = async (id: string, updatedFields: Partial<Rental>): Promise<boolean> => {
    try {
      await apiFetch<Record<string, unknown>>(`/rentals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedFields),
      });
      await refreshRentalDomain();
      showToast('Đã cập nhật đơn thuê!', 'success');
      return true;
    } catch (error) {
      const message = error instanceof ApiRequestError && error.status === 409
        ? 'Xe đã có đơn thuê trùng khoảng thời gian này.'
        : errorMessage(error);
      showToast(`Lỗi cập nhật đơn thuê: ${message}`, 'error');
      await refreshRentalDomain().catch((refreshError) => console.error('Failed to reload rental data', refreshError));
      return false;
    }
  };

  const handoverRental = async (id: string, startKm: number, startFuel: string): Promise<boolean> => {
    try {
      await apiFetch(`/rentals/${id}/handover`, {
        method: 'POST',
        body: JSON.stringify({ startKm, startFuel }),
      });
      await refreshRentalDomain();
      showToast('Đã bàn giao xe và chuyển hợp đồng sang trạng thái đang thuê!', 'success');
      return true;
    } catch (error) {
      showToast(`Không thể bàn giao xe: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const cancelRental = async (id: string, reason: string): Promise<boolean> => {
    try {
      await apiFetch(`/rentals/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await refreshRentalDomain();
      showToast('Đã huỷ hợp đồng và lưu lý do!', 'success');
      return true;
    } catch (error) {
      showToast(`Không thể huỷ hợp đồng: ${errorMessage(error)}`, 'error');
      await refreshRentalDomain().catch((refreshError) => console.error('Failed to reload rental data', refreshError));
      return false;
    }
  };

  const recordRentalPayment = async (
    id: string,
    paymentType: 'deposit' | 'deposit_application' | 'balance' | 'deposit_refund' | 'surcharge' | 'refund',
    amount: number,
    note?: string,
  ): Promise<boolean> => {
    try {
      await apiFetch(`/rentals/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          paymentType,
          amount,
          note: note?.trim() || undefined,
          idempotencyKey: `rental:${id}:${paymentType}:${crypto.randomUUID()}`,
        }),
      });
      await refreshRentalDomain();
      showToast('Đã ghi nhận giao dịch thanh toán.', 'success');
      return true;
    } catch (error) {
      showToast(`Không thể ghi nhận thanh toán: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const completeRental = async (
    id: string,
    endKm: number,
    extraFee: number,
    endFuel: string,
  ): Promise<boolean> => {
    try {
      await apiFetch<Record<string, unknown>>(`/rentals/${id}/return`, {
        method: 'POST',
        body: JSON.stringify({ endKm, extraFee, endFuel }),
      });
      await refreshRentalDomain();
      showToast('Đã hoàn tất trả xe và đồng bộ dữ liệu!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi hoàn tất đơn thuê: ${errorMessage(error)}`, 'error');
      await refreshRentalDomain().catch((refreshError) => console.error('Failed to reload rental data', refreshError));
      return false;
    }
  };

  const addDriver = async (driver: Driver): Promise<boolean> => {
    try {
      const res = await apiFetch<Record<string, unknown>>('/drivers', { method: 'POST', body: JSON.stringify(driver) });
      if (res.success && res.data) {
        setDrivers(prev => [mapDriverFromDB(res.data), ...prev]);
        showToast('Đã thêm tài xế mới vào hệ thống!', 'success');
        return true;
      } else {
        showToast(`Không thể đồng bộ tài xế lên CSDL: ${res.error}`, 'error');
        return false;
      }
    } catch (error) {
      showToast(`Không thể đồng bộ tài xế lên CSDL: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const updateDriver = async (id: string, updatedFields: Partial<Driver>): Promise<boolean> => {
    try {
      const response = await apiFetch<Record<string, unknown>>(`/drivers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedFields),
      });
      setDrivers((previous) => previous.map((driver) => (
        driver.id === id ? mapDriverFromDB(response.data) : driver
      )));
      showToast('Đã cập nhật tài xế!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi cập nhật tài xế: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const deleteDriver = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/drivers/${id}`, { method: 'DELETE' });
      setDrivers((previous) => previous.filter((driver) => driver.id !== id));
      showToast('Đã xóa tài xế thành công!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi xóa tài xế: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const addServiceOrder = async (order: ServiceOrder): Promise<boolean> => {
    try {
      const res = await apiFetch<Record<string, unknown>>('/service-orders', { method: 'POST', body: JSON.stringify(order) });
      if (res.success && res.data) {
        await refreshServiceDomain();
        showToast('Tạo đơn dịch vụ tài xế thành công!', 'success');
        return true;
      } else {
        showToast(`Lỗi tạo đơn dịch vụ: ${res.error}`, 'error');
        return false;
      }
    } catch (error) {
      showToast(`Lỗi tạo đơn dịch vụ: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const updateServiceOrder = async (id: string, updatedFields: Partial<ServiceOrder>): Promise<boolean> => {
    try {
      await apiFetch<Record<string, unknown>>(`/service-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedFields),
      });
      await refreshServiceDomain();
      showToast('Đã cập nhật đơn dịch vụ!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi cập nhật đơn dịch vụ: ${errorMessage(error)}`, 'error');
      await refreshServiceDomain().catch((refreshError) => console.error('Failed to reload service data', refreshError));
      return false;
    }
  };

  const startServiceOrder = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/service-orders/${id}/start`, { method: 'POST', body: '{}' });
      await refreshServiceDomain();
      showToast('Đã bắt đầu chuyến và đồng bộ trạng thái tài xế.', 'success');
      return true;
    } catch (error) {
      showToast(`Không thể bắt đầu chuyến: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const completeServiceOrder = async (id: string, endKm: number): Promise<boolean> => {
    try {
      await apiFetch(`/service-orders/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ endKm }),
      });
      await refreshServiceDomain();
      showToast('Đã hoàn thành chuyến và cập nhật số km xe.', 'success');
      return true;
    } catch (error) {
      showToast(`Không thể hoàn thành chuyến: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const deleteServiceOrder = async (id: string, reason = 'Huỷ từ màn hình quản lý đơn dịch vụ'): Promise<boolean> => {
    try {
      await apiFetch(`/service-orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await refreshServiceDomain();
      showToast('Đã huỷ đơn dịch vụ và giữ lại lịch sử!', 'success');
      return true;
    } catch (error) {
      showToast(`Lỗi khi xóa dịch vụ tài xế: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const toggleServiceOrderPayment = async (id: string): Promise<boolean> => {
    const order = serviceOrders.find((item) => item.id === id);
    if (!order) {
      showToast('Không tìm thấy đơn dịch vụ!', 'error');
      return false;
    }
    if (order.status !== 'completed') {
      showToast('Chỉ ghi nhận thanh toán sau khi chuyến đã hoàn thành.', 'error');
      return false;
    }
    if (order.paymentStatus === 'paid') {
      showToast('Đơn đã thanh toán. Hãy tạo giao dịch hoàn tiền thay vì chuyển ngược trạng thái.', 'info');
      return false;
    }
    try {
      await apiFetch(`/service-orders/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          paymentType: 'payment',
          amount: order.totalAmount,
          idempotencyKey: `service:${id}:full-payment`,
        }),
      });
      await refreshServiceDomain();
      showToast('Đã ghi nhận khoản thực thu của đơn dịch vụ.', 'success');
      return true;
    } catch (error) {
      showToast(`Không thể ghi nhận thanh toán: ${errorMessage(error)}`, 'error');
      return false;
    }
  };

  const deleteImage = (id: string): boolean => {
    const img = images.find(i => i.id === id);
    if (!img) return false;
    setImages(prev => prev.filter(i => i.id !== id));
    return true;
  };

  const addImage = (url: string) => {
    setImages(prev => [{ id: Date.now().toString(), url, usedIn: null }, ...prev]);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updatedHistory = [...prev.logoHistory];
      if (newSettings.logo && newSettings.logo !== prev.logo) {
        updatedHistory.push(newSettings.logo);
      }
      return {
        ...prev,
        ...newSettings,
        logoHistory: updatedHistory
      };
    });
  };

  const rollbackLogo = () => {
    setSettings(prev => {
      if (prev.logoHistory.length <= 1) return prev;
      const newHistory = [...prev.logoHistory];
      newHistory.pop(); // Remove current
      const previousLogo = newHistory[newHistory.length - 1];
      return {
        ...prev,
        logo: previousLogo,
        logoHistory: newHistory
      };
    });
  };

  const load500DemoData = () => {
    const data = generate500DemoDataset();
    setOwners(data.owners.length > 0 ? data.owners : INITIAL_OWNERS);
    setCars(data.cars.length > 0 ? data.cars : INITIAL_CARS);
    setCustomers(data.customers.length > 0 ? data.customers : INITIAL_CUSTOMERS);
    setRentals(data.rentals.length > 0 ? data.rentals : INITIAL_RENTALS);
    setExpenses(data.expenses.length > 0 ? data.expenses : INITIAL_EXPENSES);
    setDrivers(INITIAL_DRIVERS);
    setServiceOrders(INITIAL_SERVICE_ORDERS);
    showToast('Đã sinh thành công 500+ dữ liệu mẫu toàn hệ thống!', 'success');
  };

  const resetDemoData = async (): Promise<void> => {
    localStorage.removeItem('agreen_images');
    setImages(INITIAL_IMAGES);
    try {
      const [ownerResponse, expenseResponse] = await Promise.all([
        apiFetch<Record<string, unknown>[]>('/owners'),
        apiFetch<Record<string, unknown>[]>('/expenses'),
        refreshRentalDomain(),
        refreshServiceDomain(),
      ]);
      setOwners(ownerResponse.data.map(mapOwnerFromDB));
      setExpenses(expenseResponse.data.map(mapExpenseFromDB));
      showToast('Đã đồng bộ lại dữ liệu từ PostgreSQL!', 'info');
    } catch (error) {
      showToast(`Không thể đồng bộ lại dữ liệu: ${errorMessage(error)}`, 'error');
    }
  };

  return (
    <AppContext.Provider value={{
      isLoading: !dbLoaded,
      loadError,
      cars,
      customers,
      owners,
      expenses,
      rentals,
      drivers,
      serviceOrders,
      images,
      settings,
      toasts,
      showToast,
      addCar,
      updateCar,
      deleteCar,
      updateCarStatus,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addOwner,
      updateOwner,
      deleteOwner,
      createOwnerPayout,
      addExpense,
      updateExpense,
      deleteExpense,
      addRental,
      updateRental,
      handoverRental,
      cancelRental,
      recordRentalPayment,
      completeRental,
      addDriver,
      updateDriver,
      deleteDriver,
      addServiceOrder,
      updateServiceOrder,
      startServiceOrder,
      completeServiceOrder,
      deleteServiceOrder,
      toggleServiceOrderPayment,
      deleteImage,
      addImage,
      updateSettings,
      rollbackLogo,
      load500DemoData,
      resetDemoData
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react/only-export-components -- the context hook is intentionally colocated with its provider.
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
