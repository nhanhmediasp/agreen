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

interface AppSettings {
  logo: string;
  logoHistory: string[];
  favicon: string;
  primaryColor: string;
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
  addOwner: (owner: Owner) => void;
  updateOwner: (id: string, updatedFields: Partial<Owner>) => void;
  deleteOwner: (id: string) => void;
  addExpense: (expense: Expense) => void;
  addRental: (rental: Rental) => void;
  updateRental: (id: string, updatedFields: Partial<Rental>) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cars, setCars] = useState<Car[]>(() => {
    const local = localStorage.getItem('agreen_cars');
    return local ? JSON.parse(local) : INITIAL_CARS;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const local = localStorage.getItem('agreen_customers');
    return local ? JSON.parse(local) : INITIAL_CUSTOMERS;
  });
  const [owners, setOwners] = useState<Owner[]>(() => {
    const local = localStorage.getItem('agreen_owners');
    return local ? JSON.parse(local) : INITIAL_OWNERS;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const local = localStorage.getItem('agreen_expenses');
    return local ? JSON.parse(local) : INITIAL_EXPENSES;
  });
  const [rentals, setRentals] = useState<Rental[]>(() => {
    const local = localStorage.getItem('agreen_rentals');
    return local ? JSON.parse(local) : INITIAL_RENTALS;
  });
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const local = localStorage.getItem('agreen_drivers');
    return local ? JSON.parse(local) : INITIAL_DRIVERS;
  });
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(() => {
    const local = localStorage.getItem('agreen_service_orders');
    return local ? JSON.parse(local) : INITIAL_SERVICE_ORDERS;
  });
  const [images, setImages] = useState<ImageItem[]>(() => {
    const local = localStorage.getItem('agreen_images');
    return local ? JSON.parse(local) : INITIAL_IMAGES;
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const local = localStorage.getItem('agreen_settings');
    return local ? JSON.parse(local) : {
      logo: 'Auto',
      logoHistory: ['Auto'],
      favicon: 'Auto',
      primaryColor: '#006837',
    };
  });

  // Helper DB mapper functions
  const mapCustomerFromDB = (dbCust: any): Customer => ({
    id: dbCust.id,
    name: dbCust.full_name || '',
    phone: dbCust.phone || '',
    license: dbCust.driver_license || '',
    cccd: dbCust.id_card || '',
    address: dbCust.address || '',
    classification: dbCust.status === 'VIP' ? 'vip' : dbCust.status === 'Blacklisted' ? 'warning' : 'normal',
    notes: dbCust.notes || '',
    activeRentals: 0,
    totalRentals: 0,
    status: 'verified',
    statusText: 'Đã xác minh',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  });

  const mapCarFromDB = (dbCar: any): Car => ({
    id: dbCar.plate_number || dbCar.id,
    name: `${dbCar.brand} ${dbCar.model}`,
    brand: dbCar.brand || '',
    year: String(dbCar.year || 2024),
    seats: dbCar.seats || 4,
    status: dbCar.status === 'Rented' ? 'rented' : dbCar.status === 'Maintenance' ? 'maintenance' : dbCar.status === 'Reserved' ? 'suspended' : 'ready',
    color: dbCar.color || 'Trắng',
    image: dbCar.image_url || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
    km: dbCar.current_mileage || 0,
    ownerPhone: '',
    expiryRegistration: dbCar.registration_expiry ? dbCar.registration_expiry.split('T')[0] : '2026-12-31',
    expiryInsurance: dbCar.insurance_expiry ? dbCar.insurance_expiry.split('T')[0] : '2026-12-31',
    expiryLicense: '2026-12-31',
    pricePerDay: Number(dbCar.daily_rate) || 800000,
    pricePerHour: 100000,
    pricePerWeek: Number(dbCar.monthly_rate) || 5000000
  });

  const mapOwnerFromDB = (dbOwner: any): Owner => ({
    id: dbOwner.id,
    name: dbOwner.name || '',
    phone: dbOwner.phone || '',
    address: dbOwner.address || '',
    notes: dbOwner.notes || '',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  });

  // Fetch real data from PostgreSQL Backend API on mount
  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCustomers(res.data.map(mapCustomerFromDB));
        }
      })
      .catch(() => {});

    fetch('/api/vehicles')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCars(res.data.map(mapCarFromDB));
        }
      })
      .catch(() => {});

    fetch('/api/owners')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setOwners(res.data.map(mapOwnerFromDB));
        }
      })
      .catch(() => {});
  }, []);

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('agreen_cars', JSON.stringify(cars)); }, [cars]);
  useEffect(() => { localStorage.setItem('agreen_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('agreen_owners', JSON.stringify(owners)); }, [owners]);
  useEffect(() => { localStorage.setItem('agreen_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('agreen_rentals', JSON.stringify(rentals)); }, [rentals]);
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

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const addCar = (car: Car) => {
    setCars(prev => [...prev, car]);
    if (car.image && !images.some(img => img.url === car.image)) {
      setImages(prev => [...prev, { id: Date.now().toString(), url: car.image, usedIn: `Xe ${car.id}` }]);
    }
    fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate_number: car.id,
        brand: car.brand,
        model: car.name.replace(car.brand, '').trim() || car.name,
        year: Number(car.year) || 2024,
        color: car.color,
        seats: car.seats,
        daily_rate: car.pricePerDay,
        monthly_rate: car.pricePerWeek,
        status: car.status === 'rented' ? 'Rented' : car.status === 'maintenance' ? 'Maintenance' : 'Available',
        current_mileage: car.km,
        image_url: car.image
      })
    }).catch(() => {});
  };

  const updateCar = (id: string, updatedFields: Partial<Car>) => {
    setCars(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };

  const deleteCar = (id: string) => {
    setCars(prev => prev.filter(c => c.id !== id));
  };

  const updateCarStatus = (id: string, status: Car['status'], customer?: string, timeRemaining?: string) => {
    setCars(prev => prev.map(c => c.id === id ? { ...c, status, customer, timeRemaining } : c));
  };

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
    fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: customer.name,
        phone: customer.phone,
        id_card: customer.cccd,
        driver_license: customer.license,
        address: customer.address,
        status: customer.classification === 'vip' ? 'VIP' : customer.classification === 'warning' ? 'Blacklisted' : 'Active',
        notes: customer.notes
      })
    }).catch(() => {});
  };

  const updateCustomer = (id: string, updatedFields: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };

  const addOwner = (owner: Owner) => {
    setOwners(prev => [owner, ...prev]);
    fetch('/api/owners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: owner.name,
        phone: owner.phone,
        address: owner.address,
        notes: owner.notes
      })
    }).catch(() => {});
  };

  const updateOwner = (id: string, updatedFields: Partial<Owner>) => {
    setOwners(prev => prev.map(o => o.id === id ? { ...o, ...updatedFields } : o));
  };

  const deleteOwner = (id: string) => {
    setOwners(prev => prev.filter(o => o.id !== id));
  };

  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const addRental = (rental: Rental) => {
    setRentals(prev => [rental, ...prev]);
    
    // Update car status if rental is active or pending
    if (rental.status === 'active' || rental.status === 'pending') {
      setCars(prev => prev.map(c => c.id === rental.carId ? { 
        ...c, 
        status: 'rented', 
        customer: rental.customerName, 
        timeRemaining: '48:00:00' 
      } : c));

      // Update customer stats
      setCustomers(prev => prev.map(cust => (cust.phone === rental.customerPhone || cust.name === rental.customerName) ? { 
        ...cust, 
        activeRentals: cust.activeRentals + 1,
        totalRentals: cust.totalRentals + 1
      } : cust));
    } else {
      setCustomers(prev => prev.map(cust => (cust.phone === rental.customerPhone || cust.name === rental.customerName) ? { 
        ...cust, 
        totalRentals: cust.totalRentals + 1
      } : cust));
    }
  };

  const updateRental = (id: string, updatedFields: Partial<Rental>) => {
    setRentals(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
  };

  const completeRental = (id: string, endKm: number, extraFee: number, endFuel: string, paymentStatus: Rental['paymentStatus']) => {
    const targetRental = rentals.find(r => r.id === id);
    const carIdToRelease = targetRental?.carId;
    const customerNameToRelease = targetRental?.customerName;

    setRentals(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          endKm,
          extraFee,
          endFuel,
          paymentStatus,
          status: 'completed',
          totalAmount: r.totalAmount + extraFee,
          returnedAt: new Date().toISOString()
        };
      }
      return r;
    }));

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
  };

  const updateDriver = (id: string, updatedFields: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updatedFields } : d));
  };

  const deleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
  };

  const addServiceOrder = (order: ServiceOrder) => {
    setServiceOrders(prev => [order, ...prev]);
    if (order.carId && order.endKm) {
      setCars(prev => prev.map(c => c.id === order.carId ? { ...c, km: Math.max(c.km, order.endKm) } : c));
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
    localStorage.removeItem('agreen_cars');
    localStorage.removeItem('agreen_customers');
    localStorage.removeItem('agreen_owners');
    localStorage.removeItem('agreen_expenses');
    localStorage.removeItem('agreen_rentals');
    localStorage.removeItem('agreen_drivers');
    localStorage.removeItem('agreen_service_orders');
    localStorage.removeItem('agreen_images');
    setCars(INITIAL_CARS);
    setCustomers(INITIAL_CUSTOMERS);
    setOwners(INITIAL_OWNERS);
    setExpenses(INITIAL_EXPENSES);
    setRentals(INITIAL_RENTALS);
    setDrivers(INITIAL_DRIVERS);
    setServiceOrders(INITIAL_SERVICE_ORDERS);
    setImages(INITIAL_IMAGES);
    showToast('Đã reset về dữ liệu ban đầu!', 'info');
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
      addOwner,
      updateOwner,
      deleteOwner,
      addExpense,
      addRental,
      updateRental,
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
