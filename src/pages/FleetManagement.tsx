import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Table, Tag } from 'antd';
import { Search, Filter, Plus, Gauge, ShieldCheck, X, Image as ImageIcon, Trash2, CheckSquare, Calendar as CalendarIcon, ArrowLeft, Edit, LayoutGrid, List, Receipt, Layers } from 'lucide-react';
import { useApp, type Car } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';

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
  const [activeDetailTab, setActiveDetailTab] = useState<'rentals' | 'expenses'>('rentals');

  // Car Expense Form State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Bảo dưỡng');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseLocation, setExpenseLocation] = useState('');

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !expenseTitle || !expenseAmount) return;

    addExpense({
      id: Date.now().toString(),
      title: expenseTitle,
      amount: parseInt(expenseAmount) || 0,
      category: expenseCategory,
      date: expenseDate || new Date().toISOString().split('T')[0],
      ref: selectedCarId,
      location: expenseLocation || 'Chưa cập nhật'
    });

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

  // Return Car Form State
  const [returnKm, setReturnKm] = useState('');
  const [returnFuel, setReturnFuel] = useState('8/8');
  const [surcharge, setSurcharge] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'debt'>('paid');

  const normalizePlate = (str: string) => str ? str.toUpperCase().replace(/[-. ]/g, '') : '';
  const activeCar = cars.find(c => normalizePlate(c.id) === normalizePlate(selectedCarId ?? ''));
  const activeRental = rentals.find(r => normalizePlate(r.carId) === normalizePlate(selectedCarId ?? '') && r.status === 'active');
  const carRentals = rentals.filter(r => normalizePlate(r.carId) === normalizePlate(selectedCarId ?? '')).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

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

  const handleCreateCar = (e: React.FormEvent) => {
    e.preventDefault();

    let finalOwnerPhone = '';

    if (ownerOptionMode === 'create') {
      if (!newOwnerName || !newOwnerPhone) {
        showToast('Vui lòng nhập Tên và Số điện thoại chủ xe mới!', 'error');
        return;
      }
      addOwner({
        id: Date.now().toString(),
        name: newOwnerName,
        phone: newOwnerPhone,
        address: newOwnerAddress || 'Chưa cập nhật',
        notes: 'Chủ xe mới tạo từ Quản lý Đội xe',
        image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
      });
      finalOwnerPhone = newOwnerPhone;
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

    const cleanPlate = newPlate.trim();
    if (cars.some(c => normalizePlate(c.id) === normalizePlate(cleanPlate))) {
      showToast(`Biển số xe "${cleanPlate}" đã tồn tại trong hệ thống! Vui lòng kiểm tra lại.`, 'error');
      return;
    }

    const carToAdd: Car = {
      id: newPlate,
      name: newName,
      brand: newBrand || 'Khác',
      year: newYear || '2022',
      seats: newSeats,
      color: newColor,
      status: 'ready',
      km: parseInt(newKm) || 0,
      ownerPhone: finalOwnerPhone,
      image: newImage || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
      expiryRegistration: '2027-01-01',
      expiryInsurance: '2026-12-01',
      expiryLicense: '2027-06-01',
      pricePerDay: parseInt(newPriceDay) || 800000,
      pricePerHour: parseInt(newPriceHour) || 100000,
      pricePerWeek: parseInt(newPriceWeek) || 5000000
    };

    addCar(carToAdd);
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
    setShowEditForm(true);
  };

  const handleUpdateCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId) return;

    updateCar(selectedCarId, {
      name: editName,
      brand: editBrand,
      year: editYear,
      seats: editSeats,
      color: editColor,
      km: parseInt(editKm) || 0,
      ownerPhone: editPhone,
      image: editImage,
      status: activeCar?.status === 'rented' ? 'rented' : editStatus,
      pricePerDay: parseInt(editPriceDay) || 800000,
      pricePerHour: parseInt(editPriceHour) || 100000,
      pricePerWeek: parseInt(editPriceWeek) || 5000000
    });

    setShowEditForm(false);
  };

  const handleDeleteCar = () => {
    if (!selectedCarId) return;
    if (activeCar?.status === 'rented') {
      showToast('Không thể xóa xe đang được thuê!', 'error');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa xe ${selectedCarId} khỏi đội xe?`)) {
      deleteCar(selectedCarId);
      setSelectedCarId(null);
      setShowEditForm(false);
    }
  };

  const handleOpenReturn = () => {
    if (!activeCar) return;
    setReturnKm((activeCar.km + 150).toString());
    setReturnFuel('8/8');
    setSurcharge('0');
    setPaymentStatus('paid');
    setShowReturnForm(true);
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRental || !selectedCarId || !activeCar) return;

    const kmNum = parseInt(returnKm);
    if (isNaN(kmNum) || kmNum < activeCar.km) {
      showToast(`Số km trả xe phải lớn hơn hoặc bằng số km lúc nhận (${activeCar.km.toLocaleString()} km)!`, 'error');
      return;
    }

    completeRental(
      activeRental.id,
      kmNum,
      parseInt(surcharge) || 0,
      returnFuel,
      paymentStatus
    );

    setShowReturnForm(false);
    showToast('Đã hoàn tất quy trình trả xe và cập nhật trạng thái xe thành công!', 'success');
  };

  // Car specific timeline dates setup
  const weekDays = [
    { name: 'Thứ 2', dateStr: '13', fullDate: '2026-07-13' },
    { name: 'Thứ 3', dateStr: '14', fullDate: '2026-07-14' },
    { name: 'Thứ 4', dateStr: '15', fullDate: '2026-07-15' },
    { name: 'Thứ 5', dateStr: '16', fullDate: '2026-07-16' },
    { name: 'Thứ 6', dateStr: '17', fullDate: '2026-07-17' },
    { name: 'Thứ 7', dateStr: '18', fullDate: '2026-07-18' },
    { name: 'Chủ Nhật', dateStr: '19', fullDate: '2026-07-19' }
  ];

  const getCarStatusForDay = (dayDateStr: string) => {
    if (!selectedCarId) return 'ready';
    const targetDate = new Date(dayDateStr);
    const activeRentalOnDay = rentals.find(r => {
      if (r.carId !== selectedCarId) return false;
      const start = new Date(r.startDate.split('T')[0]);
      const end = new Date(r.endDate.split('T')[0]);
      return targetDate >= start && targetDate <= end;
    });

    if (activeRentalOnDay) return 'rented';
    if (activeCar?.status === 'maintenance' && dayDateStr === '2026-07-15') return 'maintenance';
    if (activeCar?.status === 'suspended' && dayDateStr === '2026-07-15') return 'suspended';
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
        /* Trang Chi tiết xe chuẩn Ant Design Enterprise UI */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          
          {/* 1. AntD Page Header & Breadcrumb Bar */}
          <div style={{ background: 'white', padding: '16px 24px', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8c8c8c' }}>
              <span style={{ cursor: 'pointer', color: '#595959' }} onClick={() => setSelectedCarId(null)}>Quản lý xe</span>
              <span>/</span>
              <span style={{ color: '#262626', fontWeight: 500 }}>Chi tiết phương tiện</span>
              <span>/</span>
              <span className="license-plate" style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px' }}>{activeCar.id}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setSelectedCarId(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', fontWeight: 600, color: '#595959', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
                >
                  <ArrowLeft size={16} /> Quay lại danh sách
                </button>
                <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 700, color: '#262626' }}>{activeCar.name}</h1>
                
                {/* AntD Status Badge Tag */}
                {activeCar.status === 'rented' ? (
                  <span style={{ color: '#0958d9', background: '#e6f4ff', border: '1px solid #91caef', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1677ff' }} /> Đang cho thuê
                  </span>
                ) : activeCar.status === 'ready' ? (
                  <span style={{ color: '#389e0d', background: '#f6ffed', border: '1px solid #b7eb8f', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#52c41a' }} /> Sẵn sàng đón khách
                  </span>
                ) : activeCar.status === 'maintenance' ? (
                  <span style={{ color: '#d46b08', background: '#fffbe6', border: '1px solid #ffe58f', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fa8c16' }} /> Bảo trì xe
                  </span>
                ) : (
                  <span style={{ color: '#cf1322', background: '#fff1f0', border: '1px solid #ffa39e', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff4d4f' }} /> Tạm ngưng
                  </span>
                )}
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={handleOpenEdit} style={{ padding: '6px 14px', background: 'white', color: '#262626', border: '1px solid #d9d9d9', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 0 rgba(0,0,0,0.02)' }}>
                  <Edit size={14} /> Chỉnh sửa xe
                </button>
                <button onClick={() => {
                  if (activeCar.status === 'rented') {
                    showToast('Không thể xóa xe đang cho thuê!', 'error');
                    return;
                  }
                  if (confirm(`Bạn có chắc chắn muốn xóa xe ${activeCar.name} (${activeCar.id})?`)) {
                    deleteCar(activeCar.id);
                    setSelectedCarId(null);
                  }
                }} style={{ padding: '6px 14px', background: 'white', color: '#ff4d4f', border: '1px solid #ff4d4f', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Trash2 size={14} /> Xóa xe
                </button>
                {activeCar.status === 'ready' && (
                  <Link to={`/rental/new?car=${activeCar.id}`} style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '6px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 0 rgba(0,0,0,0.04)' }}>
                      <Plus size={14} /> Tạo đơn thuê mới
                    </button>
                  </Link>
                )}
                {activeCar.status === 'rented' && (
                  <button onClick={handleOpenReturn} style={{ padding: '6px 16px', background: '#52c41a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={14} /> Nhận trả xe
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Top Statistic Cards Row (AntD Stat style) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <div style={{ fontSize: '13px', color: '#8c8c8c', marginBottom: '4px' }}>Số KM hiện tại</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#262626', fontFamily: 'monospace' }}>{activeCar.km.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 400, color: '#8c8c8c' }}>km</span></div>
            </div>

            <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <div style={{ fontSize: '13px', color: '#8c8c8c', marginBottom: '4px' }}>Giá thuê ngày</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#1677ff', fontFamily: 'monospace' }}>{(activeCar.pricePerDay || 800000).toLocaleString('vi-VN')} <span style={{ fontSize: '13px', fontWeight: 400, color: '#8c8c8c' }}>₫/ngày</span></div>
            </div>

            <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <div style={{ fontSize: '13px', color: '#8c8c8c', marginBottom: '4px' }}>Chủ xe quản lý</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#262626', marginTop: '4px' }}>{getOwnerNameByPhone(activeCar.ownerPhone)}</div>
            </div>

            <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <div style={{ fontSize: '13px', color: '#8c8c8c', marginBottom: '4px' }}>Tổng lượt thuê xe</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#52c41a', fontFamily: 'monospace' }}>{carRentals.length} <span style={{ fontSize: '13px', fontWeight: 400, color: '#8c8c8c' }}>lượt</span></div>
            </div>
          </div>

          {/* 3. Main Workspace Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Cột trái: Ảnh & Hợp đồng hiện tại */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <div style={{ position: 'relative', width: '100%', height: '280px', background: '#fafafa' }}>
                  <img src={activeCar.image} alt={activeCar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                    <span className="license-plate" style={{ fontSize: '18px', padding: '4px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{activeCar.id}</span>
                  </div>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeCar.status === 'rented' && (
                    <div style={{ background: '#e6f4ff', padding: '16px', borderRadius: '8px', border: '1px solid #91caef', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#0958d9', fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🔑 Hợp đồng đang chạy
                        </span>
                        {activeRental && (
                          <Link to={`/contracts?id=${activeRental.id}`} style={{ fontSize: '12px', color: '#1677ff', fontWeight: 700, textDecoration: 'none' }}>
                            Đơn #{activeRental.id} →
                          </Link>
                        )}
                      </div>

                      <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #bae0ff' }}>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Khách hàng thuê:</div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#262626', marginTop: '2px' }}>{activeCar.customer || activeRental?.customerName}</div>
                        {activeRental?.customerPhone && (
                          <div style={{ fontSize: '12px', color: '#595959', fontFamily: 'monospace' }}>{activeRental.customerPhone}</div>
                        )}
                      </div>

                      {activeRental && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #bae0ff' }}>
                          <span style={{ color: '#0958d9', fontWeight: 600, fontSize: '13px' }}>⏳ Thời gian còn lại:</span>
                          <SpeedometerCountdown endDateStr={activeRental.endDate} />
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeCar.status === 'ready' && (
                      <Link to={`/rental/new?car=${activeCar.id}`} style={{ flex: 1, textDecoration: 'none', display: 'flex' }}>
                        <button style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                          Tạo đơn cho thuê ngay
                        </button>
                      </Link>
                    )}
                    {activeCar.status === 'rented' && (
                      <button onClick={handleOpenReturn} style={{ width: '100%', padding: '10px', background: '#52c41a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                        Nhận trả xe & Thanh lý đơn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Specs AntD Descriptions, Pricing & Legal Docs, Schedule & History Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. AntD Descriptions - Thông số kỹ thuật */}
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '15px', margin: 0, fontWeight: 700, color: '#262626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="var(--primary)" /> Thông số kỹ thuật xe (AntD Descriptions)
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ width: '120px', background: '#fafafa', padding: '12px 16px', fontSize: '13px', color: '#595959', fontWeight: 600, borderRight: '1px solid #f0f0f0' }}>Hãng sản xuất</div>
                    <div style={{ padding: '12px 16px', fontSize: '13.5px', color: '#262626', fontWeight: 700 }}>{activeCar.brand}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ width: '120px', background: '#fafafa', padding: '12px 16px', fontSize: '13px', color: '#595959', fontWeight: 600, borderRight: '1px solid #f0f0f0' }}>Tên mẫu xe</div>
                    <div style={{ padding: '12px 16px', fontSize: '13.5px', color: '#262626', fontWeight: 700 }}>{activeCar.name}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ width: '120px', background: '#fafafa', padding: '12px 16px', fontSize: '13px', color: '#595959', fontWeight: 600, borderRight: '1px solid #f0f0f0' }}>Năm sản xuất</div>
                    <div style={{ padding: '12px 16px', fontSize: '13.5px', color: '#262626', fontWeight: 700 }}>{activeCar.year}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ width: '120px', background: '#fafafa', padding: '12px 16px', fontSize: '13px', color: '#595959', fontWeight: 600, borderRight: '1px solid #f0f0f0' }}>Màu sắc xe</div>
                    <div style={{ padding: '12px 16px', fontSize: '13.5px', color: '#262626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeCar.color === 'Đen' ? '#000' : activeCar.color === 'Trắng' ? '#fff' : activeCar.color === 'Đỏ' ? '#dc2626' : '#94a3b8', border: '1px solid #d9d9d9' }} />
                      {activeCar.color}
                    </div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ width: '120px', background: '#fafafa', padding: '12px 16px', fontSize: '13px', color: '#595959', fontWeight: 600, borderRight: '1px solid #f0f0f0' }}>Số chỗ ngồi</div>
                    <div style={{ padding: '12px 16px', fontSize: '13.5px', color: '#262626', fontWeight: 700 }}>{activeCar.seats} chỗ</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ width: '120px', background: '#fafafa', padding: '12px 16px', fontSize: '13px', color: '#595959', fontWeight: 600, borderRight: '1px solid #f0f0f0' }}>Số KM hiện tại</div>
                    <div style={{ padding: '12px 16px', fontSize: '13.5px', color: '#1677ff', fontWeight: 700, fontFamily: 'monospace' }}>{activeCar.km.toLocaleString()} km</div>
                  </div>
                </div>
              </div>

              {/* 2. Biểu giá & Hạn giấy tờ thành 2 Cột */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Bảng giá thuê xe */}
                <div style={{ background: 'white', padding: '18px 20px', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                  <h3 style={{ fontSize: '14.5px', margin: '0 0 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#262626' }}>
                    <Receipt size={17} color="#1677ff" /> Bảng giá cho thuê
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '10px 14px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: '13px', color: '#595959', fontWeight: 500 }}>Thuê theo Giờ</span>
                      <strong className="font-mono" style={{ fontSize: '14.5px', color: '#262626', fontWeight: 700 }}>{(activeCar.pricePerHour || 100000).toLocaleString('vi-VN')} ₫</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6ffed', padding: '10px 14px', borderRadius: '6px', border: '1px solid #b7eb8f' }}>
                      <span style={{ fontSize: '13px', color: '#389e0d', fontWeight: 600 }}>Thuê theo Ngày</span>
                      <strong className="font-mono" style={{ fontSize: '15.5px', color: '#389e0d', fontWeight: 800 }}>{(activeCar.pricePerDay || 800000).toLocaleString('vi-VN')} ₫</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e6f4ff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #91caef' }}>
                      <span style={{ fontSize: '13px', color: '#0958d9', fontWeight: 600 }}>Thuê theo Tuần</span>
                      <strong className="font-mono" style={{ fontSize: '14.5px', color: '#0958d9', fontWeight: 700 }}>{(activeCar.pricePerWeek || 5000000).toLocaleString('vi-VN')} ₫</strong>
                    </div>
                  </div>
                </div>

                {/* Hạn giấy tờ xe */}
                <div style={{ background: 'white', padding: '18px 20px', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                  <h3 style={{ fontSize: '14.5px', margin: '0 0 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#262626' }}>
                    <ShieldCheck size={17} color="#52c41a" /> Thời hạn giấy tờ pháp lý
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(() => {
                      const info = getDocExpiryInfo(activeCar.expiryRegistration);
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#262626' }}>Hạn đăng kiểm</span>
                            <div style={{ fontSize: '11px', color: '#8c8c8c' }} className="font-mono">{new Date(activeCar.expiryRegistration).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: info.bg, color: info.color }}>
                            {info.text}
                          </span>
                        </div>
                      );
                    })()}

                    {(() => {
                      const info = getDocExpiryInfo(activeCar.expiryInsurance);
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#262626' }}>Bảo hiểm TNDS</span>
                            <div style={{ fontSize: '11px', color: '#8c8c8c' }} className="font-mono">{new Date(activeCar.expiryInsurance).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: info.bg, color: info.color }}>
                            {info.text}
                          </span>
                        </div>
                      );
                    })()}

                    {(() => {
                      const info = getDocExpiryInfo(activeCar.expiryLicense);
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#262626' }}>Phù hiệu xe</span>
                            <div style={{ fontSize: '11px', color: '#8c8c8c' }} className="font-mono">{new Date(activeCar.expiryLicense).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: info.bg, color: info.color }}>
                            {info.text}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 3. Lịch đặt xe tuần này */}
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', padding: '18px 20px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <h3 style={{ fontSize: '15px', margin: '0 0 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#262626' }}>
                  <CalendarIcon size={17} color="#1677ff" /> Lịch đặt xe tuần này
                </h3>

                {/* Desktop View: 7 columns strip */}
                <div className="desktop-only-table" style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
                    {weekDays.map(day => {
                      const status = getCarStatusForDay(day.fullDate);
                      return (
                        <div key={day.fullDate} style={{ padding: '10px 4px', borderRadius: '6px', border: '1px solid #f0f0f0', background: status === 'rented' ? '#e6f4ff' : status === 'maintenance' ? '#fffbe6' : status === 'suspended' ? '#fff1f0' : '#fafafa' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#262626' }}>{day.name}</div>
                          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{day.dateStr}</div>
                          <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: 700, color: status === 'rented' ? '#0958d9' : status === 'maintenance' ? '#d46b08' : status === 'suspended' ? '#cf1322' : '#389e0d' }}>
                            {status === 'rented' ? 'Đang bận' : status === 'maintenance' ? 'Bảo trì' : status === 'suspended' ? 'Ngưng' : 'Trống'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile View: Vertical Day List */}
                <div className="mobile-only-cards" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {weekDays.map(day => {
                    const status = getCarStatusForDay(day.fullDate);
                    return (
                      <div 
                        key={day.fullDate} 
                        style={{ 
                          padding: '10px 14px', 
                          borderRadius: '6px', 
                          border: '1px solid #f0f0f0', 
                          background: status === 'rented' ? '#e6f4ff' : status === 'maintenance' ? '#fffbe6' : status === 'suspended' ? '#fff1f0' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <strong style={{ fontSize: '13px', color: '#262626' }}>{day.name}</strong>
                          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Ngày {day.dateStr}</span>
                        </div>

                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: status === 'rented' ? '#e6f4ff' : status === 'maintenance' ? '#fffbe6' : status === 'suspended' ? '#fff1f0' : '#f6ffed',
                          color: status === 'rented' ? '#0958d9' : status === 'maintenance' ? '#d46b08' : status === 'suspended' ? '#cf1322' : '#389e0d'
                        }}>
                          {status === 'rented' ? '🔵 Đang bận' : status === 'maintenance' ? '🟠 Bảo trì' : status === 'suspended' ? '🔴 Ngưng' : '🟢 Xe trống'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Tabbed Table Component (AntD Segmented Tabs & Tables) */}
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setActiveDetailTab('rentals')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeDetailTab === 'rentals' ? 'white' : 'transparent',
                        color: activeDetailTab === 'rentals' ? 'var(--primary)' : '#595959',
                        fontWeight: activeDetailTab === 'rentals' ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: activeDetailTab === 'rentals' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      📜 Lịch sử người đặt xe ({carRentals.length})
                    </button>
                    <button
                      onClick={() => setActiveDetailTab('expenses')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeDetailTab === 'expenses' ? 'white' : 'transparent',
                        color: activeDetailTab === 'expenses' ? 'var(--primary)' : '#595959',
                        fontWeight: activeDetailTab === 'expenses' ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: activeDetailTab === 'expenses' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      💰 Lịch sử chi phí ({expenses.filter(e => e.ref === activeCar.id).length})
                    </button>
                  </div>

                  {activeDetailTab === 'expenses' && (
                    <button 
                      onClick={() => {
                        setExpenseDate(new Date().toISOString().split('T')[0]);
                        setShowAddExpenseModal(true);
                      }}
                      style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      <Plus size={14} /> Thêm chi phí
                    </button>
                  )}
                </div>

                {activeDetailTab === 'rentals' ? (
                  <div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#fafafa', color: '#595959', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}>
                            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Khách hàng</th>
                            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Thời gian thuê</th>
                            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Tổng tiền</th>
                            <th style={{ padding: '12px 20px', fontWeight: 600 }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carRentals.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#8c8c8c', fontSize: '13px' }}>
                                Chưa có lịch sử thuê cho xe này.
                              </td>
                            </tr>
                          ) : (
                            pagedRentals.map(r => (
                              <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                                <td style={{ padding: '12px 20px' }}>
                                  <strong style={{ color: '#262626' }}>{r.customerName}</strong>
                                  <div style={{ fontSize: '11px', color: '#8c8c8c' }} className="font-mono">{r.customerPhone}</div>
                                </td>
                                <td style={{ padding: '12px 20px', color: '#595959' }}>
                                  {new Date(r.startDate).toLocaleDateString('vi-VN')} → {new Date(r.endDate).toLocaleDateString('vi-VN')}
                                </td>
                                <td style={{ padding: '12px 20px', fontWeight: 700, color: '#1677ff', fontFamily: 'monospace' }}>
                                  {r.totalAmount.toLocaleString()} ₫
                                </td>
                                <td style={{ padding: '12px 20px' }}>
                                  {r.status === 'active' ? (
                                    <span style={{ color: '#0958d9', background: '#e6f4ff', border: '1px solid #91caef', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Đang thuê</span>
                                  ) : (
                                    <span style={{ color: '#389e0d', background: '#f6ffed', border: '1px solid #b7eb8f', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Hoàn tất</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {rentalTotalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          Hiển thị <strong>{(rentalPage - 1) * RENTALS_PER_PAGE + 1}</strong>–<strong>{Math.min(rentalPage * RENTALS_PER_PAGE, carRentals.length)}</strong> / <strong>{carRentals.length}</strong> lượt thuê
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            disabled={rentalPage === 1}
                            onClick={() => setRentalPage(p => p - 1)}
                            style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #d9d9d9', background: rentalPage === 1 ? '#f5f5f5' : 'white', color: rentalPage === 1 ? '#bfbfbf' : '#262626', cursor: rentalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                          >
                            ‹
                          </button>
                          {Array.from({ length: rentalTotalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setRentalPage(page)}
                              style={{ padding: '4px 10px', borderRadius: '4px', border: rentalPage === page ? '1px solid var(--primary)' : '1px solid #d9d9d9', background: rentalPage === page ? 'var(--primary)' : 'white', color: rentalPage === page ? 'white' : '#262626', cursor: 'pointer', fontSize: '12px', fontWeight: rentalPage === page ? 700 : 400 }}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={rentalPage === rentalTotalPages}
                            onClick={() => setRentalPage(p => p + 1)}
                            style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #d9d9d9', background: rentalPage === rentalTotalPages ? '#f5f5f5' : 'white', color: rentalPage === rentalTotalPages ? '#bfbfbf' : '#262626', cursor: rentalPage === rentalTotalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#fafafa', color: '#595959', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Ngày chi</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Nội dung</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Danh mục</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Địa điểm</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.filter(e => e.ref === activeCar.id).length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#8c8c8c', fontSize: '13px' }}>
                              Chưa ghi nhận chi phí nào cho xe này.
                            </td>
                          </tr>
                        ) : (
                          expenses.filter(e => e.ref === activeCar.id).map(e => (
                            <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                              <td style={{ padding: '12px 20px', color: '#595959' }}>{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                              <td style={{ padding: '12px 20px', fontWeight: 600, color: '#262626' }}>{e.title}</td>
                              <td style={{ padding: '12px 20px' }}>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: 600,
                                  background: e.category === 'Bảo dưỡng' ? '#f6ffed' : e.category === 'Sửa chữa' ? '#fff1f0' : '#fafafa',
                                  color: e.category === 'Bảo dưỡng' ? '#389e0d' : e.category === 'Sửa chữa' ? '#cf1322' : '#595959',
                                  border: `1px solid ${e.category === 'Bảo dưỡng' ? '#b7eb8f' : e.category === 'Sửa chữa' ? '#ffa39e' : '#d9d9d9'}`
                                }}>
                                  {e.category}
                                </span>
                              </td>
                              <td style={{ padding: '12px 20px', color: '#8c8c8c' }}>{e.location || 'Chưa cập nhật'}</td>
                              <td style={{ padding: '12px 20px', fontWeight: 700, color: '#cf1322', textAlign: 'right', fontFamily: 'monospace' }}>
                                {e.amount.toLocaleString()} ₫
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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
              /* DẠNG XEM BẢNG ANTD TABLE */
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <Table<Car>
                  dataSource={filteredCars}
                  rowKey="id"
                  onRow={(record) => ({
                    onClick: () => setSelectedCarId(record.id),
                    style: { cursor: 'pointer' }
                  })}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} xe`
                  }}
                  columns={[
                    {
                      title: 'Phương tiện',
                      dataIndex: 'name',
                      key: 'name',
                      render: (_, record) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={record.image} alt={record.name} style={{ width: '60px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #f0f0f0' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#262626', fontSize: '14px' }}>{record.name}</div>
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.brand} • {record.seats} chỗ • {record.color}</div>
                          </div>
                        </div>
                      )
                    },
                    {
                      title: 'Biển số xe',
                      dataIndex: 'id',
                      key: 'id',
                      sorter: (a, b) => a.id.localeCompare(b.id),
                      render: (id) => <span className="license-plate" style={{ fontSize: '12px', padding: '2px 8px' }}>{id}</span>
                    },
                    {
                      title: 'Chủ sở hữu',
                      dataIndex: 'ownerPhone',
                      key: 'ownerPhone',
                      render: (phone) => <span style={{ color: '#595959', fontSize: '13px' }}>{getOwnerNameByPhone(phone)}</span>
                    },
                    {
                      title: 'Số KM',
                      dataIndex: 'km',
                      key: 'km',
                      sorter: (a, b) => a.km - b.km,
                      render: (km) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#262626' }}>{(km || 0).toLocaleString()} km</span>
                    },
                    {
                      title: 'Giá ngày',
                      dataIndex: 'pricePerDay',
                      key: 'pricePerDay',
                      sorter: (a, b) => (a.pricePerDay || 0) - (b.pricePerDay || 0),
                      render: (price) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{(price || 800000).toLocaleString('vi-VN')} ₫</span>
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      filters: [
                        { text: 'Sẵn sàng', value: 'ready' },
                        { text: 'Đang thuê', value: 'rented' },
                        { text: 'Bảo trì', value: 'maintenance' },
                        { text: 'Tạm ngưng', value: 'suspended' },
                      ],
                      onFilter: (value, record) => record.status === value,
                      render: (_, record) => {
                        if (record.status === 'rented') {
                          return <Tag color="processing" style={{ borderRadius: 12, fontWeight: 600 }}>🔵 Đang thuê</Tag>;
                        } else if (record.status === 'ready') {
                          return <Tag color="success" style={{ borderRadius: 12, fontWeight: 600 }}>🟢 Sẵn sàng</Tag>;
                        } else if (record.status === 'maintenance') {
                          return <Tag color="warning" style={{ borderRadius: 12, fontWeight: 600 }}>🟠 Bảo trì</Tag>;
                        }
                        return <Tag color="default" style={{ borderRadius: 12, fontWeight: 600 }}>⚪ Tạm ngưng</Tag>;
                      }
                    },
                    {
                      title: 'Thao tác',
                      key: 'actions',
                      render: (_, record) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCarId(record.id);
                          }}
                          style={{ padding: '4px 10px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, color: '#595959' }}
                        >
                          Chi tiết →
                        </button>
                      )
                    }
                  ]}
                />
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>Số chỗ ngồi *</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[4, 5, 7, 9, 16].map(num => (
                  <button 
                    key={num}
                    type="button"
                    onClick={() => setNewSeats(num)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: newSeats === num ? '2px solid var(--primary)' : '1px solid var(--border-strong)',
                      background: newSeats === num ? '#e0f2fe' : 'white',
                      fontWeight: newSeats === num ? 700 : 500,
                      color: newSeats === num ? 'var(--primary)' : 'var(--text-main)',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {num} chỗ
                  </button>
                ))}
              </div>
              <input 
                type="number" 
                value={newSeats || ''} 
                onChange={e => setNewSeats(e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} 
                placeholder="Nhập số chỗ ngồi..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} 
                required 
              />
            </div>

            {/* Custom pricing in add car */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Giờ (₫) *</label>
                <input type="number" value={newPriceHour} onChange={e => setNewPriceHour(e.target.value)} placeholder="100000" style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Ngày (₫) *</label>
                <input type="number" value={newPriceDay} onChange={e => setNewPriceDay(e.target.value)} placeholder="800000" style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Giá thuê Tuần (₫) *</label>
                <input type="number" value={newPriceWeek} onChange={e => setNewPriceWeek(e.target.value)} placeholder="5000000" style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
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

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh xe</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={editImage} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
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
