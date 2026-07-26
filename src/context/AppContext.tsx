import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api, ApiError } from '../api/client';

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
  /** Tính động từ bảng rentals ở server — không ghi tay được. */
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
  name?: string;
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
  /** Tính động từ bảng service_orders ở server. */
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
  contractTerms: string;
}

/** Dữ liệu mới cho các hàm create — id do server sinh nên không bắt buộc. */
type NewRental = Omit<Rental, 'id' | 'totalAmount'> & { id?: string; totalAmount?: number };
type NewServiceOrder = Omit<ServiceOrder, 'id' | 'createdAt'> & { id?: string; createdAt?: string };

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
  /** true khi đang tải dữ liệu lần đầu. */
  loading: boolean;
  /** Thông báo lỗi tải dữ liệu (nếu có), để trang hiển thị nút thử lại. */
  loadError: string | null;
  reload: () => Promise<void>;
  showToast: (message: string, type?: Toast['type']) => void;
  addCar: (car: Car) => Promise<boolean>;
  updateCar: (id: string, updatedFields: Partial<Car>) => Promise<boolean>;
  deleteCar: (id: string) => Promise<boolean>;
  updateCarStatus: (id: string, status: Car['status'], customer?: string, timeRemaining?: string) => Promise<boolean>;
  addCustomer: (customer: Omit<Customer, 'activeRentals' | 'totalRentals'> & Partial<Customer>) => Promise<boolean>;
  updateCustomer: (id: string, updatedFields: Partial<Customer>) => Promise<boolean>;
  addOwner: (owner: Owner) => Promise<boolean>;
  updateOwner: (id: string, updatedFields: Partial<Owner>) => Promise<boolean>;
  deleteOwner: (id: string) => Promise<boolean>;
  addExpense: (expense: Expense) => Promise<boolean>;
  addRental: (rental: NewRental) => Promise<Rental | null>;
  updateRental: (id: string, updatedFields: Partial<Rental>) => Promise<boolean>;
  deleteRental: (id: string) => Promise<boolean>;
  completeRental: (id: string, endKm: number, extraFee: number, endFuel: string, paymentStatus: Rental['paymentStatus']) => Promise<boolean>;
  addViolation: (rentalId: string, violation: Omit<Violation, 'id'>) => Promise<boolean>;
  updateViolation: (rentalId: string, violationId: string, fields: Partial<Violation>) => Promise<boolean>;
  deleteViolation: (rentalId: string, violationId: string) => Promise<boolean>;
  addDriver: (driver: Driver) => Promise<Driver | null>;
  updateDriver: (id: string, updatedFields: Partial<Driver>) => Promise<boolean>;
  deleteDriver: (id: string) => Promise<boolean>;
  addServiceOrder: (order: NewServiceOrder) => Promise<boolean>;
  updateServiceOrder: (id: string, updatedFields: Partial<ServiceOrder>) => Promise<boolean>;
  deleteServiceOrder: (id: string) => Promise<boolean>;
  toggleServiceOrderPayment: (id: string) => Promise<boolean>;
  uploadImages: (files: File[]) => Promise<ImageItem[]>;
  addImage: (url: string, name?: string) => Promise<ImageItem | null>;
  deleteImage: (id: string) => Promise<boolean>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;
  rollbackLogo: () => Promise<boolean>;
  load500DemoData: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  logo: 'Auto',
  logoHistory: ['Auto'],
  favicon: 'Auto',
  primaryColor: '#006837',
  contractTerms: '',
};

/** Làm tối một mã màu hex để sinh màu hover. Trả về chính nó nếu hex không hợp lệ. */
function darkenColor(hex: string, percent: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (n: number) => Math.min(255, Math.max(0, n));
  const r = clamp((num >> 16) - amt);
  const g = clamp(((num >> 8) & 0x00ff) - amt);
  const b = clamp((num & 0x0000ff) - amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const toastSeq = useRef(0);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    // Date.now() có thể trùng khi 2 toast bật cùng millisecond -> dùng counter tăng dần
    toastSeq.current += 1;
    const id = `toast-${toastSeq.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  /** Bọc mọi lệnh ghi: tự hiện toast lỗi từ server thay vì im lặng thất bại. */
  const run = useCallback(async <T,>(action: () => Promise<T>, fallbackMessage: string): Promise<T | null> => {
    try {
      return await action();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : fallbackMessage;
      showToast(message, 'error');
      return null;
    }
  }, [showToast]);

  // ------------------------------------------------------------- LOAD ALL
  const reload = useCallback(async () => {
    try {
      const [
        carsData, customersData, ownersData, expensesData,
        rentalsData, driversData, serviceOrdersData, imagesData, settingsData,
      ] = await Promise.all([
        api.get<Car[]>('/cars'),
        api.get<Customer[]>('/customers'),
        api.get<Owner[]>('/owners'),
        api.get<Expense[]>('/expenses'),
        api.get<Rental[]>('/rentals'),
        api.get<Driver[]>('/drivers'),
        api.get<ServiceOrder[]>('/service-orders'),
        api.get<ImageItem[]>('/images'),
        api.get<AppSettings>('/settings'),
      ]);
      setCars(carsData);
      setCustomers(customersData);
      setOwners(ownersData);
      setExpenses(expensesData);
      setRentals(rentalsData);
      setDrivers(driversData);
      setServiceOrders(serviceOrdersData);
      setImages(imagesData);
      setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
      setLoadError(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Không tải được dữ liệu từ server.';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  /**
   * Tải lại các bảng bị ảnh hưởng sau khi thay đổi đơn thuê.
   * Trạng thái xe và số lượt thuê của khách đều do server suy ra,
   * nên phải lấy lại thay vì đoán ở client (nguồn gốc của lỗi lệch số cũ).
   */
  const refreshRentalSideEffects = useCallback(async () => {
    const [carsData, customersData] = await Promise.all([
      api.get<Car[]>('/cars'),
      api.get<Customer[]>('/customers'),
    ]);
    setCars(carsData);
    setCustomers(customersData);
  }, []);

  // Áp màu chủ đạo
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    document.documentElement.style.setProperty('--primary-hover', darkenColor(settings.primaryColor, 15));
  }, [settings.primaryColor]);

  // Áp favicon (trước đây field này được lưu nhưng chưa bao giờ dùng)
  useEffect(() => {
    const value = settings.favicon;
    if (!value || value === 'Auto') return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = value;
  }, [settings.favicon]);

  // ----------------------------------------------------------------- CARS
  const addCar = useCallback(async (car: Car) => {
    const created = await run(() => api.post<Car>('/cars', car), 'Không thêm được xe.');
    if (!created) return false;
    setCars((prev) => [created, ...prev]);
    return true;
  }, [run]);

  const updateCar = useCallback(async (id: string, updatedFields: Partial<Car>) => {
    const updated = await run(() => api.patch<Car>(`/cars/${encodeURIComponent(id)}`, updatedFields), 'Không cập nhật được xe.');
    if (!updated) return false;
    setCars((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return true;
  }, [run]);

  const deleteCar = useCallback(async (id: string) => {
    const ok = await run(() => api.delete(`/cars/${encodeURIComponent(id)}`), 'Không xoá được xe.');
    if (!ok) return false;
    setCars((prev) => prev.filter((c) => c.id !== id));
    return true;
  }, [run]);

  const updateCarStatus = useCallback(
    (id: string, status: Car['status'], customer?: string, timeRemaining?: string) =>
      updateCar(id, { status, customer, timeRemaining }),
    [updateCar]
  );

  // ------------------------------------------------------------ CUSTOMERS
  const addCustomer = useCallback(async (customer: Omit<Customer, 'activeRentals' | 'totalRentals'> & Partial<Customer>) => {
    const created = await run(() => api.post<Customer>('/customers', customer), 'Không thêm được khách hàng.');
    if (!created) return false;
    setCustomers((prev) => [created, ...prev]);
    return true;
  }, [run]);

  const updateCustomer = useCallback(async (id: string, updatedFields: Partial<Customer>) => {
    const updated = await run(() => api.patch<Customer>(`/customers/${id}`, updatedFields), 'Không cập nhật được khách hàng.');
    if (!updated) return false;
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return true;
  }, [run]);

  // --------------------------------------------------------------- OWNERS
  const addOwner = useCallback(async (owner: Owner) => {
    const created = await run(() => api.post<Owner>('/owners', owner), 'Không thêm được chủ xe.');
    if (!created) return false;
    setOwners((prev) => [created, ...prev]);
    return true;
  }, [run]);

  const updateOwner = useCallback(async (id: string, updatedFields: Partial<Owner>) => {
    const updated = await run(() => api.patch<Owner>(`/owners/${id}`, updatedFields), 'Không cập nhật được chủ xe.');
    if (!updated) return false;
    setOwners((prev) => prev.map((o) => (o.id === id ? updated : o)));
    return true;
  }, [run]);

  const deleteOwner = useCallback(async (id: string) => {
    const ok = await run(() => api.delete(`/owners/${id}`), 'Không xoá được chủ xe.');
    if (!ok) return false;
    setOwners((prev) => prev.filter((o) => o.id !== id));
    return true;
  }, [run]);

  // ------------------------------------------------------------- EXPENSES
  const addExpense = useCallback(async (expense: Expense) => {
    const created = await run(() => api.post<Expense>('/expenses', expense), 'Không ghi nhận được chi phí.');
    if (!created) return false;
    setExpenses((prev) => [created, ...prev]);
    return true;
  }, [run]);

  // -------------------------------------------------------------- RENTALS
  const addRental = useCallback(async (rental: NewRental) => {
    const created = await run(() => api.post<Rental>('/rentals', rental), 'Không tạo được đơn thuê.');
    if (!created) return null;
    setRentals((prev) => [created, ...prev]);
    await refreshRentalSideEffects();
    return created;
  }, [run, refreshRentalSideEffects]);

  const updateRental = useCallback(async (id: string, updatedFields: Partial<Rental>) => {
    const updated = await run(() => api.patch<Rental>(`/rentals/${id}`, updatedFields), 'Không cập nhật được đơn thuê.');
    if (!updated) return false;
    setRentals((prev) => prev.map((r) => (r.id === id ? updated : r)));
    await refreshRentalSideEffects();
    return true;
  }, [run, refreshRentalSideEffects]);

  const deleteRental = useCallback(async (id: string) => {
    const ok = await run(() => api.delete(`/rentals/${id}`), 'Không xoá được đơn thuê.');
    if (!ok) return false;
    setRentals((prev) => prev.filter((r) => r.id !== id));
    await refreshRentalSideEffects();
    return true;
  }, [run, refreshRentalSideEffects]);

  const completeRental = useCallback(async (
    id: string, endKm: number, extraFee: number, endFuel: string, paymentStatus: Rental['paymentStatus']
  ) => {
    const updated = await run(
      () => api.post<Rental>(`/rentals/${id}/complete`, { endKm, extraFee, endFuel, paymentStatus }),
      'Không hoàn tất được đơn thuê.'
    );
    if (!updated) return false;
    setRentals((prev) => prev.map((r) => (r.id === id ? updated : r)));
    await refreshRentalSideEffects();
    return true;
  }, [run, refreshRentalSideEffects]);

  /** Sau khi đổi vi phạm, tổng tiền đơn được server tính lại -> lấy đơn mới về. */
  const refreshRental = useCallback(async (rentalId: string) => {
    const fresh = await api.get<Rental>(`/rentals/${rentalId}`);
    setRentals((prev) => prev.map((r) => (r.id === rentalId ? fresh : r)));
  }, []);

  const addViolation = useCallback(async (rentalId: string, violation: Omit<Violation, 'id'>) => {
    const ok = await run(() => api.post(`/rentals/${rentalId}/violations`, violation), 'Không ghi nhận được vi phạm.');
    if (!ok) return false;
    await refreshRental(rentalId);
    return true;
  }, [run, refreshRental]);

  const updateViolation = useCallback(async (rentalId: string, violationId: string, fields: Partial<Violation>) => {
    const ok = await run(() => api.patch(`/rentals/${rentalId}/violations/${violationId}`, fields), 'Không cập nhật được vi phạm.');
    if (!ok) return false;
    await refreshRental(rentalId);
    return true;
  }, [run, refreshRental]);

  const deleteViolation = useCallback(async (rentalId: string, violationId: string) => {
    const ok = await run(() => api.delete(`/rentals/${rentalId}/violations/${violationId}`), 'Không xoá được vi phạm.');
    if (!ok) return false;
    await refreshRental(rentalId);
    return true;
  }, [run, refreshRental]);

  // -------------------------------------------------------------- DRIVERS
  /** Trả về bản ghi tài xế do server tạo (kèm id thật) để nơi gọi dùng ngay. */
  const addDriver = useCallback(async (driver: Driver) => {
    const created = await run(() => api.post<Driver>('/drivers', driver), 'Không thêm được tài xế.');
    if (!created) return null;
    setDrivers((prev) => [created, ...prev]);
    return created;
  }, [run]);

  const updateDriver = useCallback(async (id: string, updatedFields: Partial<Driver>) => {
    const updated = await run(() => api.patch<Driver>(`/drivers/${id}`, updatedFields), 'Không cập nhật được tài xế.');
    if (!updated) return false;
    setDrivers((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return true;
  }, [run]);

  const deleteDriver = useCallback(async (id: string) => {
    const ok = await run(() => api.delete(`/drivers/${id}`), 'Không xoá được tài xế.');
    if (!ok) return false;
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    return true;
  }, [run]);

  // ------------------------------------------------------- SERVICE ORDERS
  const refreshCarsAndDrivers = useCallback(async () => {
    const [carsData, driversData] = await Promise.all([
      api.get<Car[]>('/cars'),
      api.get<Driver[]>('/drivers'),
    ]);
    setCars(carsData);
    setDrivers(driversData);
  }, []);

  const addServiceOrder = useCallback(async (order: NewServiceOrder) => {
    const created = await run(() => api.post<ServiceOrder>('/service-orders', order), 'Không tạo được đơn dịch vụ.');
    if (!created) return false;
    setServiceOrders((prev) => [created, ...prev]);
    await refreshCarsAndDrivers();
    return true;
  }, [run, refreshCarsAndDrivers]);

  const updateServiceOrder = useCallback(async (id: string, updatedFields: Partial<ServiceOrder>) => {
    const updated = await run(() => api.patch<ServiceOrder>(`/service-orders/${id}`, updatedFields), 'Không cập nhật được đơn dịch vụ.');
    if (!updated) return false;
    setServiceOrders((prev) => prev.map((s) => (s.id === id ? updated : s)));
    await refreshCarsAndDrivers();
    return true;
  }, [run, refreshCarsAndDrivers]);

  const deleteServiceOrder = useCallback(async (id: string) => {
    const ok = await run(() => api.delete(`/service-orders/${id}`), 'Không xoá được đơn dịch vụ.');
    if (!ok) return false;
    setServiceOrders((prev) => prev.filter((s) => s.id !== id));
    await refreshCarsAndDrivers();
    return true;
  }, [run, refreshCarsAndDrivers]);

  const toggleServiceOrderPayment = useCallback(async (id: string) => {
    const updated = await run(() => api.post<ServiceOrder>(`/service-orders/${id}/toggle-payment`), 'Không đổi được trạng thái thanh toán.');
    if (!updated) return false;
    setServiceOrders((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return true;
  }, [run]);

  // --------------------------------------------------------------- IMAGES
  const uploadImages = useCallback(async (files: File[]) => {
    const created = await run(() => api.upload<ImageItem[]>('/images', files), 'Không tải được tệp lên.');
    if (!created) return [];
    setImages((prev) => [...created, ...prev]);
    return created;
  }, [run]);

  const addImage = useCallback(async (url: string, name?: string) => {
    const created = await run(() => api.post<ImageItem>('/images/link', { url, name }), 'Không thêm được ảnh.');
    if (!created) return null;
    setImages((prev) => [created, ...prev]);
    return created;
  }, [run]);

  const deleteImage = useCallback(async (id: string) => {
    const ok = await run(() => api.delete(`/images/${id}`), 'Không xoá được ảnh.');
    if (!ok) return false;
    setImages((prev) => prev.filter((i) => i.id !== id));
    return true;
  }, [run]);

  // ------------------------------------------------------------- SETTINGS
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = await run(() => api.patch<AppSettings>('/settings', newSettings), 'Không lưu được cài đặt.');
    if (!updated) return false;
    setSettings({ ...DEFAULT_SETTINGS, ...updated });
    return true;
  }, [run]);

  const rollbackLogo = useCallback(async () => {
    const updated = await run(() => api.post<AppSettings>('/settings/rollback-logo'), 'Không hoàn tác được logo.');
    if (!updated) return false;
    setSettings({ ...DEFAULT_SETTINGS, ...updated });
    return true;
  }, [run]);

  // ----------------------------------------------------- DEMO / BACKUP
  const load500DemoData = useCallback(async () => {
    const result = await run(() => api.post<{ rentals: number }>('/admin/demo-data'), 'Không sinh được dữ liệu mẫu.');
    if (!result) return;
    await reload();
    showToast(`Đã sinh dữ liệu mẫu: ${result.rentals} đơn thuê trên toàn hệ thống!`, 'success');
  }, [run, reload, showToast]);

  const resetDemoData = useCallback(async () => {
    const result = await run(() => api.post('/admin/reset-data'), 'Không reset được dữ liệu.');
    if (!result) return;
    await reload();
    showToast('Đã reset về dữ liệu khởi tạo ban đầu!', 'info');
  }, [run, reload, showToast]);

  const exportBackup = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/backup', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Xuất dữ liệu thất bại.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agreen-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Đã tải xuống tệp sao lưu toàn bộ dữ liệu!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xuất dữ liệu thất bại.', 'error');
    }
  }, [showToast]);

  const importBackup = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await api.post<{ restored: Record<string, number> }>('/admin/restore', payload);
      await reload();
      const total = Object.values(result.restored).reduce((s, n) => s + n, 0);
      showToast(`Đã khôi phục ${total} bản ghi từ tệp sao lưu!`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message
        : err instanceof SyntaxError ? 'Tệp sao lưu không phải JSON hợp lệ.'
        : 'Khôi phục dữ liệu thất bại.';
      showToast(message, 'error');
    }
  }, [reload, showToast]);

  const value = useMemo<AppContextType>(() => ({
    cars, customers, owners, expenses, rentals, drivers, serviceOrders, images, settings, toasts,
    loading, loadError, reload, showToast,
    addCar, updateCar, deleteCar, updateCarStatus,
    addCustomer, updateCustomer,
    addOwner, updateOwner, deleteOwner,
    addExpense,
    addRental, updateRental, deleteRental, completeRental,
    addViolation, updateViolation, deleteViolation,
    addDriver, updateDriver, deleteDriver,
    addServiceOrder, updateServiceOrder, deleteServiceOrder, toggleServiceOrderPayment,
    uploadImages, addImage, deleteImage,
    updateSettings, rollbackLogo,
    load500DemoData, resetDemoData, exportBackup, importBackup,
  }), [
    cars, customers, owners, expenses, rentals, drivers, serviceOrders, images, settings, toasts,
    loading, loadError, reload, showToast,
    addCar, updateCar, deleteCar, updateCarStatus,
    addCustomer, updateCustomer,
    addOwner, updateOwner, deleteOwner,
    addExpense,
    addRental, updateRental, deleteRental, completeRental,
    addViolation, updateViolation, deleteViolation,
    addDriver, updateDriver, deleteDriver,
    addServiceOrder, updateServiceOrder, deleteServiceOrder, toggleServiceOrderPayment,
    uploadImages, addImage, deleteImage,
    updateSettings, rollbackLogo,
    load500DemoData, resetDemoData, exportBackup, importBackup,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
