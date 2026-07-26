import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Plus, Gauge, ShieldCheck, X, Image as ImageIcon, Trash2, CheckSquare, Calendar as CalendarIcon, ArrowLeft, Edit, LayoutGrid, List, Receipt } from 'lucide-react';
import { useApp, type Car } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';
import { MoneyInputLeft } from '../components/MoneyInput';

const LiveCountdown = ({ endDateStr }: { endDateStr: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endDateStr) - +new Date();
      if (difference <= 0) return 'Hết hạn';

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [endDateStr]);

  return <span>{timeLeft}</span>;
};

const CAR_COLOR_PALETTE = [
  { name: 'Trắng', hex: '#ffffff', border: '#cbd5e1' },
  { name: 'Đen', hex: '#0f172a', border: '#0f172a' },
  { name: 'Đỏ', hex: '#dc2626', border: '#dc2626' },
  { name: 'Xanh bích', hex: '#0284c7', border: '#0284c7' },
  { name: 'Xám xi măng', hex: '#64748b', border: '#64748b' },
  { name: 'Bạc', hex: '#cbd5e1', border: '#94a3b8' },
  { name: 'Vàng cát', hex: '#d97706', border: '#d97706' },
  { name: 'Nâu đất', hex: '#78350f', border: '#78350f' }
];

const SpeedometerCountdown = ({ endDateStr }: { endDateStr: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--status-rented-bg)', padding: '6px 12px', borderRadius: 'var(--radius-lg)' }}>
    <Gauge size={16} color="var(--status-rented-text)" />
    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-rented-text)', fontSize: '14px' }}>
      <LiveCountdown endDateStr={endDateStr} />
    </span>
  </div>
);

const FleetManagement = () => {
  const { cars, addCar, updateCar, deleteCar, rentals, completeRental, customers, owners, addOwner, showToast, expenses, addExpense } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCarId = searchParams.get('id');
  const setSelectedCarId = (id: string | null) => {
    if (id) {
      setSearchParams({ id });
    } else {
      setSearchParams({});
    }
  };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Car Expense Form State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Bảo dưỡng');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseLocation, setExpenseLocation] = useState('');

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !expenseTitle || !expenseAmount) return;

    const ok = await addExpense({
      id: '', // server sinh id
      title: expenseTitle,
      amount: parseInt(expenseAmount) || 0,
      category: expenseCategory,
      date: expenseDate || new Date().toISOString().split('T')[0],
      ref: selectedCarId,
      location: expenseLocation || 'Chưa cập nhật'
    });

    if (!ok) return;
    setShowAddExpenseModal(false);
    showToast('Đã thêm khoản chi phí mới cho xe này!', 'success');
    
    // Reset form
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseCategory('Bảo dưỡng');
    setExpenseLocation('');
  };
  
  // Modals visibility
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'add' | 'edit'>('add');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(3000000);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Add Car Form State
  const [newPlate, setNewPlate] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newSeats, setNewSeats] = useState(5);
  const [newColor, setNewColor] = useState('');
  const [newKm, setNewKm] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newPriceDay, setNewPriceDay] = useState('800000');
  const [newPriceHour, setNewPriceHour] = useState('100000');
  const [newPriceWeek, setNewPriceWeek] = useState('5000000');

  // Owner Option Mode in Add Car
  const [ownerOptionMode, setOwnerOptionMode] = useState<'select' | 'create'>('select');
  const [selectedOwnerPhone, setSelectedOwnerPhone] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');

  // Edit Car Form State
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editSeats, setEditSeats] = useState(5);
  const [editColor, setEditColor] = useState('');
  const [editKm, setEditKm] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editStatus, setEditStatus] = useState<'ready' | 'maintenance' | 'suspended'>('ready');
  const [editPriceDay, setEditPriceDay] = useState('800000');
  const [editPriceHour, setEditPriceHour] = useState('100000');
  const [editPriceWeek, setEditPriceWeek] = useState('5000000');
  // Hạn giấy tờ giờ sửa được ngay trong app (trước đây bị gán cứng lúc tạo xe)
  const [editExpiryRegistration, setEditExpiryRegistration] = useState('');
  const [editExpiryInsurance, setEditExpiryInsurance] = useState('');
  const [editExpiryLicense, setEditExpiryLicense] = useState('');

  // Return Car Form State
  const [returnKm, setReturnKm] = useState('');
  const [returnFuel, setReturnFuel] = useState('8/8');
  const [surcharge, setSurcharge] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'debt'>('paid');

  const activeCar = cars.find(c => c.id === selectedCarId);
  const activeRental = rentals.find(r => r.carId === selectedCarId && r.status === 'active');
  const carRentals = rentals.filter(r => r.carId === selectedCarId).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Rental history pagination
  const [rentalPage, setRentalPage] = useState(1);
  const RENTALS_PER_PAGE = 10;
  const rentalTotalPages = Math.ceil(carRentals.length / RENTALS_PER_PAGE);
  const pagedRentals = carRentals.slice((rentalPage - 1) * RENTALS_PER_PAGE, rentalPage * RENTALS_PER_PAGE);

  // Reset về trang 1 khi chuyển sang xe khác
  useEffect(() => { setRentalPage(1); }, [selectedCarId]);

  const activeFilterCount = (maxPriceFilter < 3000000 ? 1 : 0) + 
                            (ownerFilter !== 'all' ? 1 : 0) + 
                            (colorFilter !== 'all' ? 1 : 0) + 
                            (customerFilter !== 'all' ? 1 : 0);

  const filteredCars = cars.filter(car => {
    const matchesSearch = car.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          car.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
    
    const matchesCustomer = customerFilter === 'all' || 
                            (car.status === 'rented' && car.customer === customerFilter);
    
    const priceDay = car.pricePerDay || 800000;
    const matchesPrice = priceDay <= maxPriceFilter;

    const matchesOwner = ownerFilter === 'all' || car.ownerPhone === ownerFilter;
    const matchesColor = colorFilter === 'all' || car.color === colorFilter;
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesPrice && matchesOwner && matchesColor;
  });

  const handleCreateCar = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalOwnerPhone = '';

    if (ownerOptionMode === 'create') {
      if (!newOwnerName || !newOwnerPhone) {
        showToast('Vui lòng nhập Tên và Số điện thoại chủ xe mới!', 'error');
        return;
      }
      // Chủ xe có thể đã tồn tại (SĐT là khoá duy nhất) -> chỉ tạo khi thật sự chưa có
      const existingOwner = owners.find(o => o.phone === newOwnerPhone.trim());
      if (!existingOwner) {
        const ok = await addOwner({
          id: '',
          name: newOwnerName,
          phone: newOwnerPhone.trim(),
          address: newOwnerAddress || 'Chưa cập nhật',
          notes: 'Chủ xe mới tạo từ Quản lý Đội xe',
          image: '',
        });
        if (!ok) return;
      }
      finalOwnerPhone = newOwnerPhone.trim();
    } else {
      finalOwnerPhone = selectedOwnerPhone || owners[0]?.phone || newPhone;
      if (!finalOwnerPhone) {
        showToast('Vui lòng chọn hoặc tạo mới chủ xe!', 'error');
        return;
      }
    }

    if (!newPlate || !newName || !newColor || !newKm || !finalOwnerPhone) {
      showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
      return;
    }

    // Biển số là khoá chính — chặn ngay ở client để báo lỗi rõ ràng
    const plate = newPlate.trim();
    if (cars.some(c => c.id.toLowerCase() === plate.toLowerCase())) {
      showToast(`Biển số ${plate} đã tồn tại trong hệ thống!`, 'error');
      return;
    }

    const carToAdd: Car = {
      id: plate,
      name: newName,
      brand: newBrand || 'Khác',
      year: newYear || '2022',
      seats: newSeats,
      color: newColor,
      status: 'ready',
      km: parseInt(newKm) || 0,
      ownerPhone: finalOwnerPhone,
      image: newImage,
      // Hạn giấy tờ để trống, nhập ở màn hình chỉnh sửa xe — không bịa ngày cứng nữa
      expiryRegistration: '',
      expiryInsurance: '',
      expiryLicense: '',
      pricePerDay: parseInt(newPriceDay) || 800000,
      pricePerHour: parseInt(newPriceHour) || 100000,
      pricePerWeek: parseInt(newPriceWeek) || 5000000
    };

    const added = await addCar(carToAdd);
    if (!added) return;
    setShowAddForm(false);
    showToast('Thêm xe mới vào đội xe thành công!', 'success');

    // Reset Form
    setNewPlate('');
    setNewName('');
    setNewBrand('');
    setNewYear('');
    setNewSeats(5);
    setNewColor('');
    setNewKm('');
    setSelectedOwnerPhone('');
    setNewOwnerName('');
    setNewOwnerPhone('');
    setNewOwnerAddress('');
    setNewPhone('');
    setNewImage('');
    setNewPriceDay('800000');
    setNewPriceHour('100000');
    setNewPriceWeek('5000000');
  };

  const handleOpenEdit = () => {
    if (!activeCar) return;
    setEditName(activeCar.name);
    setEditBrand(activeCar.brand);
    setEditYear(activeCar.year);
    setEditSeats(activeCar.seats);
    setEditColor(activeCar.color);
    setEditKm((activeCar.km || 0).toString());
    setEditPhone(activeCar.ownerPhone || '');
    setEditImage(activeCar.image || '');
    setEditStatus(activeCar.status === 'rented' ? 'ready' : activeCar.status);
    setEditPriceDay((activeCar.pricePerDay || 800000).toString());
    setEditPriceHour((activeCar.pricePerHour || 100000).toString());
    setEditPriceWeek((activeCar.pricePerWeek || 5000000).toString());
    setEditExpiryRegistration(activeCar.expiryRegistration || '');
    setEditExpiryInsurance(activeCar.expiryInsurance || '');
    setEditExpiryLicense(activeCar.expiryLicense || '');
    setShowEditForm(true);
  };

  const handleUpdateCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId) return;

    const ok = await updateCar(selectedCarId, {
      name: editName,
      brand: editBrand,
      year: editYear,
      seats: editSeats,
      color: editColor,
      km: parseInt(editKm) || 0,
      ownerPhone: editPhone,
      image: editImage,
      status: activeCar?.status === 'rented' ? 'rented' : editStatus,
      expiryRegistration: editExpiryRegistration,
      expiryInsurance: editExpiryInsurance,
      expiryLicense: editExpiryLicense,
      pricePerDay: parseInt(editPriceDay) || 800000,
      pricePerHour: parseInt(editPriceHour) || 100000,
      pricePerWeek: parseInt(editPriceWeek) || 5000000
    });

    if (!ok) return;
    setShowEditForm(false);
    showToast('Đã cập nhật thông tin xe!', 'success');
  };

  const handleDeleteCar = async () => {
    if (!selectedCarId) return;
    if (activeCar?.status === 'rented') {
      showToast('Không thể xóa xe đang được thuê!', 'error');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa xe ${selectedCarId} khỏi đội xe?`)) return;

    // Server còn chặn thêm nếu xe đã có lịch sử đơn thuê/đơn dịch vụ
    const ok = await deleteCar(selectedCarId);
    if (!ok) return;
    setSelectedCarId(null);
    setShowEditForm(false);
    showToast('Đã xoá xe khỏi đội xe.', 'success');
  };

  const handleOpenReturn = () => {
    if (!activeCar) return;
    setReturnKm(activeCar.km.toString());
    setReturnFuel('8/8');
    setSurcharge('0');
    setPaymentStatus('paid');
    setShowReturnForm(true);
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRental || !selectedCarId || !activeCar) return;

    const kmNum = parseInt(returnKm);
    if (isNaN(kmNum) || kmNum < activeCar.km) {
      showToast(`Số km trả xe phải lớn hơn hoặc bằng số km lúc nhận (${activeCar.km.toLocaleString()} km)!`, 'error');
      return;
    }

    const ok = await completeRental(
      activeRental.id,
      kmNum,
      parseInt(surcharge) || 0,
      returnFuel,
      paymentStatus
    );

    if (!ok) return;
    setShowReturnForm(false);
    showToast('Đã hoàn tất quy trình trả xe và cập nhật trạng thái xe thành công!', 'success');
  };

  /** Lịch tuần HIỆN TẠI (Thứ 2 → Chủ nhật), không còn cắm cứng tuần 13–19/07/2026. */
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // getDay(): 0 = Chủ nhật -> lùi 6 ngày để về Thứ 2
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const names = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    return names.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return {
        name,
        dateStr: pad(d.getDate()),
        fullDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        isToday: d.getTime() === today.getTime(),
      };
    });
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const getCarStatusForDay = (dayDateStr: string) => {
    if (!selectedCarId) return 'ready';
    const targetDate = new Date(dayDateStr);
    const rentalOnDay = rentals.find(r => {
      if (r.carId !== selectedCarId) return false;
      // Đơn đã huỷ không chiếm chỗ trên lịch
      if (r.status === 'cancelled') return false;
      const start = new Date(r.startDate.split('T')[0]);
      const end = new Date(r.endDate.split('T')[0]);
      return targetDate >= start && targetDate <= end;
    });

    if (rentalOnDay) return 'rented';
    // Bảo trì / tạm ngưng là trạng thái hiện tại nên chỉ áp cho ngày hôm nay trở đi
    if (activeCar?.status === 'maintenance' && dayDateStr >= todayStr) return 'maintenance';
    if (activeCar?.status === 'suspended' && dayDateStr >= todayStr) return 'suspended';
    return 'ready';
  };

  const getOwnerNameByPhone = (phone: string) => {
    const match = owners.find(o => o.phone === phone);
    return match ? match.name : phone;
  };

  const getDocExpiryInfo = (expiryDateStr: string) => {
    if (!expiryDateStr) return { status: 'ok', text: 'Còn hạn', daysLeft: 999, color: '#047857', bg: '#d1fae5' };
    const diffDays = Math.ceil((+new Date(expiryDateStr) - +new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { status: 'expired', text: 'Đã hết hạn!', daysLeft: diffDays, color: '#dc2626', bg: '#fee2e2' };
    if (diffDays <= 30) return { status: 'warning', text: `Còn ${diffDays} ngày (Sắp hết)`, daysLeft: diffDays, color: '#b45309', bg: '#fef3c7' };
    return { status: 'ok', text: `Còn ${diffDays} ngày`, daysLeft: diffDays, color: '#047857', bg: '#d1fae5' };
  };

  const readyCount = cars.filter(c => c.status === 'ready').length;
  const rentedCount = cars.filter(c => c.status === 'rented').length;
  const maintenanceCount = cars.filter(c => c.status === 'maintenance').length;
  const suspendedCount = cars.filter(c => c.status === 'suspended').length;

  const statusTags = [
    { label: 'Tất cả trạng thái', value: 'all', count: cars.length, dotColor: '#64748b', activeBg: 'var(--primary)', activeColor: 'white' },
    { label: 'Sẵn sàng trống', value: 'ready', count: readyCount, dotColor: '#10b981', activeBg: '#10b981', activeColor: 'white' },
    { label: 'Đang cho thuê', value: 'rented', count: rentedCount, dotColor: '#0284c7', activeBg: '#0284c7', activeColor: 'white' },
    { label: 'Đang bảo trì 🛠️', value: 'maintenance', count: maintenanceCount, dotColor: '#ef4444', activeBg: '#ef4444', activeColor: 'white' },
    { label: 'Tạm ngưng ⚠️', value: 'suspended', count: suspendedCount, dotColor: '#f59e0b', activeBg: '#f59e0b', activeColor: 'white' }
  ];

  return (
    <div style={{ height: '100%' }}>
      {selectedCarId && activeCar ? (
        /* Sub-page chi tiết xe thay thế danh sách */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setSelectedCarId(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} /> Quay lại danh sách xe
            </button>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Chi tiết xe: {activeCar.name}</h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Cột trái: Thông tin xe & Trạng thái thuê */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: '240px' }}>
                <img src={activeCar.image} alt={activeCar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="license-plate" style={{ fontSize: '22px', padding: '6px 12px' }}>{activeCar.id}</span>
                  {activeCar.status === 'rented' ? (
                    <span style={{ color: 'var(--status-rented-text)', background: 'var(--status-rented-bg)', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: 600 }}>Đang thuê</span>
                  ) : activeCar.status === 'ready' ? (
                    <span style={{ color: 'var(--status-ready-text)', background: 'var(--status-ready-bg)', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: 600 }}>Sẵn sàng</span>
                  ) : activeCar.status === 'maintenance' ? (
                    <span style={{ color: 'var(--status-maintenance-text)', background: 'var(--status-maintenance-bg)', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: 600 }}>Bảo trì</span>
                  ) : (
                    <span style={{ color: 'var(--status-suspended-text)', background: 'var(--status-suspended-bg)', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: 600 }}>Tạm ngưng</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                  <div>Hãng xe: <strong>{activeCar.brand}</strong></div>
                  <div>Năm sản xuất: <strong>{activeCar.year}</strong></div>
                  <div>Màu sắc: <strong>{activeCar.color}</strong></div>
                  <div>Số chỗ ngồi: <strong>{activeCar.seats} chỗ</strong></div>
                  <div>Số KM hiện tại: <strong>{activeCar.km.toLocaleString()} km</strong></div>
                  <div>Chủ xe: <strong>{getOwnerNameByPhone(activeCar.ownerPhone)}</strong></div>
                </div>

                {activeCar.status === 'rented' && (
                  <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#15803d', fontWeight: 700, fontSize: '14px' }}>🔑 Hợp đồng thuê hiện tại</div>
                      {activeRental && (
                        <Link to={`/contracts?id=${activeRental.id}`} style={{ fontSize: '12.5px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                          Xem chi tiết đơn #{activeRental.id} →
                        </Link>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Khách hàng đang thuê:</span>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{activeCar.customer || activeRental?.customerName}</div>
                        {activeRental?.customerPhone && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }} className="font-mono">{activeRental.customerPhone}</div>
                        )}
                      </div>
                      <Link to="/customers" style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '6px 12px', background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                          Danh sách khách 👤
                        </button>
                      </Link>
                    </div>

                    {activeRental && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e0f2fe', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #bae6fd' }}>
                        <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '13px' }}>⏳ Thời gian còn lại:</span>
                        <SpeedometerCountdown endDateStr={activeRental.endDate} />
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button className="btn-primary" onClick={handleOpenEdit} style={{ flex: 1, justifyContent: 'center', background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)' }}>
                    <Edit size={16} style={{ marginRight: '6px' }} /> Chỉnh sửa xe
                  </button>
                  {activeCar.status === 'ready' && (
                    <Link to={`/rental/new?car=${activeCar.id}`} style={{ flex: 1, textDecoration: 'none', display: 'flex' }}>
                      <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                        Tạo đơn mới
                      </button>
                    </Link>
                  )}
                  {activeCar.status === 'rented' && (
                    <button className="btn-primary" onClick={handleOpenReturn} style={{ flex: 1.2, justifyContent: 'center', background: 'var(--status-ready-text)' }}>
                      <CheckSquare size={16} style={{ marginRight: '6px' }} /> Nhận trả xe
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cột phải: Giá cả, Giấy tờ, Lịch đặt xe & Lịch sử người đặt */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Biểu giá & Hạn giấy tờ thành 2 cột */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Bảng giá thuê xe */}
                <div style={{ background: 'white', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ fontSize: '15px', margin: '0 0 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                    <Receipt size={18} color="var(--primary)" /> Biểu giá thuê tự đặt
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Thuê theo Giờ:</span>
                      <strong className="font-mono" style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 800 }}>{(activeCar.pricePerHour || 100000).toLocaleString('vi-VN')} ₫</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '13px', color: '#166534', fontWeight: 700 }}>Thuê theo Ngày:</span>
                      <strong className="font-mono" style={{ fontSize: '16px', color: '#15803d', fontWeight: 800 }}>{(activeCar.pricePerDay || 800000).toLocaleString('vi-VN')} ₫</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f9ff', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #bae6fd' }}>
                      <span style={{ fontSize: '13px', color: '#075985', fontWeight: 700 }}>Thuê theo Tuần:</span>
                      <strong className="font-mono" style={{ fontSize: '15px', color: '#0369a1', fontWeight: 800 }}>{(activeCar.pricePerWeek || 5000000).toLocaleString('vi-VN')} ₫</strong>
                    </div>
                  </div>
                </div>

                {/* Hạn giấy tờ xe */}
                <div style={{ background: 'white', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ fontSize: '15px', margin: '0 0 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                    <ShieldCheck size={18} color="var(--primary)" /> Hạn giấy tờ xe
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(() => {
                      const info = getDocExpiryInfo(activeCar.expiryRegistration);
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Hạn đăng kiểm</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }} className="font-mono">{new Date(activeCar.expiryRegistration).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: info.bg, color: info.color }}>
                            {info.text}
                          </span>
                        </div>
                      );
                    })()}

                    {(() => {
                      const info = getDocExpiryInfo(activeCar.expiryInsurance);
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Bảo hiểm TNDS</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }} className="font-mono">{new Date(activeCar.expiryInsurance).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: info.bg, color: info.color }}>
                            {info.text}
                          </span>
                        </div>
                      );
                    })()}

                    {(() => {
                      const info = getDocExpiryInfo(activeCar.expiryLicense);
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Phù hiệu xe</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }} className="font-mono">{new Date(activeCar.expiryLicense).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: info.bg, color: info.color }}>
                            {info.text}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Lịch đặt xe (Calendar Timeline) */}
              <div className="card">
                <h3 style={{ fontSize: '16px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={18} color="var(--primary)" /> Lịch đặt xe tuần này
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
                  {weekDays.map(day => {
                    const status = getCarStatusForDay(day.fullDate);
                    return (
                      <div key={day.fullDate} style={{ padding: '12px 6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: status === 'rented' ? 'var(--status-rented-bg)' : status === 'maintenance' ? 'var(--status-maintenance-bg)' : status === 'suspended' ? 'var(--status-suspended-bg)' : 'white' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{day.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{day.dateStr}</div>
                        <div style={{ fontSize: '10px', marginTop: '6px', fontWeight: 700, color: status === 'rented' ? 'var(--status-rented-text)' : status === 'maintenance' ? 'var(--status-maintenance-text)' : 'var(--text-secondary)' }}>
                          {status === 'rented' ? 'Bận' : status === 'maintenance' ? 'Bảo trì' : status === 'suspended' ? 'Ngưng' : 'Trống'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lịch sử người thuê */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Lịch sử người đặt xe</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <th style={{ padding: '12px 24px' }}>Khách hàng</th>
                      <th style={{ padding: '12px 24px' }}>Thời gian thuê</th>
                      <th style={{ padding: '12px 24px' }}>Tổng tiền</th>
                      <th style={{ padding: '12px 24px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carRentals.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          Chưa có lịch sử thuê cho xe này.
                        </td>
                      </tr>
                    ) : (
                      pagedRentals.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                          <td style={{ padding: '12px 24px' }}>
                            <strong>{r.customerName}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.customerPhone}</div>
                          </td>
                          <td style={{ padding: '12px 24px' }}>
                            {new Date(r.startDate).toLocaleDateString('vi-VN')} → {new Date(r.endDate).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--accent)' }}>
                            {r.totalAmount.toLocaleString()} ₫
                          </td>
                          <td style={{ padding: '12px 24px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: r.status === 'active' ? 'var(--status-rented-text)' : 'var(--status-ready-text)' }}>
                              {r.status === 'active' ? 'Đang chạy' : 'Hoàn tất'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {rentalTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-main)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Hiển thị <strong>{(rentalPage - 1) * RENTALS_PER_PAGE + 1}</strong>–<strong>{Math.min(rentalPage * RENTALS_PER_PAGE, carRentals.length)}</strong> / <strong>{carRentals.length}</strong> lượt thuê
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        disabled={rentalPage === 1}
                        onClick={() => setRentalPage(p => p - 1)}
                        style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: rentalPage === 1 ? '#f1f5f9' : 'white', color: rentalPage === 1 ? 'var(--text-secondary)' : 'var(--text-main)', cursor: rentalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: rentalPage === 1 ? 0.5 : 1 }}
                      >
                        ‹
                      </button>

                      {Array.from({ length: rentalTotalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setRentalPage(page)}
                          style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: rentalPage === page ? '1.5px solid var(--primary)' : '1px solid var(--border-strong)', background: rentalPage === page ? 'var(--primary)' : 'white', color: rentalPage === page ? 'white' : 'var(--text-main)', cursor: 'pointer', fontSize: '13px', fontWeight: rentalPage === page ? 800 : 400, minWidth: '32px' }}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={rentalPage === rentalTotalPages}
                        onClick={() => setRentalPage(p => p + 1)}
                        style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: rentalPage === rentalTotalPages ? '#f1f5f9' : 'white', color: rentalPage === rentalTotalPages ? 'var(--text-secondary)' : 'var(--text-main)', cursor: rentalPage === rentalTotalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: rentalPage === rentalTotalPages ? 0.5 : 1 }}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lịch sử chi phí của xe này */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Lịch sử chi phí của xe này</h3>
                  <button 
                    onClick={() => {
                      setExpenseDate(new Date().toISOString().split('T')[0]);
                      setShowAddExpenseModal(true);
                    }}
                    style={{ padding: '6px 12px', background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <Plus size={14} /> Thêm chi phí
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <th style={{ padding: '12px 24px' }}>Ngày chi</th>
                      <th style={{ padding: '12px 24px' }}>Nội dung</th>
                      <th style={{ padding: '12px 24px' }}>Danh mục</th>
                      <th style={{ padding: '12px 24px' }}>Địa điểm</th>
                      <th style={{ padding: '12px 24px', textAlign: 'right' }}>Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(e => e.ref === activeCar.id).length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          Chưa ghi nhận chi phí nào cho xe này.
                        </td>
                      </tr>
                    ) : (
                      expenses.filter(e => e.ref === activeCar.id).map(e => (
                        <tr key={e.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                          <td style={{ padding: '12px 24px' }}>{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                          <td style={{ padding: '12px 24px', fontWeight: 600 }}>{e.title}</td>
                          <td style={{ padding: '12px 24px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '100px', 
                              fontSize: '11px', 
                              fontWeight: 600,
                              background: e.category === 'Bảo dưỡng' ? 'var(--status-ready-bg)' : e.category === 'Sửa chữa' ? '#fef2f2' : '#f8fafc',
                              color: e.category === 'Bảo dưỡng' ? 'var(--status-ready-text)' : e.category === 'Sửa chữa' ? '#ef4444' : 'var(--text-main)'
                            }}>
                              {e.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px 24px', color: 'var(--text-secondary)' }}>{e.location || 'Chưa cập nhật'}</td>
                          <td style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>
                            {e.amount.toLocaleString()} ₫
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* Danh sách Đội xe chính */
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Quản lý Đội xe</h1>
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
              <Plus size={18} />
              Thêm xe mới
            </button>
          </div>

          {/* Ô tìm kiếm và Nút kích hoạt Popup Bộ lọc Nâng cao */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-strong)', padding: '8px 16px', borderRadius: 'var(--radius-md)', flex: 1, minWidth: '250px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Tìm biển số, dòng xe..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', marginLeft: '8px', outline: 'none', width: '100%', fontFamily: 'inherit' }}
              />
            </div>
            
            {/* Nút Kích Hoạt Popup Bộ Lọc Nâng Cao */}
            <button 
              type="button"
              onClick={() => setShowFilterModal(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: activeFilterCount > 0 ? '#e0f2fe' : 'white', 
                color: activeFilterCount > 0 ? 'var(--primary)' : 'var(--text-main)', 
                border: activeFilterCount > 0 ? '1.5px solid var(--primary)' : '1px solid var(--border-strong)', 
                padding: '8px 16px', 
                borderRadius: 'var(--radius-md)', 
                fontWeight: 700, 
                fontSize: '13px', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Filter size={18} color={activeFilterCount > 0 ? 'var(--primary)' : 'var(--text-secondary)'} />
              <span>Bộ lọc nâng cao</span>
              {activeFilterCount > 0 && (
                <span style={{ background: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 800, padding: '1px 6px', borderRadius: '100px' }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Chuyển đổi Dạng xem (Grid vs List) */}
            <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ padding: '8px 12px', border: 'none', background: viewMode === 'grid' ? 'var(--primary)' : 'white', color: viewMode === 'grid' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                style={{ padding: '8px 12px', border: 'none', background: viewMode === 'list' ? 'var(--primary)' : 'white', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Bộ lọc Thẻ Tag Trạng Thái ngay bên dưới */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {statusTags.map(tag => {
              const isActive = statusFilter === tag.value;
              return (
                <button 
                  key={tag.value}
                  onClick={() => setStatusFilter(tag.value)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '100px', 
                    border: isActive ? `1.5px solid ${tag.activeBg}` : '1px solid var(--border-strong)', 
                    fontWeight: 700, 
                    fontSize: '13px',
                    background: isActive ? tag.activeBg : 'white',
                    color: isActive ? tag.activeColor : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none'
                  }}
                >
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: isActive ? 'white' : tag.dotColor,
                    display: 'inline-block'
                  }} />
                  <span>{tag.label}</span>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '1px 7px', 
                    borderRadius: '100px', 
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    fontWeight: 700
                  }}>
                    {tag.count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredCars.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
              Không tìm thấy xe nào khớp với bộ lọc của bạn.
            </div>
          ) : (
            viewMode === 'grid' ? (
              /* DẠNG XEM LƯỚI (GRID VIEW) */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredCars.map(car => (
                  <div 
                    key={car.id} 
                    className="card" 
                    style={{ 
                      padding: '16px', 
                      cursor: 'pointer', 
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      alignItems: 'stretch'
                    }}
                    onClick={() => setSelectedCarId(car.id)}
                  >
                    {/* Image with status cover overlay */}
                    <div style={{ width: '100%', height: '160px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      <img src={car.image} alt={car.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      {/* Status Overlays */}
                      {car.status === 'rented' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 104, 55, 0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '6px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>ĐANG ĐƯỢC THUÊ</span>
                          {rentals.find(r => r.carId === car.id && r.status === 'active') && (
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                              <LiveCountdown endDateStr={rentals.find(r => r.carId === car.id && r.status === 'active')!.endDate} />
                            </div>
                          )}
                        </div>
                      )}
                      {car.status === 'maintenance' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>ĐANG BẢO TRÌ 🛠️</span>
                        </div>
                      )}
                      {car.status === 'suspended' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(100, 116, 139, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>TẠM NGƯNG ⚠️</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="license-plate" style={{ fontSize: '14px', padding: '2px 8px' }}>{car.id}</span>
                        {car.status === 'ready' && (
                          <span style={{ color: 'var(--status-ready-text)', background: 'var(--status-ready-bg)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>Trống</span>
                        )}
                      </div>
                      
                      <div style={{ fontWeight: 600, fontSize: '18px' }}>{car.name}</div>
                      
                      {/* Tags: Owner, Customer and Daily Price */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '4px', fontSize: '12.5px' }}>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          👤 Chủ xe: <strong style={{ color: 'var(--text-main)' }}>{getOwnerNameByPhone(car.ownerPhone)}</strong>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', width: 'fit-content', marginTop: '2px' }}>
                          <span style={{ color: '#166534', fontWeight: 600 }}>Giá:</span>
                          <strong className="font-mono" style={{ color: '#15803d', fontSize: '14.5px', fontWeight: 800 }}>
                            {(car.pricePerDay || 800000).toLocaleString('vi-VN')} ₫/ngày
                          </strong>
                        </div>
                        {car.status === 'rented' && car.customer && (
                          <div style={{ background: '#f0fdf4', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ color: '#15803d', fontWeight: 700 }}>
                              🔑 Khách thuê: <span>{car.customer}</span>
                            </div>
                            {rentals.find(r => r.carId === car.id && r.status === 'active') && (
                              <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>⏳ Thời gian còn:</span>
                                <span className="font-mono" style={{ background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                                  <LiveCountdown endDateStr={rentals.find(r => r.carId === car.id && r.status === 'active')!.endDate} />
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div>Màu: {car.color}</div>
                        <div>KM: {(car.km || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* DẠNG XEM DÒNG (LIST/ROW VIEW) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredCars.map(car => (
                  <div 
                    key={car.id} 
                    className="card" 
                    style={{ 
                      padding: '12px 20px', 
                      cursor: 'pointer', 
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px'
                    }}
                    onClick={() => setSelectedCarId(car.id)}
                  >
                    {/* Small Image with status overlays */}
                    <div style={{ width: '120px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      <img src={car.image} alt={car.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {car.status === 'rented' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 104, 55, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 800 }}>
                          THUÊ
                        </div>
                      )}
                      {car.status === 'maintenance' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 800 }}>
                          🛠️ BẢO TRÌ
                        </div>
                      )}
                      {car.status === 'suspended' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(100, 116, 139, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 800 }}>
                          ⚠️ NGƯNG
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '16px' }}>{car.name}</strong>
                      <span className="license-plate" style={{ fontSize: '12px', alignSelf: 'flex-start', padding: '2px 8px' }}>{car.id}</span>
                    </div>

                    {/* Owner, Price & Customer tags */}
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Chủ xe: <strong>{getOwnerNameByPhone(car.ownerPhone)}</strong>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', width: 'fit-content', marginTop: '2px' }}>
                        <span style={{ color: '#166534', fontWeight: 600 }}>Giá:</span>
                        <strong className="font-mono" style={{ color: '#15803d', fontSize: '13.5px', fontWeight: 800 }}>
                          {(car.pricePerDay || 800000).toLocaleString('vi-VN')} ₫/ngày
                        </strong>
                      </div>
                      {car.status === 'rented' && car.customer && (
                        <div style={{ color: 'var(--primary)' }}>
                          Khách thuê: <strong>{car.customer}</strong>
                        </div>
                      )}
                    </div>

                    {/* Price / KM */}
                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div>Giá ngày: <strong style={{ color: 'var(--accent)' }}>{(car.pricePerDay || 800000).toLocaleString()} ₫</strong></div>
                      <div>Số KM: <strong>{(car.km || 0).toLocaleString()} km</strong></div>
                    </div>

                    {/* Status & Countdown */}
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      {car.status === 'ready' && (
                        <span style={{ color: 'var(--status-ready-text)', background: 'var(--status-ready-bg)', padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>Sẵn sàng</span>
                      )}
                      {car.status === 'rented' && (
                        <>
                          <span style={{ color: 'var(--status-rented-text)', background: 'var(--status-rented-bg)', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>Đang thuê</span>
                          {rentals.find(r => r.carId === car.id && r.status === 'active') && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--status-rented-text)', fontWeight: 700 }}>
                              ⏳ <LiveCountdown endDateStr={rentals.find(r => r.carId === car.id && r.status === 'active')!.endDate} />
                            </div>
                          )}
                        </>
                      )}
                      {car.status === 'maintenance' && (
                        <span style={{ color: 'var(--status-maintenance-text)', background: 'var(--status-maintenance-bg)', padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>Bảo trì</span>
                      )}
                      {car.status === 'suspended' && (
                        <span style={{ color: 'var(--status-suspended-text)', background: 'var(--status-suspended-bg)', padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>Tạm ngưng</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* POPUP BỘ LỌC NÂNG CAO */}
      {showFilterModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', background: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700 }}>
                <Filter size={20} color="var(--primary)" /> Bộ lọc tìm kiếm nâng cao
              </h2>
              <button type="button" onClick={() => setShowFilterModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* 1. Thanh trượt Mức Giá Thuê Ngày */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>💰 Giá thuê ngày tối đa:</label>
                  <strong className="font-mono" style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 800 }}>
                    {maxPriceFilter >= 3000000 ? 'Tất cả giá (Không giới hạn)' : `<= ${maxPriceFilter.toLocaleString('vi-VN')} ₫/ngày`}
                  </strong>
                </div>
                <input 
                  type="range" 
                  min="300000" 
                  max="3000000" 
                  step="100000"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>300.000 ₫</span>
                  <span>1.500.000 ₫</span>
                  <span>3.000.000 ₫+</span>
                </div>
              </div>

              {/* 2. Lọc theo Khách hàng đang thuê */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, marginBottom: '6px' }}>🔑 Lọc theo Khách hàng đang thuê xe:</label>
                {/* Selected Tag */}
                {customerFilter !== 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e0f2fe', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', padding: '6px 12px', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                    <span>🔑 {customers.find(c => c.name === customerFilter)?.name} ({customers.find(c => c.name === customerFilter)?.phone})</span>
                    <button type="button" onClick={() => { setCustomerFilter('all'); setCustomerSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 900, fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>✕</button>
                  </div>
                )}
                {/* Search Input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'white', padding: '4px 10px' }}>
                  <Search size={15} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc số điện thoại khách..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    style={{ border: 'none', outline: 'none', width: '100%', padding: '6px 8px', fontFamily: 'inherit', fontSize: '13.5px', background: 'transparent' }}
                  />
                  {customerSearch && (
                    <button type="button" onClick={() => setCustomerSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 2px' }}>✕</button>
                  )}
                </div>
                {/* Results List */}
                {customerSearch && (
                  <div style={{ border: '1px solid var(--border-strong)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', background: 'white', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <button
                      type="button"
                      onClick={() => { setCustomerFilter('all'); setCustomerSearch(''); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '13px', background: customerFilter === 'all' ? '#f0f9ff' : 'white', color: 'var(--text-secondary)', fontStyle: 'italic', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                    >
                      — Tất cả khách hàng —
                    </button>
                    {customers
                      .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
                      .map(cust => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => { setCustomerFilter(cust.name); setCustomerSearch(''); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '13px', background: customerFilter === cust.name ? '#e0f2fe' : 'white', color: 'var(--text-main)', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontWeight: customerFilter === cust.name ? 700 : 400 }}
                        >
                          <div style={{ fontWeight: 600 }}>{cust.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cust.phone}</div>
                        </button>
                      ))
                    }
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).length === 0 && (
                      <div style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Không tìm thấy khách hàng nào.</div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Lọc theo Chủ xe */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, marginBottom: '6px' }}>👤 Lọc theo Chủ xe (Ký gửi):</label>
                {/* Selected Tag */}
                {ownerFilter !== 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #4ade80', borderRadius: 'var(--radius-md)', padding: '6px 12px', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                    <span>👤 {owners.find(o => o.phone === ownerFilter)?.name} ({ownerFilter})</span>
                    <button type="button" onClick={() => { setOwnerFilter('all'); setOwnerSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 900, fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>✕</button>
                  </div>
                )}
                {/* Search Input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'white', padding: '4px 10px' }}>
                  <Search size={15} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc số điện thoại chủ xe..."
                    value={ownerSearch}
                    onChange={e => setOwnerSearch(e.target.value)}
                    style={{ border: 'none', outline: 'none', width: '100%', padding: '6px 8px', fontFamily: 'inherit', fontSize: '13.5px', background: 'transparent' }}
                  />
                  {ownerSearch && (
                    <button type="button" onClick={() => setOwnerSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 2px' }}>✕</button>
                  )}
                </div>
                {/* Results List */}
                {ownerSearch && (
                  <div style={{ border: '1px solid var(--border-strong)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', background: 'white', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <button
                      type="button"
                      onClick={() => { setOwnerFilter('all'); setOwnerSearch(''); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '13px', background: ownerFilter === 'all' ? '#f0fdf4' : 'white', color: 'var(--text-secondary)', fontStyle: 'italic', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                    >
                      — Tất cả chủ xe —
                    </button>
                    {owners
                      .filter(o => o.name.toLowerCase().includes(ownerSearch.toLowerCase()) || o.phone.includes(ownerSearch))
                      .map(owner => (
                        <button
                          key={owner.id}
                          type="button"
                          onClick={() => { setOwnerFilter(owner.phone); setOwnerSearch(''); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '13px', background: ownerFilter === owner.phone ? '#f0fdf4' : 'white', color: 'var(--text-main)', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontWeight: ownerFilter === owner.phone ? 700 : 400 }}
                        >
                          <div style={{ fontWeight: 600 }}>{owner.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{owner.phone}</div>
                        </button>
                      ))
                    }
                    {owners.filter(o => o.name.toLowerCase().includes(ownerSearch.toLowerCase()) || o.phone.includes(ownerSearch)).length === 0 && (
                      <div style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Không tìm thấy chủ xe nào.</div>
                    )}
                  </div>
                )}
              </div>


              {/* 4. Lọc theo Màu sắc xe */}
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, marginBottom: '8px' }}>🎨 Lọc theo Màu sắc xe:</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    onClick={() => setColorFilter('all')}
                    style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: colorFilter === 'all' ? '1.5px solid var(--primary)' : '1px solid var(--border-strong)', background: colorFilter === 'all' ? 'var(--primary)' : 'white', color: colorFilter === 'all' ? 'white' : 'var(--text-main)', cursor: 'pointer' }}
                  >
                    Tất cả màu
                  </button>
                  {CAR_COLOR_PALETTE.map(item => (
                    <button 
                      key={item.name}
                      type="button"
                      onClick={() => setColorFilter(item.name)}
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px', 
                        borderRadius: '100px', 
                        fontSize: '12px', 
                        fontWeight: 700, 
                        border: colorFilter === item.name ? '1.5px solid var(--primary)' : '1px solid var(--border-strong)', 
                        background: colorFilter === item.name ? '#e0f2fe' : 'white', 
                        color: 'var(--text-main)', 
                        cursor: 'pointer' 
                      }}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.hex, border: `1px solid ${item.border}`, display: 'inline-block' }} />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '6px' }}>
              <button 
                type="button"
                disabled={activeFilterCount === 0}
                onClick={() => {
                  setMaxPriceFilter(3000000);
                  setCustomerFilter('all');
                  setCustomerSearch('');
                  setOwnerFilter('all');
                  setOwnerSearch('');
                  setColorFilter('all');
                }}
                style={{ 
                  padding: '8px 16px', 
                  background: activeFilterCount > 0 ? '#fee2e2' : '#f1f5f9', 
                  border: activeFilterCount > 0 ? '1.5px solid #fca5a5' : '1px solid transparent',
                  borderRadius: 'var(--radius-md)', 
                  color: activeFilterCount > 0 ? '#b91c1c' : 'var(--text-secondary)', 
                  fontWeight: activeFilterCount > 0 ? 700 : 600, 
                  cursor: activeFilterCount > 0 ? 'pointer' : 'not-allowed', 
                  fontSize: '13px',
                  opacity: activeFilterCount > 0 ? 1 : 0.5,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {activeFilterCount > 0 ? `🗑️ Xoá ${activeFilterCount} bộ lọc` : 'Đặt lại bộ lọc'}
              </button>
              <button 
                type="button"
                className="btn-primary"
                onClick={() => setShowFilterModal(false)}
                style={{ padding: '8px 24px', fontWeight: 700 }}
              >
                Áp dụng bộ lọc ({filteredCars.length} xe)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Form thêm xe mới */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleCreateCar} style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Thêm xe mới vào đội</h2>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Biển số xe *</label>
                <input type="text" placeholder="VD: 51F-123.45" value={newPlate} onChange={e => setNewPlate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hãng xe</label>
                <input type="text" placeholder="VD: Mazda" value={newBrand} onChange={e => setNewBrand(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Dòng xe</label>
                <input type="text" placeholder="VD: Mazda 3" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Đời xe</label>
                <input type="text" placeholder="VD: 2022" value={newYear} onChange={e => setNewYear(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Màu sắc xe *</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {CAR_COLOR_PALETTE.map(item => (
                  <button 
                    key={item.name}
                    type="button"
                    onClick={() => setNewColor(item.name)}
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px', 
                      borderRadius: '100px', 
                      fontSize: '12px', 
                      fontWeight: 700, 
                      border: newColor === item.name ? '2px solid var(--primary)' : '1px solid var(--border-strong)', 
                      background: newColor === item.name ? '#e0f2fe' : 'white', 
                      color: 'var(--text-main)', 
                      cursor: 'pointer' 
                    }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.hex, border: `1px solid ${item.border}`, display: 'inline-block' }} />
                    {item.name}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="VD: Trắng (Hoặc tự nhập màu khác)..." value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số chỗ ngồi</label>
                <input type="number" value={newSeats} onChange={e => setNewSeats(parseInt(e.target.value) || 5)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            {/* Custom pricing in add car */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Giờ (₫) *</label>
                <MoneyInputLeft value={newPriceHour} onChange={setNewPriceHour} placeholder="100000" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Ngày (₫) *</label>
                <MoneyInputLeft value={newPriceDay} onChange={setNewPriceDay} placeholder="800000" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Tuần (₫) *</label>
                <MoneyInputLeft value={newPriceWeek} onChange={setNewPriceWeek} placeholder="5000000" required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số KM ban đầu *</label>
                <input type="number" placeholder="VD: 15000" value={newKm} onChange={e => setNewKm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            {/* THÔNG TIN CHỦ XE */}
            <div style={{ background: 'var(--bg-page)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Thông tin Chủ xe / Đối tác góp xe *</label>
                <div style={{ display: 'flex', gap: '6px', background: 'white', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <button 
                    type="button" 
                    onClick={() => setOwnerOptionMode('select')}
                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: ownerOptionMode === 'select' ? 'var(--primary)' : 'transparent', color: ownerOptionMode === 'select' ? 'white' : 'var(--text-secondary)' }}
                  >
                    Chọn có sẵn
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setOwnerOptionMode('create')}
                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: ownerOptionMode === 'create' ? 'var(--primary)' : 'transparent', color: ownerOptionMode === 'create' ? 'white' : 'var(--text-secondary)' }}
                  >
                    + Tạo mới chủ xe
                  </button>
                </div>
              </div>

              {ownerOptionMode === 'select' ? (
                <div>
                  <select 
                    value={selectedOwnerPhone} 
                    onChange={e => setSelectedOwnerPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'white' }}
                  >
                    <option value="">-- Chọn chủ xe trong hệ thống --</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.phone}>
                        {o.name} - SĐT: {o.phone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      placeholder="Tên chủ xe mới *" 
                      value={newOwnerName} 
                      onChange={e => setNewOwnerName(e.target.value)} 
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit' }} 
                      required={ownerOptionMode === 'create'}
                    />
                    <input 
                      type="tel" 
                      placeholder="Số điện thoại *" 
                      value={newOwnerPhone} 
                      onChange={e => setNewOwnerPhone(e.target.value)} 
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit' }} 
                      required={ownerOptionMode === 'create'}
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Địa chỉ chủ xe (tùy chọn)" 
                    value={newOwnerAddress} 
                    onChange={e => setNewOwnerAddress(e.target.value)} 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit' }} 
                  />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh xe</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {newImage ? (
                  <img src={newImage} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={20} color="var(--text-secondary)" />
                  </div>
                )}
                <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)' }} onClick={() => { setGalleryTarget('add'); setShowGallery(true); }}>
                  Chọn từ thư viện
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
              <button type="submit" className="btn-primary">Thêm xe</button>
            </div>
          </form>
        </div>
      )}

      {/* Form chỉnh sửa xe */}
      {showEditForm && activeCar && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleUpdateCar} style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Chỉnh sửa xe {selectedCarId}</h2>
              <button type="button" onClick={() => setShowEditForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hãng xe</label>
                <input type="text" value={editBrand} onChange={e => setEditBrand(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Dòng xe</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Đời xe</label>
                <input type="text" value={editYear} onChange={e => setEditYear(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số chỗ ngồi</label>
                <input type="number" value={editSeats} onChange={e => setEditSeats(parseInt(e.target.value) || 5)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            {/* Custom pricing in edit car */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Giờ (₫) *</label>
                <input type="number" value={editPriceHour} onChange={e => setEditPriceHour(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Ngày (₫) *</label>
                <input type="number" value={editPriceDay} onChange={e => setEditPriceDay(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Tuần (₫) *</label>
                <input type="number" value={editPriceWeek} onChange={e => setEditPriceWeek(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Màu sắc</label>
                <input type="text" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số KM hiện tại</label>
                <input type="number" value={editKm} onChange={e => setEditKm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>SĐT Đối tác góp xe</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Trạng thái xe</label>
                <select 
                  value={editStatus} 
                  disabled={activeCar.status === 'rented'}
                  onChange={e => setEditStatus(e.target.value as any)} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', background: activeCar.status === 'rented' ? '#f3f4f6' : 'white' }}
                >
                  <option value="ready">Sẵn sàng</option>
                  <option value="maintenance">Bảo trì / Sửa chữa</option>
                  <option value="suspended">Tạm ngưng hoạt động</option>
                </select>
                {activeCar.status === 'rented' && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Không thể đổi trạng thái khi đang cho thuê.</span>
                )}
              </div>
            </div>

            {/* Hạn giấy tờ xe — nhập trực tiếp thay vì bị gán cứng lúc tạo xe */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hạn giấy tờ xe</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {([
                  ['Đăng kiểm', editExpiryRegistration, setEditExpiryRegistration],
                  ['Bảo hiểm TNDS', editExpiryInsurance, setEditExpiryInsurance],
                  ['Phù hiệu xe', editExpiryLicense, setEditExpiryLicense],
                ] as const).map(([label, value, setter]) => (
                  <div key={label} style={{ flex: '1 1 150px' }}>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</span>
                    <input
                      type="date"
                      value={value}
                      onChange={e => setter(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh xe</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {editImage
                  ? <img src={editImage} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                  : <div style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><ImageIcon size={20} /></div>}
                <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)' }} onClick={() => { setGalleryTarget('edit'); setShowGallery(true); }}>
                  Thay ảnh khác
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button type="button" className="btn-primary" onClick={handleDeleteCar} style={{ background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', border: 'none', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Trash2 size={16} /> Xóa xe này
              </button>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowEditForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
                <button type="submit" className="btn-primary">Cập nhật</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Form Trả Xe */}
      {showReturnForm && activeCar && activeRental && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleConfirmReturn} style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Nhận xe trả & Chốt hợp đồng</h2>
              <button type="button" onClick={() => setShowReturnForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '14px', border: '1px solid var(--border-light)' }}>
              <div>Xe: <strong>{activeCar.id} ({activeCar.name})</strong></div>
              <div>Khách thuê: <strong>{activeCar.customer}</strong></div>
              <div style={{ marginTop: '4px' }}>Số KM lúc giao: <strong>{activeCar.km.toLocaleString()} km</strong></div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số KM lúc nhận lại</label>
              <input 
                type="number" 
                value={returnKm} 
                onChange={e => setReturnKm(e.target.value)} 
                placeholder={`Phải >= ${activeCar.km}`} 
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', fontWeight: 600 }} 
                required 
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Mức nhiên liệu còn lại</label>
                <select value={returnFuel} onChange={e => setReturnFuel(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }}>
                  <option value="8/8 (Đầy)">8/8 (Đầy)</option>
                  <option value="7/8">7/8</option>
                  <option value="6/8">6/8</option>
                  <option value="5/8">5/8</option>
                  <option value="4/8 (Nửa)">4/8 (Nửa)</option>
                  <option value="3/8">3/8</option>
                  <option value="2/8">2/8</option>
                  <option value="1/8 (Cạn)">1/8 (Cạn)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Phụ phí phát sinh (nếu có)</label>
                <input type="number" placeholder="Quá giờ, vệ sinh, hư hỏng..." value={surcharge} onChange={e => setSurcharge(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Tình trạng thanh toán cuối</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', fontWeight: 600, color: paymentStatus === 'paid' ? 'var(--status-ready-text)' : 'var(--status-maintenance-text)' }}>
                <option value="paid">Đã thanh toán đủ (Đóng đơn)</option>
                <option value="debt">Ghi nhận công nợ (Khách còn nợ)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowReturnForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
              <button type="submit" className="btn-primary" style={{ background: 'var(--status-ready-text)' }}>Xác nhận trả xe</button>
            </div>
          </form>
        </div>
      )}

      {/* QUICK ADD EXPENSE MODAL */}
      {showAddExpenseModal && activeCar && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleAddExpenseSubmit} style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Ghi nhận chi phí xe {activeCar.id}</h2>
              <button type="button" onClick={() => setShowAddExpenseModal(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Nội dung chi phí *</label>
              <input type="text" placeholder="VD: Thay dầu động cơ định kỳ" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Số tiền (₫) *</label>
                <input type="number" placeholder="Số tiền" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Danh mục chi phí</label>
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }}>
                  <option value="Bảo dưỡng">Bảo dưỡng</option>
                  <option value="Vệ sinh">Vệ sinh</option>
                  <option value="Sửa chữa">Sửa chữa</option>
                  <option value="Giấy tờ">Giấy tờ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Ngày chi *</label>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Địa điểm / Nhà cung cấp</label>
                <input type="text" placeholder="VD: Gara Cộng Hòa" value={expenseLocation} onChange={e => setExpenseLocation(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowAddExpenseModal(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Hủy</button>
              <button type="submit" className="btn-primary">Ghi nhận</button>
            </div>
          </form>
        </div>
      )}

      {showGallery && (
        <ImageGallery 
          onClose={() => setShowGallery(false)}
          onSelect={(url) => {
            const finalUrl = Array.isArray(url) ? url[0] : url;
            if (galleryTarget === 'add') setNewImage(finalUrl);
            else setEditImage(finalUrl);
          }}
        />
      )}
    </div>
  );
};

export default FleetManagement;
