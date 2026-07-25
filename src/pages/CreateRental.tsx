import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Image as ImageIcon, Receipt, CheckCircle, Search, User, Plus, X, Upload } from 'lucide-react';
import { useApp, type Rental, type Car } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';
import { MoneyInput, MoneyInputLeft } from '../components/MoneyInput';

const CreateRental = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cars, addCar, addRental, customers, addCustomer, owners, showToast } = useApp();
  
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

  const [startDate, setStartDate] = useState(() => {
    // Default to today
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T08:00`;
  });
  const [endDate, setEndDate] = useState('');
  const [pricingType, setPricingType] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [customDuration, setCustomDuration] = useState('2'); // Default 2 units
  const [isWeekend, setIsWeekend] = useState(false);
  const [weekendSurchargePercent, setWeekendSurchargePercent] = useState('20'); // Editable weekend surcharge
  const [startKm, setStartKm] = useState('0');
  const [startFuel, setStartFuel] = useState('8/8');
  const [initialRentalStatus, setInitialRentalStatus] = useState<'pending' | 'active'>('pending');

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
    }
  }, [selectedCarId, selectedCarObj]);

  // Synchronize customDuration -> endDate
  useEffect(() => {
    if (!startDate) return;
    const start = new Date(startDate);
    const dur = parseFloat(customDuration) || 0;
    
    if (pricingType === 'hourly') {
      start.setHours(start.getHours() + Math.ceil(dur));
    } else if (pricingType === 'weekly') {
      start.setDate(start.getDate() + Math.ceil(dur * 7));
    } else { // daily
      start.setDate(start.getDate() + Math.ceil(dur));
    }

    const pad = (num: number) => num.toString().padStart(2, '0');
    const y = start.getFullYear();
    const m = pad(start.getMonth() + 1);
    const d = pad(start.getDate());
    const hh = pad(start.getHours());
    const mm = pad(start.getMinutes());
    setEndDate(`${y}-${m}-${d}T${hh}:${mm}`);
  }, [startDate, pricingType, customDuration]);

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

  const handleFinishRental = () => {
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
      addCustomer({
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
    }

    const rentalToAdd: Rental = {
      id: `RNT-${Date.now().toString().slice(-4)}`,
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
      startFuel,
      source: contractSource,
      fileUrl: contractSource === 'uploaded' ? uploadedFileUrl : undefined,
      fileName: contractSource === 'uploaded' ? (uploadedFileName || 'Hop_Dong_Luu_Tru.pdf') : undefined,
      ownerCommissionAmount,
      createdAt: new Date().toISOString(),
      deliveredAt: initialRentalStatus === 'active' ? new Date().toISOString() : undefined
    };

    addRental(rentalToAdd);
    showToast('Tạo đơn thuê xe thành công!', 'success');
    setCreatedReceiptRental(rentalToAdd);
  };

  const handleQuickAddCarSubmit = (e: React.FormEvent) => {
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

    addCar(carToAdd);
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

    showToast('Đã thêm xe mới thành công và tự động chọn xe cho đơn thuê!', 'success');
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
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Tạo đơn thuê mới</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Thiết lập hợp đồng và ghi nhận tình trạng bàn giao xe</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: step >= s ? 1 : 0.5 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= s ? 'var(--primary)' : 'var(--border-strong)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {s}
            </div>
            <span style={{ fontWeight: step >= s ? 600 : 400 }}>
              {s === 1 ? 'Chọn xe & Bảng giá' : s === 2 ? 'Khách hàng' : 'Thanh toán & Hợp đồng'}
            </span>
            {s !== 3 && <div style={{ width: '40px', height: '2px', background: 'var(--border-light)' }}></div>}
          </div>
        ))}
      </div>

      {/* Unified 2-Column Layout Grid for ALL steps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '24px', alignItems: 'flex-start' }}>
        
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
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1.2 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Bảng giá áp dụng</label>
                  <select 
                    value={pricingType} 
                    onChange={e => {
                      setPricingType(e.target.value as any);
                      if (e.target.value === 'hourly') setCustomDuration('4');
                      else if (e.target.value === 'weekly') setCustomDuration('1');
                      else setCustomDuration('2');
                    }}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }}
                  >
                    <option value="daily">Theo ngày ({selectedCarObj ? selectedCarObj.pricePerDay.toLocaleString() : '800k'} ₫/ngày)</option>
                    <option value="hourly">Theo giờ ({selectedCarObj ? selectedCarObj.pricePerHour.toLocaleString() : '100k'} ₫/giờ)</option>
                    <option value="weekly">Theo tuần ({selectedCarObj ? selectedCarObj.pricePerWeek.toLocaleString() : '5M'} ₫/tuần)</option>
                  </select>
                </div>

                <div style={{ flex: 0.8 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                    Số lượng ({pricingType === 'hourly' ? 'Giờ' : pricingType === 'weekly' ? 'Tuần' : 'Ngày'})
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={customDuration} 
                    onChange={e => setCustomDuration(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Phụ phí Cuối tuần / Lễ tết (%)</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Thời gian nhận & trả xe (Tự động tính)</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ngày nhận xe</span>
                    <input 
                      type="datetime-local" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{ width: '100%', marginTop: '4px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '15px', fontFamily: 'inherit' }} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ngày trả xe dự kiến</span>
                    <input 
                      type="datetime-local" 
                      value={endDate}
                      disabled
                      style={{ width: '100%', marginTop: '4px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '15px', fontFamily: 'inherit', background: '#f3f4f6' }} 
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Số KM lúc bàn giao</label>
                  <input 
                    type="number" 
                    value={startKm}
                    onChange={e => setStartKm(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Mức nhiên liệu lúc giao</label>
                  <select 
                    value={startFuel}
                    onChange={e => setStartFuel(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '16px', fontFamily: 'inherit' }}
                  >
                    <option value="8/8 (Đầy)">8/8 (Đầy)</option>
                    <option value="6/8">6/8</option>
                    <option value="4/8">4/8 (Nửa bình)</option>
                    <option value="2/8">2/8</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Ảnh tình trạng bàn giao xe</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {carImages.map((img, i) => (
                    <div key={i} style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                  <div 
                    style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary)', background: 'var(--status-ready-bg)' }}
                    onClick={() => { setGalleryMode('car'); setShowGallery(true); }}
                  >
                    <ImageIcon size={24} style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>Thêm ảnh</span>
                  </div>
                </div>
              </div>



              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button 
                  className="btn-primary" 
                  disabled={!selectedCarId || !startDate || !endDate} 
                  onClick={() => setStep(2)}
                  style={{ padding: '12px 32px', fontSize: '16px', opacity: (!selectedCarId || !startDate || !endDate) ? 0.5 : 1, cursor: (!selectedCarId || !startDate || !endDate) ? 'not-allowed' : 'pointer' }}
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
                  
                  <div style={{ display: 'flex', gap: '16px' }}>
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

                  <div style={{ display: 'flex', gap: '16px' }}>
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
                <div style={{ display: 'flex', gap: '16px' }}>
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

              <div style={{ display: 'flex', gap: '16px' }}>
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
            <span style={{ fontWeight: 800, fontSize: '24px', color: 'var(--accent)' }} className="font-mono">{totalAmount.toLocaleString()} ₫</span>
          </div>
        </div>

      </div>

      {/* QUICK ADD CAR MODAL */}
      {showQuickAddCarModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleQuickAddCarSubmit} style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Thêm xe mới nhanh</h2>
              <button type="button" onClick={() => setShowQuickAddCarModal(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Biển số xe *</label>
                <input type="text" placeholder="VD: 51F-123.45" value={quickPlate} onChange={e => setQuickPlate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Hãng xe</label>
                <input type="text" placeholder="VD: Mazda" value={quickBrand} onChange={e => setQuickBrand(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Dòng xe *</label>
                <input type="text" placeholder="VD: Mazda 3" value={quickName} onChange={e => setQuickName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Đời xe</label>
                <input type="text" placeholder="VD: 2022" value={quickYear} onChange={e => setQuickYear(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
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

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Số KM ban đầu *</label>
                <input type="number" placeholder="VD: 15000" value={quickKm} onChange={e => setQuickKm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>SĐT Chủ xe góp *</label>
                <input type="tel" placeholder="VD: 0901234567" value={quickPhone} onChange={e => setQuickPhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
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
          onSelect={(urls) => {
            const arr = Array.isArray(urls) ? urls : [urls];
            if (galleryMode === 'car') {
              setCarImages(arr);
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px', overflowY: 'auto' }}>
          <div 
            className="card" 
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
                  AUTOMANAGE GARAGE
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Dịch Vụ Cho Thuê Xe Tự Lái & Có Tài Xế • Hotline: 0901 234 567
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
                  <div>Số KM xuất bãi: <strong className="font-mono">{createdReceiptRental.startKm.toLocaleString()} km</strong></div>
                  <div>Mức xăng/điện bàn giao: <strong className="font-mono">{createdReceiptRental.startFuel}</strong></div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
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
