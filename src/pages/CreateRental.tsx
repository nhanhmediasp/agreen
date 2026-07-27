import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Steps } from 'antd';
import { Image as ImageIcon, Receipt, CheckCircle, Search, User, Plus, X, Upload, Trash } from 'lucide-react';
import { useApp, type Rental, type Car } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';
import { MoneyInput, MoneyInputLeft } from '../components/MoneyInput';

const CreateRental = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cars, addCar, addRental, customers, addCustomer, owners, showToast, rentals } = useApp();
  
  const queryParams = new URLSearchParams(location.search);
  const preselectedCarId = queryParams.get('car') || '';

  const [showGallery, setShowGallery] = useState(false);
  const [galleryMode, setGalleryMode] = useState<'car' | 'contract' | 'quickCar'>('car');
  const [carImages, setCarImages] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  // Form State - Car Selection
  const [selectedCarId, setSelectedCarId] = useState(preselectedCarId);
  const [carSearchInput, setCarSearchInput] = useState('');
  const [showQuickAddCarModal, setShowQuickAddCarModal] = useState(false);

  // Quick Add Car Form State
  const [quickPlate, setQuickPlate] = useState('');
  const [quickBrand, setQuickBrand] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickYear, setQuickYear] = useState('2022');
  const [quickSeats, setQuickSeats] = useState(5);
  const [quickColor, setQuickColor] = useState('');
  const [quickKm, setQuickKm] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickImage, setQuickImage] = useState('');
  const [quickPriceHour, setQuickPriceHour] = useState('100000');
  const [quickPriceDay, setQuickPriceDay] = useState('800000');
  const [quickPriceWeek, setQuickPriceWeek] = useState('5000000');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [pickupTime, setPickupTime] = useState('08:00');
  const [returnTime, setReturnTime] = useState('20:00');
  const [timeConflictError, setTimeConflictError] = useState('');
  const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  const getMonthDays = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); 
    const offset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    
    const dStart = new Date(firstDay);
    dStart.setDate(firstDay.getDate() + offset);
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(dStart);
      d.setDate(dStart.getDate() + i);
      const fullDate = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const isCurrentMonth = d.getMonth() === month;
      days.push({
        date: d,
        dateStr: String(d.getDate()).padStart(2, '0'),
        fullDate,
        isCurrentMonth
      });
    }
    return days;
  };

  const getCarStatusForDay = (dayDateStr: string, carId: string) => {
    if (!carId) return { status: 'ready', customer: null, rentals: [] };
    const targetDateStart = new Date(`${dayDateStr}T00:00:00`).getTime();
    const targetDateEnd = new Date(`${dayDateStr}T23:59:59`).getTime();
    
    const activeRentalsOnDay = rentals?.filter(r => {
      if (r.carId !== carId) return false;
      if (!['pending', 'active'].includes(r.status)) return false;
      const start = new Date(r.startDate).getTime();
      const end = new Date(r.endDate).getTime();
      return start <= targetDateEnd && end >= targetDateStart;
    });

    if (activeRentalsOnDay && activeRentalsOnDay.length > 0) {
      let isFullyBooked = false;
      for (const r of activeRentalsOnDay) {
        if (new Date(r.startDate).getTime() <= targetDateStart && new Date(r.endDate).getTime() >= targetDateEnd) {
          isFullyBooked = true;
          break;
        }
      }
      return { 
        status: isFullyBooked ? 'rented' : 'partial', 
        customer: activeRentalsOnDay[0].customerName,
        rentals: activeRentalsOnDay
      };
    }
    return { status: 'ready', customer: null, rentals: [] };
  };

  const handleDayClick = (dayStr: string) => {
    const status = getCarStatusForDay(dayStr, selectedCarId);
    if (status.status === 'rented') {
      showToast('Ngày này xe đã kín lịch hoàn toàn, vui lòng chọn ngày khác!', 'error');
      return;
    }

    if (selectedDates.length === 0 || selectedDates.length === 2) {
      setSelectedDates([dayStr]);
    } else if (selectedDates.length === 1) {
      const startStr = selectedDates[0];
      const endStr = dayStr;
      if (new Date(endStr) < new Date(startStr)) {
        setSelectedDates([dayStr, selectedDates[0]]);
      } else {
        setSelectedDates([selectedDates[0], dayStr]);
      }
    }
  };
  const [pricingType, setPricingType] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [customDuration, setCustomDuration] = useState('2'); // Default 2 units
  const [isWeekend, setIsWeekend] = useState(false);
  const [weekendSurchargePercent, setWeekendSurchargePercent] = useState('20'); // Editable weekend surcharge
  const [startKm, setStartKm] = useState('0');
  const [endKm, setEndKm] = useState('0');
  const [startFuel, setStartFuel] = useState('8/8');
  const [initialRentalStatus, setInitialRentalStatus] = useState<'pending' | 'active' | 'completed'>('pending');

  // Form State - Customer Mode & Searching
  const [customerMode, setCustomerMode] = useState<'select' | 'create'>('select');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState('');

  // Form State - Customer Details
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCccd, setCustomerCccd] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLicense, setCustomerLicense] = useState('');

  // Form State - Financials & Contract
  const [deposit, setDeposit] = useState('10000000');
  const [deliveryFee, setDeliveryFee] = useState('150000');
  const [customRentalFeeInput, setCustomRentalFeeInput] = useState('');
  const [customCommissionInput, setCustomCommissionInput] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<Rental['paymentStatus']>('deposit');
  
  // Contract Source Selection & Receipt View State
  const [contractSource, setContractSource] = useState<'system' | 'uploaded'>('system');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [createdReceiptRental, setCreatedReceiptRental] = useState<Rental | null>(null);

  const selectedCarObj = cars.find(c => c.id === selectedCarId);

  // Set initial KM when car is selected
  useEffect(() => {
    if (selectedCarObj) {
      setStartKm(selectedCarObj.km.toString());
      setEndKm(selectedCarObj.km.toString());
    }
  }, [selectedCarId, selectedCarObj]);

  useEffect(() => {
    if (selectedDates.length > 0) {
      const start = selectedDates[0];
      const end = selectedDates.length > 1 ? selectedDates[1] : start;
      setStartDate(`${start}T${pickupTime}`);
      setEndDate(`${end}T${returnTime}`);
      
      const diffMs = new Date(end).getTime() - new Date(start).getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      setCustomDuration(diffDays.toString());
    } else {
      setStartDate('');
      setEndDate('');
      setCustomDuration('0');
    }
  }, [selectedDates, pickupTime, returnTime]);

  useEffect(() => {
    if (startDate && endDate && selectedCarId) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      if (e <= s) {
        setTimeConflictError('Thời gian trả xe phải sau thời gian nhận xe.');
        return;
      }
      
      const hasConflict = rentals?.some(r => {
        if (r.carId !== selectedCarId) return false;
        if (!['pending', 'active'].includes(r.status)) return false;
        const rS = new Date(r.startDate).getTime();
        const rE = new Date(r.endDate).getTime();
        return s < rE && e > rS;
      });

      if (hasConflict) {
        setTimeConflictError('Khoảng thời gian bị trùng lịch thuê khác!');
      } else {
        setTimeConflictError('');
      }
    } else {
      setTimeConflictError('');
    }
  }, [startDate, endDate, selectedCarId, rentals]);

  // Handle selected customer change
  const handleSelectCustomer = (phoneVal: string) => {
    setSelectedCustomerPhone(phoneVal);
    const matched = customers.find(c => c.phone === phoneVal);
    if (matched) {
      setCustomerPhone(matched.phone);
      setCustomerName(matched.name);
      setCustomerCccd(matched.cccd);
      setCustomerAddress(matched.address);
      setCustomerLicense(matched.license.replace('GPLX: ', ''));
    } else {
      setCustomerPhone('');
      setCustomerName('');
      setCustomerCccd('');
      setCustomerAddress('');
      setCustomerLicense('');
    }
  };

  const getRate = () => {
    if (!selectedCarObj) return 800000; // default
    if (pricingType === 'hourly') return selectedCarObj.pricePerHour;
    if (pricingType === 'weekly') return selectedCarObj.pricePerWeek;
    return selectedCarObj.pricePerDay; // daily
  };

  const baseRate = getRate();
  const durNum = parseFloat(customDuration) || 0;
  const surchargeFactor = isWeekend ? (1 + (parseFloat(weekendSurchargePercent) || 0) / 100) : 1.0;
  const computedRentalFee = Math.round(durNum * baseRate * surchargeFactor);

  // Allow user custom rental fee override
  const rentalFee = customRentalFeeInput !== '' ? (parseInt(customRentalFeeInput) || 0) : computedRentalFee;
  const delFeeNum = parseInt(deliveryFee) || 0;
  const totalAmount = rentalFee + delFeeNum;

  // Car owner commission calculations
  const carOwnerObj = selectedCarObj ? owners.find(o => o.phone === selectedCarObj.ownerPhone) : null;
  const ownerCommissionRate = carOwnerObj?.commissionRate ?? 75;
  const computedOwnerCommission = Math.round((rentalFee * ownerCommissionRate) / 100);
  const ownerCommissionAmount = customCommissionInput !== '' ? (parseInt(customCommissionInput) || 0) : computedOwnerCommission;

  const getOwnerNameByPhone = (phone: string) => {
    const match = owners.find(o => o.phone === phone);
    return match ? match.name : phone;
  };

  const handleUploadCarImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newUrls: string[] = [];
    let processed = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          newUrls.push(evt.target.result as string);
        }
        processed++;
        if (processed === files.length) {
          setCarImages(prev => [...prev, ...newUrls]);
          showToast(`Đã tải lên thành công ${files.length} ảnh bàn giao xe!`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleDeleteCarImage = (index: number) => {
    setCarImages(prev => prev.filter((_, i) => i !== index));
    showToast('Đã xóa ảnh bàn giao xe!', 'info');
  };

  const handleFinishRental = async () => {
    const finalPhone = customerMode === 'select' ? selectedCustomerPhone : customerPhone;
    
    if (!selectedCarId || !customerName || !finalPhone || !startDate || !endDate) {
      showToast('Vui lòng hoàn thành các thông tin bắt buộc!', 'error');
      return;
    }

    if (contractSource === 'uploaded' && !uploadedFileUrl) {
      showToast('Vui lòng chọn hoặc tải lên tệp hợp đồng có sẵn!', 'error');
      return;
    }

    // If Mode is Create Customer, add it globally
    if (customerMode === 'create') {
      const existingCustomer = customers.find(c => c.phone === customerPhone);
      if (existingCustomer) {
        showToast('Số điện thoại khách hàng đã tồn tại! Vui lòng chọn khách hàng có sẵn.', 'error');
        return;
      }
      
      const success = await addCustomer({
        id: Date.now().toString(),
        name: customerName,
        phone: customerPhone,
        license: `GPLX: ${customerLicense || 'Chưa cập nhật'}`,
        cccd: customerCccd,
        address: customerAddress || 'Chưa cập nhật',
        classification: 'normal',
        notes: 'Khách hàng tạo mới từ Hợp đồng.',
        activeRentals: 1,
        totalRentals: 1,
        status: 'verified',
        statusText: 'Đã xác minh',
        image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
      });
      
      if (!success) {
        return;
      }
    }

    const rentalToAdd: Rental = {
      id: `RNT-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      carId: selectedCarId,
      customerName,
      customerPhone: finalPhone,
      startDate,
      endDate,
      rentalFee,
      deliveryFee: delFeeNum,
      deposit: parseInt(deposit) || 0,
      extraFee: 0,
      totalAmount,
      paymentStatus,
      status: initialRentalStatus || 'pending',
      startKm: parseInt(startKm) || 0,
      endKm: (endKm !== '' && endKm !== undefined && endKm !== null && !isNaN(parseInt(endKm))) ? parseInt(endKm) : undefined,
      startFuel,
      source: contractSource,
      fileUrl: contractSource === 'uploaded' ? uploadedFileUrl : undefined,
      fileName: contractSource === 'uploaded' ? (uploadedFileName || 'Hop_Dong_Luu_Tru.pdf') : undefined,
      ownerCommissionAmount,
      conditionImages: carImages,
      createdAt: new Date().toISOString(),
      deliveredAt: (initialRentalStatus === 'active' || initialRentalStatus === 'completed') ? new Date().toISOString() : undefined,
      returnedAt: initialRentalStatus === 'completed' ? new Date().toISOString() : undefined
    };

    const success = await addRental(rentalToAdd);
    if (success) {
      setCreatedReceiptRental(rentalToAdd);
    }
  };

  const handleQuickAddCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPlate || !quickName || !quickColor || !quickKm || !quickPhone) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc!', 'error');
      return;
    }

    const carToAdd: Car = {
      id: quickPlate,
      name: quickName,
      brand: quickBrand || 'Khác',
      year: quickYear || '2022',
      seats: quickSeats,
      color: quickColor,
      status: 'ready',
      km: parseInt(quickKm) || 0,
      ownerPhone: quickPhone,
      image: quickImage || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
      expiryRegistration: '2027-01-01',
      expiryInsurance: '2026-12-01',
      expiryLicense: '2027-06-01',
      pricePerDay: parseInt(quickPriceDay) || 800000,
      pricePerHour: parseInt(quickPriceHour) || 100000,
      pricePerWeek: parseInt(quickPriceWeek) || 5000000
    };

    const success = await addCar(carToAdd);
    if (success) {
      setSelectedCarId(carToAdd.id);
      setShowQuickAddCarModal(false);
      
      // Reset fields
      setQuickPlate('');
      setQuickBrand('');
      setQuickName('');
      setQuickYear('2022');
      setQuickSeats(5);
      setQuickColor('');
      setQuickKm('');
      setQuickPhone('');
      setQuickImage('');
      setQuickPriceDay('800000');
      setQuickPriceHour('100000');
      setQuickPriceWeek('5000000');
    }
  };

  const readyCars = cars.filter(c => c.status === 'ready');

  // Car search results
  const matchingCars = carSearchInput.trim()
    ? readyCars.filter(c => 
        c.id.toLowerCase().includes(carSearchInput.toLowerCase()) || 
        c.name.toLowerCase().includes(carSearchInput.toLowerCase())
      ).slice(0, 5)
    : [];

  // Customer search logic (display max 5 results)
  const matchingCustomers = customerSearchInput.trim() 
    ? customers.filter(c => 
        c.name.toLowerCase().includes(customerSearchInput.toLowerCase()) || 
        c.phone.includes(customerSearchInput)
      ).slice(0, 5)
    : [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Tạo đơn thuê mới
            </h1>
            <span style={{ 
              background: 'linear-gradient(135deg, #10B981, #059669)', 
              color: '#FFFFFF', 
              fontSize: '11px', 
              fontWeight: '700', 
              padding: '3px 9px', 
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
            }}>
              Tạo Đơn
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Quy trình thiết lập hợp đồng nhanh, chọn xe và bàn giao xe cho khách
          </p>
        </div>
      </div>

      <Steps
        current={step - 1}
        items={[
          { title: 'Chọn xe & Bảng giá' },
          { title: 'Khách hàng' },
          { title: 'Thanh toán & Hợp đồng' },
        ]}
        style={{ marginBottom: '32px' }}
      />

      {/* Unified 2-Column Layout Grid for ALL steps */}
      <div className="rental-layout">
        
        {/* Left Column: Form content based on current Step */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {step === 1 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
              {/* Chọn xe trống */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Chọn xe trống *</label>
                  <button 
                    type="button" 
                    onClick={() => setShowQuickAddCarModal(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    <Plus size={14} /> Thêm xe mới ngay
                  </button>
                </div>

                {!selectedCarId ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-strong)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                      <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
                      <input 
                        type="text" 
                        placeholder="Tìm theo biển số hoặc dòng xe trống..." 
                        value={carSearchInput}
                        onChange={e => setCarSearchInput(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: '15px' }}
                      />
                    </div>

                    {/* List matching cars max 5 */}
                    {carSearchInput.trim() && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        {matchingCars.length === 0 ? (
                          <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                            Không tìm thấy xe trống nào phù hợp.
                          </div>
                        ) : (
                          matchingCars.map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => {
                                setSelectedCarId(c.id);
                                setCarSearchInput('');
                              }}
                              style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <img src={c.image} style={{ width: '45px', height: '30px', borderRadius: '4px', objectFit: 'cover' }} />
                              <div>
                                <strong>{c.name}</strong> - <span className="license-plate" style={{ fontSize: '11px', padding: '1px 6px' }}>{c.id}</span>
                                <span style={{ fontSize: '12px', marginLeft: '12px', color: 'var(--accent)', fontWeight: 600 }}>{c.pricePerDay.toLocaleString()} ₫/ngày</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Selected Car Summary Card */
                  <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <img src={selectedCarObj?.image} style={{ width: '70px', height: '46px', borderRadius: '4px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '14px' }}>
                        <div>Xe đã chọn: <strong>{selectedCarObj?.name}</strong></div>
                        <span className="license-plate" style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px', display: 'inline-block' }}>{selectedCarObj?.id}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCarId('')}
                      style={{ padding: '8px 14px', background: 'white', border: '1px solid #16a34a', color: '#16a34a', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Chọn xe khác
                    </button>
                  </div>
                )}
                {selectedCarId && (
                  <div style={{ marginTop: '16px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderBottom: '1px solid var(--border-strong)' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>Lịch đặt xe tháng {calendarDate.getMonth() + 1}/{calendarDate.getFullYear()}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() - 1); setCalendarDate(d); }} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-strong)', background: 'white' }}>Tháng trước</button>
                        <button type="button" onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() + 1); setCalendarDate(d); }} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-strong)', background: 'white' }}>Tháng sau</button>
                      </div>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(w => (
                          <div key={w} style={{ fontWeight: 700, color: '#475569', fontSize: '11px' }}>{w}</div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                        {getMonthDays(calendarDate).map((day, idx) => {
                          const st = getCarStatusForDay(day.fullDate, selectedCarId);
                          const isToday = day.fullDate === todayVN;
                          const isSelected = selectedDates.includes(day.fullDate) || 
                                              (selectedDates.length === 2 && day.fullDate > selectedDates[0] && day.fullDate < selectedDates[1]);
                          const isStart = selectedDates[0] === day.fullDate;
                          const isEnd = selectedDates[1] === day.fullDate;

                          let bg = '#FFFFFF';
                          let border = '#E2E8F0';
                          let color = '#374151';

                          if (st.status === 'rented') {
                            bg = '#FEE2E2';
                            border = '#FCA5A5';
                            color = '#B91C1C';
                          } else if (st.status === 'partial') {
                            bg = '#FEF3C7';
                            border = '#FDE68A';
                            color = '#92400E';
                          } else if (isSelected) {
                            bg = '#DBEAFE';
                            border = '#60A5FA';
                            color = '#1D4ED8';
                            if (isStart || isEnd) {
                              bg = '#3B82F6';
                              color = '#FFFFFF';
                            }
                          } else if (isToday) {
                            bg = '#F0FDF4';
                            border = '#16A34A';
                            color = '#16A34A';
                          }

                          return (
                            <div 
                              key={idx} 
                              onClick={() => handleDayClick(day.fullDate)}
                              style={{ 
                                padding: '6px 2px', borderRadius: '6px', border: `1px solid ${border}`, background: bg, 
                                textAlign: 'center', opacity: day.isCurrentMonth ? 1 : 0.35, minHeight: '48px',
                                cursor: st.status === 'ready' ? 'pointer' : 'not-allowed',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: (isToday || isSelected) ? 700 : 500, color }}>
                                {day.dateStr}
                              </span>
                              {st.status === 'rented' && (
                                <span style={{ fontSize: '9px', color: '#991B1B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>
                                  Kín ngày
                                </span>
                              )}
                              {st.status === 'partial' && (
                                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', gap: '1px' }}>
                                  {st.rentals?.map((r: any, i: number) => {
                                    const rStart = new Date(r.startDate);
                                    const rEnd = new Date(r.endDate);
                                    const fmtTime = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                    // If rental spans multiple days, only show relevant time for this day
                                    const tStart = rStart.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) < day.fullDate ? '00:00' : fmtTime(rStart);
                                    const tEnd = rEnd.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) > day.fullDate ? '23:59' : fmtTime(rEnd);
                                    return (
                                      <span key={i} style={{ fontSize: '8.5px', color: '#92400E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 1px' }} title={`${tStart} - ${tEnd} (${r.customerName})`}>
                                        {tStart}-{tEnd}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '12px', height: '12px', background: '#3B82F6', borderRadius: '2px' }}></div> Ngày chọn</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '12px', height: '12px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '2px' }}></div> Có lịch trống</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '12px', height: '12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '2px' }}></div> Kín ngày</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1.2 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Bảng giá áp dụng</label>
                  <div style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', background: '#F8FAFC', color: 'var(--text-main)', fontWeight: 600 }}>
                    Theo ngày ({selectedCarObj ? selectedCarObj.pricePerDay.toLocaleString() : '800k'} ₫/ngày)
                  </div>
                </div>

                <div style={{ flex: 0.8 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                    Số ngày thuê
                  </label>
                  <div style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', background: '#F8FAFC', color: 'var(--primary)', fontWeight: 700 }}>
                    {customDuration} ngày
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Phụ phí Cuối tuần / Lễ tết (%)</label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={isWeekend} onChange={e => { setIsWeekend(e.target.checked); setCustomRentalFeeInput(''); }} style={{ width: '18px', height: '18px' }} />
                    Áp dụng phụ phí
                  </label>
                  {isWeekend && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="number" 
                        value={weekendSurchargePercent} 
                        onChange={e => { setWeekendSurchargePercent(e.target.value); setCustomRentalFeeInput(''); }}
                        style={{ width: '80px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontSize: '14px', textAlign: 'center' }} 
                      />
                      <span>%</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Thời gian nhận & trả xe cụ thể</label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Giờ nhận xe</span>
                    <input 
                      type="time" 
                      value={pickupTime}
                      onChange={e => setPickupTime(e.target.value)}
                      style={{ width: '100%', marginTop: '4px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '15px', fontFamily: 'inherit' }} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Giờ trả xe</span>
                    <input 
                      type="time" 
                      value={returnTime}
                      onChange={e => setReturnTime(e.target.value)}
                      style={{ width: '100%', marginTop: '4px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '15px', fontFamily: 'inherit' }} 
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Số KM lúc bàn giao (Bắt đầu)</label>
                  <input 
                    type="number" 
                    value={startKm}
                    onChange={e => setStartKm(e.target.value)}
                    placeholder="VD: 50000"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Số KM lúc trả (Kết thúc)</label>
                  <input 
                    type="number" 
                    value={endKm}
                    onChange={e => setEndKm(e.target.value)}
                    placeholder="VD: 50250"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                  />
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      <ImageIcon size={18} color="var(--primary)" />
                      Ảnh tình trạng bàn giao xe
                      {carImages.length > 0 && (
                        <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                          {carImages.length} ảnh
                        </span>
                      )}
                    </label>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      Chọn hoặc tải lên nhiều ảnh cùng lúc (đồng hồ KM, vết xước, nội/ngoại thất xe lúc giao)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label style={{ cursor: 'pointer', background: 'var(--primary)', color: 'white', padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={15} /> Tải nhiều ảnh từ máy / ĐT
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleUploadCarImages} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    <button 
                      type="button" 
                      onClick={() => { setGalleryMode('car'); setShowGallery(true); }}
                      style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <ImageIcon size={15} /> Chọn nhiều từ thư viện
                    </button>
                  </div>
                </div>

                {carImages.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginTop: '12px' }}>
                    {carImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', height: '100px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-strong)', background: '#fff' }}>
                        <img src={img} alt={`Ảnh bàn giao ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleDeleteCarImage(i)}
                          title="Xóa ảnh"
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                        >
                          <Trash size={12} />
                        </button>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', padding: '2px 4px', textAlign: 'center' }}>
                          Ảnh #{i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    style={{ border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'white' }}
                    onClick={() => { setGalleryMode('car'); setShowGallery(true); }}
                  >
                    <ImageIcon size={32} color="var(--text-secondary)" style={{ marginBottom: '6px', opacity: 0.5 }} />
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Bấm vào đây hoặc chọn <strong>"Tải nhiều ảnh từ máy / ĐT"</strong> để chọn hàng loạt ảnh bàn giao xe
                    </div>
                  </div>
                )}
              </div>



              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button 
                  className="btn-primary" 
                  disabled={!selectedCarId || !startDate || !endDate || !!timeConflictError} 
                  onClick={() => setStep(2)}
                  style={{ padding: '12px 32px', fontSize: '16px', opacity: (!selectedCarId || !startDate || !endDate || !!timeConflictError) ? 0.5 : 1, cursor: (!selectedCarId || !startDate || !endDate || !!timeConflictError) ? 'not-allowed' : 'pointer' }}
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
              {/* Toggle Modes */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setCustomerMode('select')}
                  style={{ padding: '8px 16px', borderBottom: customerMode === 'select' ? '2px solid var(--primary)' : 'none', color: customerMode === 'select' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
                >
                  Chọn khách hàng có sẵn
                </button>
                <button 
                  type="button" 
                  onClick={() => { setCustomerMode('create'); handleSelectCustomer(''); }}
                  style={{ padding: '8px 16px', borderBottom: customerMode === 'create' ? '2px solid var(--primary)' : 'none', color: customerMode === 'create' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
                >
                  Tạo mới khách hàng
                </button>
              </div>

              {customerMode === 'select' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Gõ tên hoặc số điện thoại để tìm kiếm</label>
                  
                  {!selectedCustomerPhone ? (
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-strong)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                        <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
                        <input 
                          type="text" 
                          placeholder="Tìm kiếm nhanh khách hàng..." 
                          value={customerSearchInput}
                          onChange={e => setCustomerSearchInput(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: '15px' }}
                        />
                      </div>

                      {/* Results list - limited to 5 */}
                      {customerSearchInput.trim() && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                          {matchingCustomers.length === 0 ? (
                            <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                              Không tìm thấy kết quả phù hợp.
                            </div>
                          ) : (
                            matchingCustomers.map(c => (
                              <div 
                                key={c.id} 
                                onClick={() => {
                                  handleSelectCustomer(c.phone);
                                  setCustomerSearchInput('');
                                }}
                                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <User size={16} color="var(--primary)" />
                                <div>
                                  <strong>{c.name}</strong> - <span style={{ color: 'var(--text-secondary)' }}>{c.phone}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Selected Customer Card */
                    <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Khách hàng đã chọn: <strong>{customerName}</strong></div>
                        <div>Số điện thoại: <strong>{customerPhone}</strong></div>
                        <div>Số CCCD: <strong>{customerCccd}</strong></div>
                        <div>Địa chỉ: <strong>{customerAddress}</strong></div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSelectedCustomerPhone('')}
                        style={{ padding: '8px 14px', background: 'white', border: '1px solid #16a34a', color: '#16a34a', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Chọn khách khác
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Số điện thoại *</label>
                    <input 
                      type="tel" 
                      placeholder="Nhập số điện thoại khách" 
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Họ và tên *</label>
                      <input 
                        type="text" 
                        placeholder="Nguyễn Văn A"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Số CCCD/CMND *</label>
                      <input 
                        type="text" 
                        placeholder="Nhập số CCCD"
                        value={customerCccd}
                        onChange={e => setCustomerCccd(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Số GPLX (Bằng lái xe) *</label>
                      <input 
                        type="text" 
                        placeholder="Nhập số GPLX"
                        value={customerLicense}
                        onChange={e => setCustomerLicense(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                      />
                    </div>
                    <div style={{ flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Địa chỉ thường trú</label>
                      <input 
                        type="text" 
                        placeholder="Nhập địa chỉ của khách hàng"
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button 
                  type="button"
                  style={{ padding: '10px 24px', fontWeight: 600, background: '#e2e8f0', color: '#475569', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }} 
                  onClick={() => setStep(1)}
                >
                  Quay lại bước 1
                </button>
                <button 
                  className="btn-primary" 
                  disabled={customerMode === 'select' ? !selectedCustomerPhone : (!customerPhone || !customerName || !customerCccd || !customerLicense)} 
                  onClick={() => setStep(3)}
                  style={{ padding: '12px 32px', opacity: (customerMode === 'select' ? !selectedCustomerPhone : (!customerPhone || !customerName || !customerCccd || !customerLicense)) ? 0.5 : 1, cursor: (customerMode === 'select' ? !selectedCustomerPhone : (!customerPhone || !customerName || !customerCccd || !customerLicense)) ? 'not-allowed' : 'pointer' }}
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
              {/* Loại Hợp Đồng */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Loại Hợp đồng thuê</label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', flex: 1, background: contractSource === 'system' ? 'var(--status-ready-bg)' : 'white' }}>
                    <input type="radio" checked={contractSource === 'system'} onChange={() => setContractSource('system')} />
                    Hệ thống tự tạo mẫu hợp đồng
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', flex: 1, background: contractSource === 'uploaded' ? 'var(--status-ready-bg)' : 'white' }}>
                    <input type="radio" checked={contractSource === 'uploaded'} onChange={() => setContractSource('uploaded')} />
                    Tải lên tệp hợp đồng có sẵn (Scan/PDF)
                  </label>
                </div>
              </div>

              {contractSource === 'uploaded' && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-strong)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>Chọn tệp hợp đồng có sẵn (Scan / PDF) *</label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ background: 'var(--primary)', color: 'white', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={16} /> Chọn tệp từ máy / ĐT
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if (evt.target?.result) {
                                setUploadedFileUrl(evt.target.result as string);
                                setUploadedFileName(file.name);
                                showToast(`Đã chọn tệp: ${file.name}`, 'success');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ display: 'none' }} 
                      />
                    </label>
                    <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '10px 16px' }} onClick={() => { setGalleryMode('contract'); setShowGallery(true); }}>
                      Thư viện ảnh/tệp
                    </button>
                  </div>

                  {uploadedFileUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#d1fae5', color: '#047857', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0', fontSize: '13.5px', fontWeight: 700, wordBreak: 'break-all' }}>
                      <CheckCircle size={18} color="#047857" />
                      <span>Đã chọn tệp: <strong style={{ color: '#065f46', textDecoration: 'underline' }}>{uploadedFileName || 'Hop_Dong_Luu_Tru.pdf'}</strong></span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1.2 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Tiền cọc giữ xe (Bắt buộc)</label>
                  <MoneyInput
                    value={deposit}
                    onChange={setDeposit}
                    placeholder="10000000"
                    style={{ padding: '12px 16px', fontSize: '15px', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Tình trạng thanh toán</label>
                  <select 
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }}
                  >
                    <option value="deposit">Đã đặt cọc (Thanh toán sau)</option>
                    <option value="paid">Đã thanh toán toàn bộ</option>
                    <option value="debt">Còn nợ (Thanh toán sau)</option>
                  </select>
                </div>
              </div>

              {/* Step Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button 
                  type="button"
                  style={{ padding: '10px 24px', fontWeight: 600, background: '#e2e8f0', color: '#475569', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
                  onClick={() => setStep(2)}
                >
                  Quay lại bước 2
                </button>
                <button className="btn-primary" onClick={handleFinishRental} style={{ padding: '12px 32px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} /> Tạo đơn thuê & Giao xe
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Sticky Calculation, Vehicle & Customer Summary (Common to all steps) */}
        <div className="card" style={{ background: '#f8fafc', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px', border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-strong)', paddingBottom: '12px' }}>
            <Receipt size={20} color="var(--primary)" />
            Hóa đơn tạm tính
          </h3>

          {/* 1. THÔNG TIN XE */}
          <div style={{ borderBottom: '1px solid var(--border-strong)', paddingBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', margin: '0 0 10px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>THÔNG TIN XE</h4>
            {selectedCarObj ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={selectedCarObj.image} style={{ width: '80px', height: '52px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-light)' }} />
                <div>
                  <strong style={{ fontSize: '15px', display: 'block' }}>{selectedCarObj.name}</strong>
                  <span className="license-plate" style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px', display: 'inline-block' }}>{selectedCarObj.id}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Chủ xe: {getOwnerNameByPhone(selectedCarObj.ownerPhone)}</div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Chưa chọn xe thuê</span>
            )}
          </div>

          {/* 2. KHÁCH THUÊ (Chỉ hiện khi đã chọn hoặc nhập thông tin) */}
          <div style={{ borderBottom: '1px solid var(--border-strong)', paddingBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', margin: '0 0 10px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>KHÁCH HÀNG THUÊ</h4>
            {customerName ? (
              <div>
                <strong style={{ fontSize: '14px' }}>{customerName}</strong>
                {customerPhone && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>SĐT: {customerPhone}</div>}
              </div>
            ) : (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Chưa thiết lập khách hàng</span>
            )}
          </div>

          {/* 3. CHI TIẾT TẠM TÍNH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
            {startDate && endDate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#F8FAFC', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Nhận xe:</span>
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>
                    {new Date(startDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Trả xe:</span>
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>
                    {new Date(endDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </strong>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Đơn giá thuê xe:</span>
              <strong>{baseRate.toLocaleString()} ₫ / {pricingType === 'hourly' ? 'giờ' : pricingType === 'weekly' ? 'tuần' : 'ngày'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Thời lượng:</span>
              <strong>{durNum} {pricingType === 'hourly' ? 'giờ' : pricingType === 'weekly' ? 'tuần' : 'ngày'}</strong>
            </div>

            {isWeekend && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', fontSize: '12.5px', fontWeight: 600, background: '#fffbeb', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #fef3c7' }}>
                <span>Phụ phí Cuối tuần / Lễ tết (+{weekendSurchargePercent || 0}%):</span>
                <span>+{Math.round(durNum * baseRate * ((parseFloat(weekendSurchargePercent) || 0) / 100)).toLocaleString('vi-VN')} ₫</span>
              </div>
            )}
            
            {/* Tùy chỉnh Tiền thuê xe */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px' }}>Tiền thuê xe (Tùy chỉnh):</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tự động: {computedRentalFee.toLocaleString('vi-VN')}₫</span>
              </div>
              <MoneyInput
                value={customRentalFeeInput}
                onChange={setCustomRentalFeeInput}
                style={{ width: '110px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }} 
              />
            </div>

            {/* Tiền chi trả cho chủ xe — LUÔN HIỆN Ở SIDEBAR BÊN PHẢI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ECFDF5', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-available-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--status-available-text)', fontWeight: 600, fontSize: '12px' }}>Chi trả chủ xe (Admin):</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {selectedCarObj ? `Gợi ý (${ownerCommissionRate}%): ${computedOwnerCommission.toLocaleString('vi-VN')}₫` : 'Chưa chọn xe'}
                </span>
              </div>
              <MoneyInput
                value={customCommissionInput}
                onChange={setCustomCommissionInput}
                placeholder={computedOwnerCommission ? computedOwnerCommission.toString() : '0'}
                style={{ width: '120px', padding: '5px 8px', fontSize: '12px', fontWeight: 700, color: 'var(--status-available-text)', border: '1px solid var(--status-available-border)', background: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Phí giao nhận xe:</span>
              <MoneyInput
                value={deliveryFee}
                onChange={setDeliveryFee}
                placeholder="150000"
                style={{ width: '120px', padding: '5px 8px', fontSize: '12px', fontWeight: 600 }}
              />
            </div>

            {/* Trạng thái khởi tạo đơn */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>Trạng thái đơn thuê khi tạo:</label>
              <select 
                value={initialRentalStatus}
                onChange={e => setInitialRentalStatus(e.target.value as any)}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontSize: '12.5px', fontWeight: 700, fontFamily: 'inherit', background: 'white' }}
              >
                <option value="pending">🟡 Chờ bàn giao xe cho khách</option>
                <option value="active">🔵 Đang thuê (Đã giao xe ngay)</option>
                <option value="completed">🟢 Đã hoàn thành (Đã trả xe & chốt số KM)</option>
              </select>
            </div>

            {step === 3 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tiền đặt cọc:</span>
                <strong style={{ color: 'var(--primary)' }}>{(parseInt(deposit) || 0).toLocaleString()} ₫</strong>
              </div>
            )}
          </div>

          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>TỔNG CỘNG:</span>
            <span style={{ fontWeight: 800, fontSize: '24px', color: 'var(--accent)' }}>{totalAmount.toLocaleString()} ₫</span>
          </div>
        </div>

      </div>

      {/* QUICK ADD CAR MODAL */}
      {showQuickAddCarModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <form className="card" onSubmit={handleQuickAddCarSubmit} style={{ width: '780px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Thêm xe mới nhanh</h2>
              <button type="button" onClick={() => setShowQuickAddCarModal(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Biển số xe *</label>
                <input type="text" placeholder="VD: 51F-123.45" value={quickPlate} onChange={e => setQuickPlate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Hãng xe</label>
                <input type="text" placeholder="VD: Mazda" value={quickBrand} onChange={e => setQuickBrand(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Dòng xe *</label>
                <input type="text" placeholder="VD: Mazda 3" value={quickName} onChange={e => setQuickName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Đời xe</label>
                <input type="text" placeholder="VD: 2022" value={quickYear} onChange={e => setQuickYear(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Màu sắc *</label>
                <input type="text" placeholder="VD: Trắng" value={quickColor} onChange={e => setQuickColor(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Số chỗ ngồi</label>
                <input type="number" value={quickSeats} onChange={e => setQuickSeats(parseInt(e.target.value) || 5)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            {/* Custom pricing in quick add car */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Giá giờ (₫) *</label>
                <MoneyInputLeft value={quickPriceHour} onChange={setQuickPriceHour} placeholder="100000" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Giá ngày (₫) *</label>
                <MoneyInputLeft value={quickPriceDay} onChange={setQuickPriceDay} placeholder="800000" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Giá tuần (₫) *</label>
                <MoneyInputLeft value={quickPriceWeek} onChange={setQuickPriceWeek} placeholder="5000000" required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Số KM ban đầu *</label>
                <input type="number" placeholder="VD: 15000" value={quickKm} onChange={e => setQuickKm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Chọn Chủ xe gốc *</label>
                <select 
                  value={quickPhone} 
                  onChange={e => setQuickPhone(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', background: '#FFF' }} 
                  required
                >
                  <option value="">-- Chọn Chủ xe --</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.phone}>
                      {o.name} - {o.phone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh xe</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {quickImage ? (
                  <img src={quickImage} alt="Preview" style={{ width: '50px', height: '35px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '50px', height: '35px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)', border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={14} color="var(--text-secondary)" />
                  </div>
                )}
                <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 12px', fontSize: '13px' }} onClick={() => { setGalleryMode('quickCar'); setShowGallery(true); }}>
                  Thư viện ảnh
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowQuickAddCarModal(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
              <button type="submit" className="btn-primary">Thêm & Chọn xe</button>
            </div>
          </form>
        </div>
      )}

      {showGallery && (
        <ImageGallery 
          onClose={() => setShowGallery(false)} 
          multiple={galleryMode === 'car'}
          onSelect={(urls) => {
            const arr = Array.isArray(urls) ? urls : [urls];
            if (galleryMode === 'car') {
              setCarImages(prev => Array.from(new Set([...prev, ...arr])));
              showToast(`Đã thêm ${arr.length} ảnh bàn giao xe từ thư viện!`, 'success');
            } else if (galleryMode === 'contract') {
              setUploadedFileUrl(arr[0]);
            } else if (galleryMode === 'quickCar') {
              setQuickImage(arr[0]);
            }
          }}
        />
      )}

      {/* RENTAL CONFIRMATION RECEIPT MODAL FOR SCREENSHOT / SHARING */}
      {createdReceiptRental && (
        <div className="print-overlay-wrapper" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px', overflowY: 'auto' }}>
          <div 
            className="card printable-contract-card" 
            style={{ 
              width: '100%', 
              maxWidth: '680px', 
              background: '#FFFFFF', 
              color: '#0F172A', 
              padding: '32px', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              border: '2px solid var(--primary)'
            }}
          >
            
            {/* Invoice Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--primary)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ color: 'var(--primary)', fontSize: '22px', fontWeight: 800, margin: 0 }}>
                  AGREEN - CHO THUÊ XE ĐIỆN TỰ LÁI
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Dịch Vụ Cho Thuê Xe Điện Tự Lái • Hotline: 0386619758
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', background: 'var(--status-available-bg)', color: 'var(--status-available-text)', padding: '4px 10px', borderRadius: '100px', fontWeight: 700 }}>
                  ✓ ĐÃ XÁC NHẬN BÀN GIAO XE
                </span>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px', color: 'var(--text-primary)' }}>
                  Mã đơn: #{createdReceiptRental.id}
                </div>
                <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Ngày lập: {new Date().toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Title Banner */}
            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <h1 style={{ fontSize: '18px', margin: 0, color: 'var(--primary)', letterSpacing: '0.5px' }}>
                PHIẾU XÁC NHẬN BÀN GIAO & THUÊ XE
              </h1>
            </div>

            {/* Customer & Vehicle Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Customer Box */}
              <div style={{ background: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '13px', margin: '0 0 10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  👤 KHÁCH HÀNG THUÊ XE
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div>Họ và tên: <strong>{createdReceiptRental.customerName}</strong></div>
                  <div>Số điện thoại: <strong className="font-mono">{createdReceiptRental.customerPhone}</strong></div>
                  {customerCccd && <div>Số CCCD: <span className="font-mono">{customerCccd}</span></div>}
                  {customerLicense && <div>Số GPLX: <span className="font-mono">{customerLicense}</span></div>}
                </div>
              </div>

              {/* Vehicle Box */}
              <div style={{ background: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '13px', margin: '0 0 10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  🚗 XE BÀN GIAO
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Biển số xe:</span>
                    <span className="license-plate font-mono">{createdReceiptRental.carId}</span>
                  </div>
                  <div>Dòng xe: <strong>{selectedCarObj?.name || createdReceiptRental.carId}</strong></div>
                  <div>Màu xe: <strong>{selectedCarObj?.color || 'Đen'}</strong></div>
                  <div>KM bàn giao (bắt đầu): <strong className="font-mono">{createdReceiptRental.startKm.toLocaleString()} km</strong></div>
                  <div>KM trả xe (kết thúc): <strong className="font-mono">{createdReceiptRental.endKm !== undefined && createdReceiptRental.endKm !== null ? `${createdReceiptRental.endKm.toLocaleString()} km` : 'Chưa ghi nhận'}</strong></div>
                </div>
              </div>

            </div>

            {/* Rental Schedule & Pricing Details */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Nội dung</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Chi tiết / Giá tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>Thời gian nhận xe (Xuất bãi)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                      {new Date(createdReceiptRental.startDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>Thời gian trả xe dự kiến</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                      {new Date(createdReceiptRental.endDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>Cước tiền thuê xe</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                      {createdReceiptRental.rentalFee.toLocaleString()} ₫
                    </td>
                  </tr>
                  {createdReceiptRental.deliveryFee > 0 && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px' }}>Phí giao xe tận nơi</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                        {createdReceiptRental.deliveryFee.toLocaleString()} ₫
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>Tiền cọc giữ xe (Đã nhận)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }} className="font-mono">
                      {createdReceiptRental.deposit.toLocaleString()} ₫
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Summary Row */}
            <div style={{ background: 'var(--status-available-bg)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--status-available-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-available-text)' }}>TỔNG TIỀN THANH TOÁN:</span>
                <div style={{ fontSize: '11px', color: 'var(--status-available-text)' }}>Trạng thái: {createdReceiptRental.paymentStatus === 'paid' ? 'Đã thanh toán đủ' : 'Đã đặt cọc tiền giữ xe'}</div>
              </div>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-available-text)' }}>
                {createdReceiptRental.totalAmount.toLocaleString()} ₫
              </div>
            </div>

            {/* Note Terms */}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', textAlign: 'center' }}>
              * Quý khách vui lòng giữ xe sạch sẽ, trả xe đúng giờ đã đăng ký và tuân thủ luật giao thông đường bộ. Xin cảm ơn!
            </div>

            {/* Receipt Modal Action Buttons */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => { setCreatedReceiptRental(null); navigate('/contracts'); }}
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Quản lý danh sách đơn
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => { setCreatedReceiptRental(null); setStep(1); setSelectedCarId(''); setCustomerName(''); setSelectedCustomerPhone(''); }}
                  style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Tạo đơn khác
                </button>
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={() => window.print()}
                  style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 700 }}
                >
                  📸 In phiếu / Chụp ảnh gửi khách
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRental;
