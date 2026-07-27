import React, { createContext, useContext, useState, useEffect } from 'react';
import { generate500DemoDataset } from '../utils/generateDemoData';

export interface Car {
  id: string; // License plate
  name: string;
  brand: string;
  year: string;
  seats: number;
  status: 'ready' | 'rented' | 'maintenance' | 'suspended';
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
  startKm: number;
  endKm: number;
  distanceKm: number;
  pricePerKm: number;
  extraFee: number;
  totalAmount: number;
  driverCommissionRate?: number; // Tỷ lệ chiết khấu (%)
  driverCommissionAmount?: number; // Số tiền tài xế được nhận (đ)
  paymentStatus: 'paid' | 'unpaid';
  status: 'completed' | 'ongoing' | 'cancelled';
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
  addCar: (car: Car) => void;
  updateCar: (id: string, updatedFields: Partial<Car>) => void;
  deleteCar: (id: string) => void;
  updateCarStatus: (id: string, status: Car['status'], customer?: string, timeRemaining?: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updatedFields: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addOwner: (owner: Owner) => void;
  updateOwner: (id: string, updatedFields: Partial<Owner>) => void;
  deleteOwner: (id: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updatedFields: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addRental: (rental: Rental) => void;
  updateRental: (id: string, updatedFields: Partial<Rental>) => void;
  deleteRental: (id: string) => void;
  completeRental: (id: string, endKm: number, extraFee: number, endFuel: string, paymentStatus: Rental['paymentStatus']) => void;
  addDriver: (driver: Driver) => void;
  updateDriver: (id: string, updatedFields: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addServiceOrder: (order: ServiceOrder) => void;
  updateServiceOrder: (id: string, updatedFields: Partial<ServiceOrder>) => void;
  deleteServiceOrder: (id: string) => void;
  toggleServiceOrderPayment: (id: string) => void;
  deleteImage: (id: string) => boolean;
  addImage: (url: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  rollbackLogo: () => void;
  load500DemoData: () => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
    expiryRegistration: '2026-12-15',
    expiryInsurance: '2026-09-20',
    expiryLicense: '2027-05-18',
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
    expiryRegistration: '2027-02-10',
    expiryInsurance: '2026-11-05',
    expiryLicense: '2027-10-12',
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
    expiryRegistration: '2026-07-18',
    expiryInsurance: '2026-07-15',
    expiryLicense: '2026-08-20',
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
    expiryRegistration: '2026-10-05',
    expiryInsurance: '2026-07-15',
    expiryLicense: '2027-01-10',
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
  { id: '1', title: 'Thay nhớt xe Mazda 3', amount: 850000, category: 'Bảo dưỡng', date: '2026-07-12', ref: '51F-123.45', location: 'Gara Mazda Cộng Hòa' },
  { id: '2', title: 'Rửa xe + dọn nội thất', amount: 200000, category: 'Vệ sinh', date: '2026-07-14', ref: '30G-789.10', location: 'Car Wash Q5' },
  { id: '3', title: 'Sửa chữa phanh trước Honda CR-V', amount: 2500000, category: 'Sửa chữa', date: '2026-07-10', ref: '51G-001.23', location: 'Gara Honda Kim Thanh' },
  { id: '4', title: 'Mua bảo hiểm TNDS mới', amount: 750000, category: 'Giấy tờ', date: '2026-07-15', ref: '29A-456.78', location: 'Bảo hiểm PVI' },
  { id: '5', title: 'Chiết khấu doanh thu thuê xe cho Chủ xe Nguyễn Thị E', amount: 1312500, category: 'Chiết khấu chủ xe', date: '2026-07-15', ref: 'Chủ xe #1', location: 'Chuyển khoản VCB' }
];

const INITIAL_RENTALS: Rental[] = [
  {
    id: 'RNT-001',
    carId: '51F-123.45',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    startDate: '2026-07-15T08:00',
    endDate: '2026-07-17T17:00',
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
    startDate: '2026-07-14T07:00',
    endDate: '2026-07-16T19:00',
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
    startDate: '2026-07-01T08:00',
    endDate: '2026-07-05T17:00',
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
    serviceDate: '2026-07-24T14:30',
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
    createdAt: '2026-07-24T14:00:00'
  },
  {
    id: 'SRV-002',
    carId: '30G-789.10',
    driverId: 'DRV-002',
    driverName: 'Trần Văn Minh',
    driverPhone: '0908777666',
    customerName: 'Tài xế tự bắt khách',
    customerPhone: '---',
    serviceDate: '2026-07-25T07:00',
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
    createdAt: '2026-07-25T06:30:00'
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

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  return res.json();
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
    status: status === 'Rented' ? 'rented' : status === 'Maintenance' ? 'maintenance' : status === 'Reserved' ? 'suspended' : 'ready',
    color: db.color as string || 'Trắng',
    image: db.image_url as string || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
    km: Number(db.current_mileage) || 0,
    ownerPhone: db.owner_phone as string || '',
    expiryRegistration: db.registration_expiry ? (db.registration_expiry as string).split('T')[0] : '2026-12-31',
    expiryInsurance: db.insurance_expiry ? (db.insurance_expiry as string).split('T')[0] : '2026-12-31',
    expiryLicense: db.license_expiry ? (db.license_expiry as string).split('T')[0] : '2026-12-31',
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

function mapRentalFromDB(db: Record<string, unknown>): Rental {
  let conditionImages: string[] = [];
  try { conditionImages = JSON.parse(db.condition_images as string || '[]'); } catch { conditionImages = []; }
  return {
    id: db.id as string,
    carId: db.car_id as string,
    customerName: db.customer_name as string || '',
    customerPhone: db.customer_phone as string || '',
    startDate: db.start_date as string,
    endDate: db.end_date as string,
    rentalFee: Number(db.rental_fee) || 0,
    deliveryFee: Number(db.delivery_fee) || 0,
    deposit: Number(db.deposit) || 0,
    extraFee: Number(db.extra_fee) || 0,
    totalAmount: Number(db.total_amount) || 0,
    paymentStatus: db.payment_status as Rental['paymentStatus'],
    startKm: Number(db.start_km) || 0,
    endKm: (db.end_km !== null && db.end_km !== undefined && db.end_km !== '') ? Number(db.end_km) : undefined,
    startFuel: db.start_fuel as string || 'full',
    endFuel: db.end_fuel as string || undefined,
    source: db.source as Rental['source'] || 'system',
    fileUrl: db.file_url as string || undefined,
    fileName: db.file_name as string || undefined,
    ownerCommissionAmount: Number(db.owner_commission_amount) || 0,
    conditionImages,
    deliveredAt: db.delivered_at as string || undefined,
    returnedAt: db.returned_at as string || undefined,
    createdAt: db.created_at as string || undefined,
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
    serviceDate: db.service_date as string,
    startKm: Number(db.start_km) || 0,
    endKm: Number(db.end_km) || 0,
    distanceKm: Number(db.distance_km) || 0,
    pricePerKm: Number(db.price_per_km) || 0,
    extraFee: Number(db.extra_fee) || 0,
    totalAmount: Number(db.total_amount) || 0,
    driverCommissionRate: Number(db.driver_commission_rate) || 0,
    driverCommissionAmount: Number(db.driver_commission_amount) || 0,
    paymentStatus: db.payment_status as 'paid' | 'unpaid',
    status: db.status as 'completed' | 'ongoing' | 'cancelled',
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
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(() => {
    try { const v = localStorage.getItem('agreen_service_orders'); return v ? JSON.parse(v) : INITIAL_SERVICE_ORDERS; } catch { return INITIAL_SERVICE_ORDERS; }
  });
  const [dbLoaded, setDbLoaded] = useState(false);

  // Drivers & images use localStorage + PostgreSQL sync
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try { const v = localStorage.getItem('agreen_drivers'); return v ? JSON.parse(v) : INITIAL_DRIVERS; } catch { return INITIAL_DRIVERS; }
  });
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
          apiFetch('/vehicles'),
          apiFetch('/customers'),
          apiFetch('/owners'),
          apiFetch('/rentals'),
          apiFetch('/expenses'),
          apiFetch('/service-orders'),
          apiFetch('/drivers'),
        ]);

        if (vRes.status === 'fulfilled' && vRes.value.success && vRes.value.data.length > 0)
          setCars(vRes.value.data.map(mapCarFromDB));
        else if (vRes.status === 'rejected' || !vRes.value?.success)
          setCars(INITIAL_CARS); // fallback khi API lỗi

        if (cRes.status === 'fulfilled' && cRes.value.success && cRes.value.data.length > 0)
          setCustomers(cRes.value.data.map(mapCustomerFromDB));
        else if (cRes.status === 'rejected' || !cRes.value?.success)
          setCustomers(INITIAL_CUSTOMERS);

        if (oRes.status === 'fulfilled' && oRes.value.success && oRes.value.data.length > 0)
          setOwners(oRes.value.data.map(mapOwnerFromDB));
        else if (oRes.status === 'rejected' || !oRes.value?.success)
          setOwners(INITIAL_OWNERS);

        if (rRes.status === 'fulfilled' && rRes.value.success)
          setRentals(rRes.value.data.map(mapRentalFromDB));
        else if (rRes.status === 'rejected' || !rRes.value?.success)
          setRentals(INITIAL_RENTALS);

        if (eRes.status === 'fulfilled' && eRes.value.success)
          setExpenses(eRes.value.data.map(mapExpenseFromDB));
        else if (eRes.status === 'rejected' || !eRes.value?.success)
          setExpenses(INITIAL_EXPENSES);

        if (sRes.status === 'fulfilled' && sRes.value.success && sRes.value.data.length > 0)
          setServiceOrders(sRes.value.data.map(mapServiceOrderFromDB));
        
        if (dRes.status === 'fulfilled' && dRes.value.success && dRes.value.data.length > 0)
          setDrivers(dRes.value.data.map(mapDriverFromDB));

      } catch {
        // Network failure: use demo data as fallback
        setCars(INITIAL_CARS);
        setCustomers(INITIAL_CUSTOMERS);
        setOwners(INITIAL_OWNERS);
        setRentals(INITIAL_RENTALS);
        setExpenses(INITIAL_EXPENSES);
        setServiceOrders(INITIAL_SERVICE_ORDERS);
      } finally {
        setDbLoaded(true);
      }
    };
    loadAll();
  }, []);

  // Suppress unused warning – dbLoaded available for loading indicators
  void dbLoaded;

  // LocalStorage fallback for drivers & serviceOrders & settings
  useEffect(() => { localStorage.setItem('agreen_drivers', JSON.stringify(drivers)); }, [drivers]);
  useEffect(() => { localStorage.setItem('agreen_service_orders', JSON.stringify(serviceOrders)); }, [serviceOrders]);
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
    } catch (_e) {
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

  // ============================================================
  // CAR ACTIONS – đồng bộ với PostgreSQL
  // ============================================================
  const addCar = (car: Car) => {
    // Optimistic UI update
    setCars(prev => [car, ...prev]);
    if (car.image && !images.some(img => img.url === car.image)) {
      setImages(prev => [...prev, { id: Date.now().toString(), url: car.image, usedIn: `Xe ${car.id}` }]);
    }

    // Map ownerPhone to owner_id in database
    const ownerObj = owners.find(o => o.phone === car.ownerPhone);
    const ownerId = ownerObj ? ownerObj.id : null;

    apiFetch('/vehicles', {
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
        status: car.status === 'rented' ? 'Rented' : car.status === 'maintenance' ? 'Maintenance' : car.status === 'suspended' ? 'Reserved' : 'Available',
        current_mileage: car.km,
        registration_expiry: car.expiryRegistration || null,
        insurance_expiry: car.expiryInsurance || null,
        license_expiry: car.expiryLicense || null,
        image_url: car.image,
        gallery_urls: car.images || [],
        owner_id: ownerId,
        notes: ''
      }),
    }).then(res => {
      if (res.success && res.data) {
        setCars(prev => prev.map(c => c.id === car.id ? mapCarFromDB(res.data) : c));
        showToast(`Đã thêm xe ${car.id} và đồng bộ CSDL thành công!`, 'success');
      } else {
        showToast(`Không thể lưu xe vào CSDL: ${res.error || 'Lỗi không xác định'}`, 'error');
        // Rollback optimistic update
        setCars(prev => prev.filter(c => c.id !== car.id));
      }
    }).catch(err => {
      showToast(`Lỗi kết nối máy chủ khi lưu xe: ${err.message || err}`, 'error');
      setCars(prev => prev.filter(c => c.id !== car.id));
    });
  };

  const updateCar = (id: string, updatedFields: Partial<Car>) => {
    setCars(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    const dbFields: Record<string, unknown> = {};
    if (updatedFields.status) dbFields.status = updatedFields.status === 'rented' ? 'Rented' : updatedFields.status === 'maintenance' ? 'Maintenance' : updatedFields.status === 'suspended' ? 'Reserved' : 'Available';
    if (updatedFields.km !== undefined) dbFields.current_mileage = updatedFields.km;
    if (updatedFields.image) dbFields.image_url = updatedFields.image;
    if (updatedFields.pricePerDay !== undefined) dbFields.daily_rate = updatedFields.pricePerDay;
    if (updatedFields.pricePerHour !== undefined) dbFields.hourly_rate = updatedFields.pricePerHour;
    if (updatedFields.pricePerWeek !== undefined) dbFields.weekly_rate = updatedFields.pricePerWeek;
    if (updatedFields.color) dbFields.color = updatedFields.color;
    if (updatedFields.seats !== undefined) dbFields.seats = updatedFields.seats;
    if (updatedFields.images !== undefined) dbFields.gallery_urls = updatedFields.images;
    
    if (Object.keys(dbFields).length > 0) {
      apiFetch(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(dbFields) }).then(res => {
        if (res.success) {
          showToast('Đã đồng bộ thông tin cập nhật xe lên CSDL!', 'success');
        } else {
          showToast(`Lỗi đồng bộ cập nhật xe: ${res.error}`, 'error');
        }
      }).catch(err => {
        showToast(`Lỗi mạng khi đồng bộ cập nhật xe: ${err.message || err}`, 'error');
      });
    }
  };

  const deleteCar = (id: string) => {
    setCars(prev => prev.filter(c => c.id !== id));
    apiFetch(`/vehicles/${id}`, { method: 'DELETE' }).then(res => {
      if (res.success) {
        showToast('Đã xóa xe khỏi CSDL vĩnh viễn!', 'success');
      } else {
        showToast(`Lỗi xóa xe: ${res.error}`, 'error');
      }
    }).catch(err => {
      showToast(`Lỗi kết nối khi xóa xe: ${err.message || err}`, 'error');
    });
  };

  const updateCarStatus = (id: string, status: Car['status'], customer?: string, timeRemaining?: string) => {
    setCars(prev => prev.map(c => c.id === id ? { ...c, status, customer, timeRemaining } : c));
    const dbStatus = status === 'rented' ? 'Rented' : status === 'maintenance' ? 'Maintenance' : status === 'suspended' ? 'Reserved' : 'Available';
    apiFetch(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify({ status: dbStatus }) }).catch(() => {});
  };

  // ============================================================
  // CUSTOMER ACTIONS
  // ============================================================
  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
    apiFetch('/customers', {
      method: 'POST',
      body: JSON.stringify({
        full_name: customer.name, phone: customer.phone, email: '',
        id_card: customer.cccd, driver_license: customer.license,
        address: customer.address, classification: customer.classification,
        status: customer.classification === 'vip' ? 'VIP' : customer.classification === 'warning' ? 'Blacklisted' : 'Active',
        notes: customer.notes, image_url: customer.image
      }),
    }).then(res => {
      if (res.success && res.data) {
        setCustomers(prev => prev.map(c => c.id === customer.id ? mapCustomerFromDB(res.data) : c));
        showToast('Đã lưu khách hàng vào CSDL!', 'success');
      } else {
        showToast(`Lỗi lưu khách hàng: ${res.error}`, 'error');
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
      }
    }).catch(err => {
      showToast(`Lỗi mạng khi lưu khách hàng: ${err.message || err}`, 'error');
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
    });
  };

  const updateCustomer = (id: string, updatedFields: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    const dbFields: Record<string, unknown> = {};
    if (updatedFields.name) dbFields.full_name = updatedFields.name;
    if (updatedFields.phone) dbFields.phone = updatedFields.phone;
    if (updatedFields.cccd) dbFields.id_card = updatedFields.cccd;
    if (updatedFields.license) dbFields.driver_license = updatedFields.license;
    if (updatedFields.address) dbFields.address = updatedFields.address;
    if (updatedFields.classification) { dbFields.classification = updatedFields.classification; dbFields.status = updatedFields.classification === 'vip' ? 'VIP' : updatedFields.classification === 'warning' ? 'Blacklisted' : 'Active'; }
    if (updatedFields.notes !== undefined) dbFields.notes = updatedFields.notes;
    if (updatedFields.activeRentals !== undefined) dbFields.active_rentals = updatedFields.activeRentals;
    if (updatedFields.totalRentals !== undefined) dbFields.total_rentals = updatedFields.totalRentals;
    
    if (Object.keys(dbFields).length > 0) {
      apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(dbFields) }).then(res => {
        if (res.success) {
          showToast('Đã đồng bộ cập nhật khách hàng lên CSDL!', 'success');
        } else {
          showToast(`Lỗi cập nhật khách hàng: ${res.error}`, 'error');
        }
      }).catch(err => {
        showToast(`Lỗi mạng khi cập nhật khách hàng: ${err.message || err}`, 'error');
      });
    }
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    apiFetch(`/customers/${id}`, { method: 'DELETE' }).then(res => {
      if (res.success) {
        showToast('Đã xóa khách hàng khỏi CSDL thành công!', 'success');
      } else {
        showToast(`Lỗi khi xóa khách hàng: ${res.error}`, 'error');
      }
    }).catch(err => {
      showToast(`Lỗi kết nối khi xóa khách hàng: ${err.message || err}`, 'error');
    });
  };

  // ============================================================
  // OWNER ACTIONS
  // ============================================================
  const addOwner = (owner: Owner) => {
    setOwners(prev => [owner, ...prev]);
    apiFetch('/owners', {
      method: 'POST',
      body: JSON.stringify({
        name: owner.name, phone: owner.phone, address: owner.address,
        notes: owner.notes, commission_rate: owner.commissionRate || 0,
        image_url: owner.image
      }),
    }).then(res => {
      if (res.success && res.data) {
        setOwners(prev => prev.map(o => o.id === owner.id ? mapOwnerFromDB(res.data) : o));
        showToast('Đã thêm chủ xe vào CSDL!', 'success');
      } else {
        showToast(`Lỗi thêm chủ xe: ${res.error}`, 'error');
        setOwners(prev => prev.filter(o => o.id !== owner.id));
      }
    }).catch(err => {
      showToast(`Lỗi mạng khi lưu chủ xe: ${err.message || err}`, 'error');
      setOwners(prev => prev.filter(o => o.id !== owner.id));
    });
  };

  const updateOwner = (id: string, updatedFields: Partial<Owner>) => {
    setOwners(prev => prev.map(o => o.id === id ? { ...o, ...updatedFields } : o));
    const dbFields: Record<string, unknown> = {};
    if (updatedFields.name) dbFields.name = updatedFields.name;
    if (updatedFields.phone) dbFields.phone = updatedFields.phone;
    if (updatedFields.address) dbFields.address = updatedFields.address;
    if (updatedFields.notes !== undefined) dbFields.notes = updatedFields.notes;
    if (updatedFields.commissionRate !== undefined) dbFields.commission_rate = updatedFields.commissionRate;
    
    if (Object.keys(dbFields).length > 0) {
      apiFetch(`/owners/${id}`, { method: 'PUT', body: JSON.stringify(dbFields) }).then(res => {
        if (res.success) {
          showToast('Đã đồng bộ thông tin chủ xe!', 'success');
        } else {
          showToast(`Lỗi cập nhật chủ xe: ${res.error}`, 'error');
        }
      }).catch(err => {
        showToast(`Lỗi mạng khi cập nhật chủ xe: ${err.message || err}`, 'error');
      });
    }
  };

  const deleteOwner = (id: string) => {
    setOwners(prev => prev.filter(o => o.id !== id));
    apiFetch(`/owners/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // ============================================================
  // EXPENSE ACTIONS
  // ============================================================
  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    apiFetch('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        id: expense.id, title: expense.title, category: expense.category,
        amount: expense.amount, expense_date: expense.date,
        ref: expense.ref, location: expense.location || ''
      }),
    }).catch(() => {});
  };

  const updateExpense = (id: string, updatedFields: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updatedFields } : e));
    apiFetch(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedFields)
    }).catch(() => {});
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    apiFetch(`/expenses/${id}`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  // ============================================================
  // RENTAL ACTIONS – dữ liệu quan trọng nhất, lưu ngay vào DB
  // ============================================================
  const addRental = (rental: Rental) => {
    setRentals(prev => [rental, ...prev]);
    // Save to PostgreSQL immediately
    apiFetch('/rentals', { method: 'POST', body: JSON.stringify(rental) }).catch(() => {});

    // Update car status
    if (rental.status === 'active' || rental.status === 'pending') {
      setCars(prev => prev.map(c => c.id === rental.carId ? {
        ...c, status: 'rented', customer: rental.customerName, timeRemaining: '48:00:00'
      } : c));
      updateCarStatus(rental.carId, 'rented');
      setCustomers(prev => prev.map(cust => (cust.phone === rental.customerPhone || cust.name === rental.customerName) ? {
        ...cust, activeRentals: cust.activeRentals + 1, totalRentals: cust.totalRentals + 1
      } : cust));
    } else if (rental.status === 'completed') {
      const selectedCar = cars.find(c => c.id === rental.carId);
      const newKm = Math.max(selectedCar ? selectedCar.km : 0, rental.endKm || 0);
      setCars(prev => prev.map(c => c.id === rental.carId ? {
        ...c, km: newKm
      } : c));
      updateCar(rental.carId, { km: newKm });
      setCustomers(prev => prev.map(cust => (cust.phone === rental.customerPhone || cust.name === rental.customerName) ? {
        ...cust, totalRentals: cust.totalRentals + 1
      } : cust));
    } else {
      setCustomers(prev => prev.map(cust => (cust.phone === rental.customerPhone || cust.name === rental.customerName) ? {
        ...cust, totalRentals: cust.totalRentals + 1
      } : cust));
    }
  };
  const updateRental = (id: string, updatedFields: Partial<Rental>) => {
    const originalRental = rentals.find(r => r.id === id);
    setRentals(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
    apiFetch(`/rentals/${id}`, { method: 'PUT', body: JSON.stringify(updatedFields) }).catch(() => {});

    const finalStatus = updatedFields.status !== undefined ? updatedFields.status : originalRental?.status;
    const finalEndKm = updatedFields.endKm !== undefined ? updatedFields.endKm : originalRental?.endKm;
    const carId = originalRental?.carId;

    if (carId) {
      if (finalStatus === 'completed') {
        const selectedCar = cars.find(c => c.id === carId);
        const newKm = Math.max(selectedCar ? selectedCar.km : 0, finalEndKm || 0);
        setCars(prev => prev.map(c => c.id === carId ? {
          ...c,
          status: 'ready',
          km: newKm,
          customer: undefined,
          timeRemaining: undefined
        } : c));
        updateCar(carId, { status: 'ready', km: newKm });
      } else if (finalStatus === 'active' || finalStatus === 'pending') {
        setCars(prev => prev.map(c => c.id === carId ? {
          ...c,
          status: 'rented',
          customer: originalRental?.customerName
        } : c));
        updateCar(carId, { status: 'rented' });
      }
    }
  };

  const deleteRental = (id: string) => {
    setRentals(prev => prev.filter(r => r.id !== id));
    apiFetch(`/rentals/${id}`, { method: 'DELETE' }).then(res => {
      if (res.success) {
        showToast('Đã xóa đơn thuê khỏi CSDL thành công!', 'success');
      } else {
        showToast(`Lỗi khi xóa đơn thuê: ${res.error}`, 'error');
      }
    }).catch(err => {
      showToast(`Lỗi kết nối khi xóa đơn thuê: ${err.message || err}`, 'error');
    });
  };

  const completeRental = (id: string, endKm: number, extraFee: number, endFuel: string, paymentStatus: Rental['paymentStatus']) => {
    const targetRental = rentals.find(r => r.id === id);
    const carIdToRelease = targetRental?.carId;
    const customerNameToRelease = targetRental?.customerName;
    const returnedAt = new Date().toISOString();

    setRentals(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, endKm, extraFee, endFuel, paymentStatus, status: 'completed', totalAmount: r.totalAmount + extraFee, returnedAt };
      }
      return r;
    }));
    apiFetch(`/rentals/${id}`, { method: 'PUT', body: JSON.stringify({ endKm, extraFee, endFuel, paymentStatus, status: 'completed', returnedAt }) }).catch(() => {});

    if (carIdToRelease) {
      setCars(prev => prev.map(c => c.id === carIdToRelease ? {
        ...c,
        status: 'ready',
        km: Math.max(c.km, endKm || c.km),
        customer: undefined,
        timeRemaining: undefined
      } : c));
    }

    if (customerNameToRelease) {
      setCustomers(prev => prev.map(cust => (cust.name === customerNameToRelease || cust.phone === targetRental?.customerPhone) ? {
        ...cust,
        activeRentals: Math.max(0, cust.activeRentals - 1)
      } : cust));
    }
  };

  // Auto-sync car status: if a car is marked as 'rented' but has no active rental contract, release it to 'ready'
  useEffect(() => {
    setCars(prevCars => {
      let changed = false;
      const nextCars = prevCars.map(c => {
        if (c.status === 'rented') {
          const hasActiveRental = rentals.some(r => r.carId === c.id && r.status === 'active');
          if (!hasActiveRental) {
            changed = true;
            return { ...c, status: 'ready' as const, customer: undefined, timeRemaining: undefined };
          }
        }
        return c;
      });
      return changed ? nextCars : prevCars;
    });
  }, [rentals]);

  const addDriver = (driver: Driver) => {
    setDrivers(prev => [...prev, driver]);
    apiFetch('/drivers', { method: 'POST', body: JSON.stringify(driver) }).then(res => {
      if (res.success && res.data) {
        setDrivers(prev => prev.map(d => d.id === driver.id ? mapDriverFromDB(res.data) : d));
        showToast('Đã thêm tài xế mới vào hệ thống!', 'success');
      }
    }).catch(err => {
      showToast(`Không thể đồng bộ tài xế lên CSDL: ${err.message || err}`, 'error');
    });
  };

  const updateDriver = (id: string, updatedFields: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updatedFields } : d));
    apiFetch(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(updatedFields) }).catch(() => {});
  };

  const deleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
    apiFetch(`/drivers/${id}`, { method: 'DELETE' }).then(res => {
      if (res.success) {
        showToast('Đã xóa tài xế thành công!', 'success');
      }
    }).catch(() => {});
  };

  const addServiceOrder = (order: ServiceOrder) => {
    setServiceOrders(prev => [order, ...prev]);
    apiFetch('/service-orders', { method: 'POST', body: JSON.stringify(order) }).catch(() => {});
    if (order.carId && order.endKm) {
      setCars(prev => prev.map(c => c.id === order.carId ? { ...c, km: Math.max(c.km, order.endKm) } : c));
      apiFetch(`/vehicles/${order.carId}`, { method: 'PUT', body: JSON.stringify({ current_mileage: order.endKm }) }).catch(() => {});
    }
    if (order.driverId) {
      setDrivers(prev => prev.map(d => d.id === order.driverId ? { ...d, totalTrips: d.totalTrips + 1 } : d));
    }
  };

  const updateServiceOrder = (id: string, updatedFields: Partial<ServiceOrder>) => {
    setServiceOrders(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
  };

  const deleteServiceOrder = (id: string) => {
    setServiceOrders(prev => prev.filter(s => s.id !== id));
    apiFetch(`/service-orders/${id}`, { method: 'DELETE' }).then(res => {
      if (res.success) {
        showToast('Đã xóa dịch vụ tài xế khỏi CSDL thành công!', 'success');
      } else {
        showToast(`Lỗi khi xóa dịch vụ tài xế: ${res.error}`, 'error');
      }
    }).catch(err => {
      showToast(`Lỗi kết nối khi xóa dịch vụ tài xế: ${err.message || err}`, 'error');
    });
  };

  const toggleServiceOrderPayment = (id: string) => {
    setServiceOrders(prev => prev.map(s => s.id === id ? {
      ...s,
      paymentStatus: s.paymentStatus === 'paid' ? 'unpaid' : 'paid'
    } : s));
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
    setOwners(data.owners);
    setCars(data.cars);
    setCustomers(data.customers);
    setRentals(data.rentals);
    setExpenses(data.expenses);
    showToast('Đã sinh thành công 500+ dữ liệu mẫu toàn hệ thống!', 'success');
  };

  const resetDemoData = () => {
    // Clear localStorage non-DB data
    localStorage.removeItem('agreen_drivers');
    localStorage.removeItem('agreen_images');
    // Reset local state to demo data (PostgreSQL data won't be touched)
    setDrivers(INITIAL_DRIVERS);
    setImages(INITIAL_IMAGES);
    // Reload PostgreSQL data fresh
    apiFetch('/vehicles').then(r => r.success && r.data.length > 0 && setCars(r.data.map(mapCarFromDB))).catch(() => setCars(INITIAL_CARS));
    apiFetch('/customers').then(r => r.success && r.data.length > 0 && setCustomers(r.data.map(mapCustomerFromDB))).catch(() => setCustomers(INITIAL_CUSTOMERS));
    apiFetch('/owners').then(r => r.success && r.data.length > 0 && setOwners(r.data.map(mapOwnerFromDB))).catch(() => setOwners(INITIAL_OWNERS));
    apiFetch('/rentals').then(r => r.success && setRentals(r.data.map(mapRentalFromDB))).catch(() => setRentals(INITIAL_RENTALS));
    apiFetch('/expenses').then(r => r.success && setExpenses(r.data.map(mapExpenseFromDB))).catch(() => setExpenses(INITIAL_EXPENSES));
    showToast('Đã đồng bộ lại dữ liệu từ PostgreSQL!', 'info');
  };

  return (
    <AppContext.Provider value={{
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
      addExpense,
      updateExpense,
      deleteExpense,
      addRental,
      updateRental,
      deleteRental,
      completeRental,
      addDriver,
      updateDriver,
      deleteDriver,
      addServiceOrder,
      updateServiceOrder,
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
