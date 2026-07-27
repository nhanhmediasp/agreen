import React, { useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, CheckCircle2, Clock, 
  Car, UserCheck, DollarSign, Edit, Trash2, 
  UserPlus, Phone, Compass, FileText, X, Navigation,
  BarChart2, Receipt, Percent, Wallet,
  MapPin, ArrowRight, Eye, Copy, Printer, ArrowLeft, Check,
  Upload, Camera, Image as ImageIcon
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useApp, type ServiceOrder, type Driver } from '../context/AppContext';

export default function ServiceOrders() {
  const { 
    serviceOrders, drivers, cars, 
    addServiceOrder, updateServiceOrder, deleteServiceOrder, toggleServiceOrderPayment,
    addDriver, updateDriver, deleteDriver, showToast 
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'drivers'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [carFilter, setCarFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Page View state for Driver Detail (URL path /drivers/:id or URL query ?driverId=... or local state)
  const [selectedDriverIdPage, setSelectedDriverIdPage] = useState<string | null>(null);
  const activeDriverId = routeParams.id || searchParams.get('driverId') || selectedDriverIdPage;

  const handleSelectDriverForDetail = (id: string | null) => {
    setSelectedDriverIdPage(id);
    if (id) {
      setSearchParams({ driverId: id });
    } else {
      setSearchParams({});
      if (routeParams.id) {
        navigate('/services');
      }
    }
  };

  const [driverPageDateFilter, setDriverPageDateFilter] = useState<string>('');

  // Modals state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Quote / Order Detail Modal state ("Xem đơn & Gửi báo giá cho khách")
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteOrder, setQuoteOrder] = useState<ServiceOrder | null>(null);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);

  // Quick Inline Create Driver state
  const [isQuickCreateDriver, setIsQuickCreateDriver] = useState(false);

  // Search queries inside Create/Edit Order Modal for Car & Driver
  const [modalCarSearch, setModalCarSearch] = useState('');
  const [modalDriverSearch, setModalDriverSearch] = useState('');

  // Form states for Service Order
  const [orderForm, setOrderForm] = useState({
    carId: '',
    driverId: '',
    // Quick driver fields if creating new driver on the fly
    quickDriverName: '',
    quickDriverPhone: '',
    quickDriverLicense: '',
    quickDriverClass: 'B2',

    pickupLocation: '',
    dropoffLocation: '',
    serviceDate: new Date().toISOString().slice(0, 16),
    startKm: 0,
    endKm: 0,
    pricePerKm: 15000,
    extraFee: 0,
    driverCommissionRate: 80, // Mặc định chiết khấu 80% cho tài xế
    paymentStatus: 'unpaid' as 'paid' | 'unpaid',
    notes: ''
  });

  // Form state for Driver modal
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    licenseClass: 'B2',
    status: 'available' as Driver['status'],
    address: '',
    notes: '',
    assignedCarId: '',
    commissionRate: 80,
    avatar: ''
  });

  // KPI Statistics
  const totalOrdersCount = serviceOrders.length;
  const totalRevenue = serviceOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalDriverEarnings = serviceOrders.reduce((sum, o) => sum + (o.driverCommissionAmount || Math.round(o.totalAmount * 0.8)), 0);
  const totalKmServed = serviceOrders.reduce((sum, o) => sum + Math.max(0, o.endKm - o.startKm), 0);

  // Filtering Service Orders
  const filteredOrders = serviceOrders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.driverPhone.includes(searchTerm) ||
      order.carId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.pickupLocation && order.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.dropoffLocation && order.dropoffLocation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    const matchesCar = carFilter === 'all' || order.carId === carFilter;

    return matchesSearch && matchesPayment && matchesCar;
  });

  // Filtering Drivers
  const filteredDrivers = drivers.filter(driver => 
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm) ||
    driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered cars inside Create Order modal
  const modalFilteredCars = cars.filter(c => 
    c.id.toLowerCase().includes(modalCarSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(modalCarSearch.toLowerCase()) ||
    c.brand.toLowerCase().includes(modalCarSearch.toLowerCase())
  );

  // Filtered drivers inside Create Order modal
  const modalFilteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(modalDriverSearch.toLowerCase()) ||
    d.phone.includes(modalDriverSearch) ||
    d.licenseNumber.toLowerCase().includes(modalDriverSearch.toLowerCase())
  );

  // Open Create/Edit Order Modal
  const handleOpenOrderModal = (order?: ServiceOrder) => {
    setIsQuickCreateDriver(false);
    setModalCarSearch('');
    setModalDriverSearch('');
    if (order) {
      setEditingOrder(order);
      setOrderForm({
        carId: order.carId,
        driverId: order.driverId,
        quickDriverName: '',
        quickDriverPhone: '',
        quickDriverLicense: '',
        quickDriverClass: 'B2',
        pickupLocation: order.pickupLocation || '',
        dropoffLocation: order.dropoffLocation || '',
        serviceDate: order.serviceDate || new Date().toISOString().slice(0, 16),
        startKm: order.startKm,
        endKm: order.endKm,
        pricePerKm: order.pricePerKm,
        extraFee: order.extraFee || 0,
        driverCommissionRate: order.driverCommissionRate !== undefined ? order.driverCommissionRate : 80,
        paymentStatus: order.paymentStatus,
        notes: order.notes || ''
      });
    } else {
      setEditingOrder(null);
      const defaultCar = cars[0]?.id || '';
      const defaultCarKm = cars[0]?.km || 0;
      const defaultDriverObj = drivers[0];
      const defaultDriverId = defaultDriverObj?.id || '';
      const defaultComm = defaultDriverObj?.commissionRate || 80;

      setOrderForm({
        carId: defaultCar,
        driverId: defaultDriverId,
        quickDriverName: '',
        quickDriverPhone: '',
        quickDriverLicense: '',
        quickDriverClass: 'B2',
        pickupLocation: '',
        dropoffLocation: '',
        serviceDate: new Date().toISOString().slice(0, 16),
        startKm: defaultCarKm,
        endKm: defaultCarKm + 20,
        pricePerKm: 15000,
        extraFee: 0,
        driverCommissionRate: defaultComm,
        paymentStatus: 'unpaid',
        notes: ''
      });
    }
    setShowOrderModal(true);
  };

  // Open Quote / Order Detail Modal ("Xem đơn & Gửi báo giá cho khách")
  const handleOpenQuoteModal = (order: ServiceOrder) => {
    setQuoteOrder(order);
    setCopiedQuote(false);
    setShowQuoteModal(true);
  };

  // Copy Quote Text to Clipboard for Zalo/SMS messaging
  const handleCopyQuoteText = () => {
    if (!quoteOrder) return;
    const distance = Math.max(0, quoteOrder.endKm - quoteOrder.startKm);
    const carObj = cars.find(c => c.id === quoteOrder.carId);
    
    const quoteText = `🚗 [PHIẾU BÁO GIÁ CƯỚC CHUYẾN ĐI - MÃ ĐƠN #${quoteOrder.id}]
- Thời gian: ${quoteOrder.serviceDate ? new Date(quoteOrder.serviceDate).toLocaleString('vi-VN') : 'Mới tạo'}
- Xe phục vụ: ${quoteOrder.carId} ${carObj?.name ? `(${carObj.name})` : ''}
- Tài xế: ${quoteOrder.driverName} (SĐT: ${quoteOrder.driverPhone})
${quoteOrder.pickupLocation ? `- Điểm đón: ${quoteOrder.pickupLocation}\n` : ''}${quoteOrder.dropoffLocation ? `- Điểm trả: ${quoteOrder.dropoffLocation}\n` : ''}- Quãng đường: ${distance} KM (${quoteOrder.startKm} ➔ ${quoteOrder.endKm})
- Đơn giá: ${quoteOrder.pricePerKm.toLocaleString('vi-VN')} đ/KM
${quoteOrder.extraFee > 0 ? `- Phụ phí vé/trạm: ${quoteOrder.extraFee.toLocaleString('vi-VN')} đ\n` : ''}👉 TỔNG TIỀN THANH TOÁN: ${quoteOrder.totalAmount.toLocaleString('vi-VN')} VNĐ
Trạng thái: ${quoteOrder.paymentStatus === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
Cảm ơn quý khách đã sử dụng dịch vụ!`;

    navigator.clipboard.writeText(quoteText);
    setCopiedQuote(true);
    showToast('Đã sao chép văn bản báo giá! Bạn có thể dán (Paste) vào Zalo/SMS để gửi khách.', 'success');
    setTimeout(() => setCopiedQuote(false), 3000);
  };

  // Capture Screenshot of Quote Receipt as PNG Image & Download / Copy
  const handleCaptureQuoteImage = async (mode: 'download' | 'copy') => {
    const quoteElement = document.getElementById('quote-receipt-card');
    if (!quoteElement) return;

    try {
      setIsCapturingImage(true);
      const canvas = await html2canvas(quoteElement, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true
      });

      if (mode === 'download') {
        const imageUri = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageUri;
        link.download = `Phieu_Bao_Gia_${quoteOrder?.id || 'Chuyen_Di'}.png`;
        link.click();
        showToast('📷 Đã tải xuống Ảnh Phiếu Báo Giá PNG thành công!', 'success');
      } else {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && window.ClipboardItem) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              showToast('📸 ĐÃ CHỤP & SAO CHÉP ÁNH BÁO GIÁ! Chỉ cần sang Zalo ấn Ctrl + V để dán gửi cho khách.', 'success');
            } catch (_clipboardErr) {
              // Fallback to auto download if clipboard image permission denied
              const imageUri = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.href = imageUri;
              link.download = `Phieu_Bao_Gia_${quoteOrder?.id || 'Chuyen_Di'}.png`;
              link.click();
              showToast('📷 Đã tải Ảnh Phiếu Báo Giá xuống máy của bạn!', 'success');
            }
          }
        });
      }
    } catch (_err) {
      showToast('Không thể tạo ảnh báo giá. Vui lòng thử lại!', 'error');
    } finally {
      setIsCapturingImage(false);
    }
  };

  // Handle Car change in order modal to auto update startKm
  const handleCarSelectChange = (carId: string) => {
    const selectedCarObj = cars.find(c => c.id === carId);
    const carKm = selectedCarObj ? selectedCarObj.km : 0;
    setOrderForm(prev => ({
      ...prev,
      carId,
      startKm: carKm,
      endKm: Math.max(prev.endKm, carKm + 10)
    }));
  };

  // Handle Driver change to auto update default commission rate
  const handleDriverSelectChange = (driverId: string) => {
    const selectedDriverObj = drivers.find(d => d.id === driverId);
    const commRate = selectedDriverObj?.commissionRate || 80;
    setOrderForm(prev => ({
      ...prev,
      driverId,
      driverCommissionRate: commRate
    }));
  };

  // Handle Avatar Image File Upload for Driver
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setDriverForm(prev => ({ ...prev, avatar: base64String }));
      showToast('📷 Đã tải ảnh đại diện tài xế!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Save Service Order
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderForm.carId) {
      showToast('Vui lòng chọn xe phục vụ!', 'error');
      return;
    }

    let selectedDriverId = orderForm.driverId;
    let selectedDriverName = '';
    let selectedDriverPhone = '';

    // If quick creating a driver
    if (isQuickCreateDriver) {
      if (!orderForm.quickDriverName || !orderForm.quickDriverPhone) {
        showToast('Vui lòng nhập Tên và Số điện thoại tài xế mới!', 'error');
        return;
      }
      const newDriverId = `DRV-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const newDriverObj: Driver = {
        id: newDriverId,
        name: orderForm.quickDriverName,
        phone: orderForm.quickDriverPhone,
        licenseNumber: orderForm.quickDriverLicense || `GPLX-${Date.now().toString().slice(-6)}`,
        licenseClass: orderForm.quickDriverClass,
        status: 'available',
        totalTrips: 0,
        assignedCarId: orderForm.carId,
        commissionRate: Number(orderForm.driverCommissionRate)
      };
      addDriver(newDriverObj);
      selectedDriverId = newDriverId;
      selectedDriverName = newDriverObj.name;
      selectedDriverPhone = newDriverObj.phone;
      showToast(`Đã thêm nhanh tài xế ${newDriverObj.name}`, 'success');
    } else {
      const foundDriver = drivers.find(d => d.id === selectedDriverId);
      if (foundDriver) {
        selectedDriverName = foundDriver.name;
        selectedDriverPhone = foundDriver.phone;
      } else {
        selectedDriverName = 'Tài xế tự chạy';
        selectedDriverPhone = '---';
      }
    }

    const distance = Math.max(0, Number(orderForm.endKm) - Number(orderForm.startKm));
    const calculatedFare = Math.round(distance * Number(orderForm.pricePerKm) + Number(orderForm.extraFee));
    const commRate = Number(orderForm.driverCommissionRate) || 80;
    const commAmount = Math.round(calculatedFare * (commRate / 100));

    if (editingOrder) {
      updateServiceOrder(editingOrder.id, {
        carId: orderForm.carId,
        driverId: selectedDriverId,
        driverName: selectedDriverName,
        driverPhone: selectedDriverPhone,
        customerName: 'Tài xế tự bắt khách',
        customerPhone: '---',
        pickupLocation: orderForm.pickupLocation,
        dropoffLocation: orderForm.dropoffLocation,
        serviceDate: orderForm.serviceDate,
        startKm: Number(orderForm.startKm),
        endKm: Number(orderForm.endKm),
        distanceKm: distance,
        pricePerKm: Number(orderForm.pricePerKm),
        extraFee: Number(orderForm.extraFee),
        totalAmount: calculatedFare,
        driverCommissionRate: commRate,
        driverCommissionAmount: commAmount,
        paymentStatus: orderForm.paymentStatus,
        notes: orderForm.notes
      });
      showToast(`Đã cập nhật đơn dịch vụ ${editingOrder.id}`, 'success');
    } else {
      const newOrder: ServiceOrder = {
        id: `SRV-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        carId: orderForm.carId,
        driverId: selectedDriverId,
        driverName: selectedDriverName,
        driverPhone: selectedDriverPhone,
        customerName: 'Tài xế tự bắt khách',
        customerPhone: '---',
        pickupLocation: orderForm.pickupLocation,
        dropoffLocation: orderForm.dropoffLocation,
        serviceDate: orderForm.serviceDate,
        startKm: Number(orderForm.startKm),
        endKm: Number(orderForm.endKm),
        distanceKm: distance,
        pricePerKm: Number(orderForm.pricePerKm),
        extraFee: Number(orderForm.extraFee),
        totalAmount: calculatedFare,
        driverCommissionRate: commRate,
        driverCommissionAmount: commAmount,
        paymentStatus: orderForm.paymentStatus,
        status: 'completed',
        notes: orderForm.notes,
        createdAt: new Date().toISOString()
      };
      addServiceOrder(newOrder);
      showToast(`Tạo thành công đơn dịch vụ mới ${newOrder.id}!`, 'success');
    }

    setShowOrderModal(false);
  };

  // Open Driver Modal
  const handleOpenDriverModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setDriverForm({
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        licenseClass: driver.licenseClass,
        status: driver.status,
        address: driver.address || '',
        notes: driver.notes || '',
        assignedCarId: driver.assignedCarId || '',
        commissionRate: driver.commissionRate || 80,
        avatar: driver.avatar || ''
      });
    } else {
      setEditingDriver(null);
      setDriverForm({
        name: '',
        phone: '',
        licenseNumber: '',
        licenseClass: 'B2',
        status: 'available',
        address: '',
        notes: '',
        assignedCarId: '',
        commissionRate: 80,
        avatar: ''
      });
    }
    setShowDriverModal(true);
  };

  // Save Driver
  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.phone) {
      showToast('Vui lòng điền Họ tên và Số điện thoại tài xế!', 'error');
      return;
    }

    if (editingDriver) {
      updateDriver(editingDriver.id, {
        name: driverForm.name,
        phone: driverForm.phone,
        licenseNumber: driverForm.licenseNumber,
        licenseClass: driverForm.licenseClass,
        status: driverForm.status,
        address: driverForm.address,
        notes: driverForm.notes,
        assignedCarId: driverForm.assignedCarId,
        commissionRate: Number(driverForm.commissionRate) || 80,
        avatar: driverForm.avatar
      });
      showToast(`Đã cập nhật thông tin tài xế ${driverForm.name}`, 'success');
    } else {
      const newDriver: Driver = {
        id: `DRV-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        name: driverForm.name,
        phone: driverForm.phone,
        licenseNumber: driverForm.licenseNumber || `GPLX-${Date.now().toString().slice(-6)}`,
        licenseClass: driverForm.licenseClass,
        status: driverForm.status,
        address: driverForm.address,
        notes: driverForm.notes,
        totalTrips: 0,
        assignedCarId: driverForm.assignedCarId,
        commissionRate: Number(driverForm.commissionRate) || 80,
        avatar: driverForm.avatar
      };
      addDriver(newDriver);
      showToast(`Đã thêm tài xế mới ${newDriver.name}!`, 'success');
    }
    setShowDriverModal(false);
  };

  // Delete Order
  const handleDeleteOrder = (id: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa đơn dịch vụ ${id}?`)) {
      deleteServiceOrder(id);
      showToast(`Đã xóa đơn dịch vụ ${id}`, 'info');
    }
  };

  // Delete Driver
  const handleDeleteDriver = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài xế ${name}?`)) {
      deleteDriver(id);
      showToast(`Đã xóa tài xế ${name}`, 'info');
    }
  };


  // STANDARD MAIN VIEW (ORDERS LIST & DRIVERS LIST OR DRIVER DETAIL)
  return (
    <div className="page-container" style={{ width: '100%' }}>
      
      {activeDriverId ? (
        (() => {
          const selectedDriver = drivers.find(d => d.id === activeDriverId);
          if (!selectedDriver) {
            return (
              <div style={{ padding: '24px' }}>
                <button onClick={() => handleSelectDriverForDetail(null)} className="btn btn-secondary">
                  <ArrowLeft size={16} /> Quay lại danh sách
                </button>
                <div style={{ marginTop: '20px', color: '#EF4444', fontWeight: 600 }}>Không tìm thấy thông tin tài xế trong hệ thống!</div>
              </div>
            );
          }

          const assignedCar = cars.find(c => c.id === selectedDriver.assignedCarId);
          const driverOrders = serviceOrders.filter(o => o.driverId === selectedDriver.id || o.driverName === selectedDriver.name);
          
          const filteredDriverOrders = driverOrders.filter(o => {
            if (!driverPageDateFilter) return true;
            return o.serviceDate.slice(0, 10) === driverPageDateFilter;
          });

          const totalKm = driverOrders.reduce((sum, o) => sum + Math.max(0, o.endKm - o.startKm), 0);
          const totalFareRevenue = driverOrders.reduce((sum, o) => sum + o.totalAmount, 0);
          const totalDriverEarnings = driverOrders.reduce((sum, o) => sum + (o.driverCommissionAmount || Math.round(o.totalAmount * ((selectedDriver.commissionRate || 80)/100))), 0);
          const totalCompanyRevenue = totalFareRevenue - totalDriverEarnings;
          const paidOrdersCount = driverOrders.filter(o => o.paymentStatus === 'paid').length;

          const statusLabels = {
            available: { text: '🟢 Sẵn sàng chạy chuyến', bg: '#DCFCE7', color: '#15803D' },
            on_trip: { text: '🔵 Đang trên chuyến đi', bg: '#DBEAFE', color: '#1E40AF' },
            off: { text: '⚪ Đang tạm nghỉ', bg: '#F1F5F9', color: '#64748B' }
          };
          const currentStatus = statusLabels[selectedDriver.status] || statusLabels.available;

          return (
            <div>
              {/* Navigation Top Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button
                  onClick={() => handleSelectDriverForDetail(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ArrowLeft size={18} /> Quay lại danh sách tài xế
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleOpenDriverModal(selectedDriver)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#006837',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(0,104,55,0.25)'
                    }}
                  >
                    <Edit size={16} /> Chỉnh sửa thông tin & Ảnh đại diện
                  </button>

                  <button
                    onClick={() => {
                      handleDeleteDriver(selectedDriver.id, selectedDriver.name);
                      handleSelectDriverForDetail(null);
                    }}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '10px',
                      border: '1px solid #FCA5A5',
                      background: '#FEF2F2',
                      color: '#EF4444',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={16} /> Xóa tài xế
                  </button>
                </div>
              </div>

              {/* Hero Driver Profile Card */}
              <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                  
                  {/* Avatar image with upload trigger overlay */}
                  <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '3px solid #006837', boxShadow: '0 4px 10px rgba(0,104,55,0.2)' }}>
                    {selectedDriver.avatar ? (
                      <img src={selectedDriver.avatar} alt={selectedDriver.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#006837', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '800' }}>
                        {selectedDriver.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleOpenDriverModal(selectedDriver)}
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(0,0,0,0.65)', color: '#FFF', border: 'none',
                        fontSize: '10px', padding: '4px 0', textAlign: 'center', cursor: 'pointer',
                        fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px'
                      }}
                      title="Bấm để đổi ảnh đại diện"
                    >
                      <Camera size={11} /> Đổi ảnh
                    </button>
                  </div>

                  {/* Profile Info */}
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                        {selectedDriver.name}
                      </h2>
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '16px', background: currentStatus.bg, color: currentStatus.color }}>
                        {currentStatus.text}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '10px', fontSize: '13.5px', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={15} style={{ color: '#006837' }} />
                        <strong>SĐT:</strong> <a href={`tel:${selectedDriver.phone}`} style={{ color: '#006837', fontWeight: 700 }}>{selectedDriver.phone}</a>
                      </div>

                      <div>
                        <strong>GPLX:</strong> {selectedDriver.licenseNumber ? `${selectedDriver.licenseNumber} (Hạng ${selectedDriver.licenseClass})` : 'Chưa cập nhật'}
                      </div>

                      <div>
                        <strong>Chiết khấu mặc định:</strong> <span style={{ color: '#D97706', fontWeight: 800 }}>{selectedDriver.commissionRate || 80}%</span>
                      </div>
                    </div>

                    {(assignedCar || selectedDriver.address || selectedDriver.notes) && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#64748B' }}>
                        {assignedCar && (
                          <div style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Car size={14} /> Xe đang phụ trách: <strong>{assignedCar.id} - {assignedCar.name}</strong>
                          </div>
                        )}
                        {selectedDriver.address && <div>📍 Địa chỉ: {selectedDriver.address}</div>}
                        {selectedDriver.notes && <div>📝 Ghi chú: {selectedDriver.notes}</div>}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Driver Performance KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                
                <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Tổng số chuyến xe</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
                    {driverOrders.length} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 400 }}>chuyến</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>Đã thanh toán {paidOrdersCount}/{driverOrders.length} đơn</div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Tổng quãng đường đã chạy</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#7C3AED', marginTop: '4px' }}>
                    {totalKm.toLocaleString('vi-VN')} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 400 }}>KM</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Tính theo Odometer đơn</div>
                </div>

                <div style={{ background: '#FEF3C7', padding: '16px 20px', borderRadius: '12px', border: '1px solid #F59E0B' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#B45309' }}>💰 Tổng Thu Nhập Tài Xế</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#D97706', marginTop: '4px' }}>
                    {totalDriverEarnings.toLocaleString('vi-VN')} ₫
                  </div>
                  <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>Thu nhập chiết khấu thực nhận</div>
                </div>

                <div style={{ background: '#ECFDF5', padding: '16px 20px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>🏢 Doanh Thu Mang Về Cty</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#006837', marginTop: '4px' }}>
                    {totalCompanyRevenue.toLocaleString('vi-VN')} ₫
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>Công ty thu về sau chiết khấu</div>
                </div>

              </div>

              {/* Trips & Service Orders History of Driver */}
              <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#006837" /> Lịch sử & Chi tiết Chuyến xe của Tài xế ({filteredDriverOrders.length})
                  </h3>

                  {/* Date filter for driver trips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Lọc theo ngày:</span>
                    <input
                      type="date"
                      value={driverPageDateFilter}
                      onChange={e => setDriverPageDateFilter(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                    {driverPageDateFilter && (
                      <button onClick={() => setDriverPageDateFilter('')} style={{ background: '#F1F5F9', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        Xóa lọc
                      </button>
                    )}
                  </div>
                </div>

                {filteredDriverOrders.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                    Tài xế này chưa có chuyến xe nào trong hệ thống!
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '12px 14px' }}>Mã đơn & Ngày</th>
                          <th style={{ padding: '12px 14px' }}>Xe chạy</th>
                          <th style={{ padding: '12px 14px' }}>Lộ trình di chuyển</th>
                          <th style={{ padding: '12px 14px' }}>Quãng đường</th>
                          <th style={{ padding: '12px 14px' }}>Cước thu khách</th>
                          <th style={{ padding: '12px 14px' }}>Chiết khấu Tài xế</th>
                          <th style={{ padding: '12px 14px' }}>Thanh toán</th>
                          <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDriverOrders.map(order => {
                          const dist = Math.max(0, order.endKm - order.startKm);
                          const commRate = order.driverCommissionRate || selectedDriver.commissionRate || 80;
                          const commAmount = order.driverCommissionAmount || Math.round(order.totalAmount * (commRate / 100));
                          const isPaid = order.paymentStatus === 'paid';

                          return (
                            <tr key={order.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <strong style={{ color: '#006837', fontSize: '14px' }}>{order.id}</strong>
                                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                                  {new Date(order.serviceDate).toLocaleString('vi-VN')}
                                </div>
                              </td>

                              <td style={{ padding: '12px 14px' }}>
                                <span className="license-plate" style={{ fontSize: '12px', padding: '2px 8px' }}>
                                  {order.carId}
                                </span>
                              </td>

                              <td style={{ padding: '12px 14px', maxWidth: '220px' }}>
                                {(order.pickupLocation || order.dropoffLocation) ? (
                                  <div>
                                    {order.pickupLocation && <div>📍 Đón: {order.pickupLocation}</div>}
                                    {order.dropoffLocation && <div>➔ Trả: {order.dropoffLocation}</div>}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94A3B8' }}>---</span>
                                )}
                              </td>

                              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#7C3AED' }}>
                                {dist} KM
                                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>({order.startKm} ➔ {order.endKm})</div>
                              </td>

                              <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0F172A' }}>
                                {order.totalAmount.toLocaleString('vi-VN')} ₫
                              </td>

                              <td style={{ padding: '12px 14px' }}>
                                <strong style={{ color: '#D97706', fontSize: '14px' }}>{commAmount.toLocaleString('vi-VN')} ₫</strong>
                                <div style={{ fontSize: '11px', color: '#B45309' }}>Tỷ lệ: {commRate}%</div>
                              </td>

                              <td style={{ padding: '12px 14px' }}>
                                <button
                                  onClick={() => toggleServiceOrderPayment(order.id)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isPaid ? '#DCFCE7' : '#FEE2E2',
                                    color: isPaid ? '#15803D' : '#991B1B'
                                  }}
                                >
                                  {isPaid ? '🟢 ĐÃ THANH TOÁN' : '🔴 CHƯA THANH TOÁN'}
                                </button>
                              </td>

                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleOpenQuoteModal(order)}
                                  style={{ padding: '6px 12px', background: '#006837', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Eye size={13} /> Xem đơn & Gửi báo giá
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          );
        })()
      ) : (
        <>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Quản lý Đơn Dịch vụ & Tài xế
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
              Thuê Dịch Vụ
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Tính cước KM & Chiết khấu % tài xế - Hỗ trợ xem đơn & chụp ảnh phiếu báo giá gửi Zalo/SMS cho khách
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'orders' ? (
            <button 
              onClick={() => handleOpenOrderModal()} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600 }}
            >
              <Plus size={18} />
              Tạo đơn dịch vụ mới
            </button>
          ) : (
            <button 
              onClick={() => handleOpenDriverModal()} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600 }}
            >
              <UserPlus size={18} />
              Thêm tài xế mới
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {/* Total Orders */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Tổng Đơn Dịch vụ</span>
            <div style={{ background: '#EFF6FF', color: '#2563EB', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '10px' }}>{totalOrdersCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>chuyến</span></div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 500 }}>Vận hành liên tục</div>
        </div>

        {/* Total Revenue */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Tổng Doanh Thu Cước</span>
            <div style={{ background: '#ECFDF5', color: '#059669', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '10px' }}>{totalRevenue.toLocaleString('vi-VN')} đ</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Tổng cước thu từ khách</div>
        </div>

        {/* Total Driver Earnings */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Chiết Khấu Tài Xế Nhận</span>
            <div style={{ background: '#FEF3C7', color: '#D97706', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706', marginTop: '10px' }}>{totalDriverEarnings.toLocaleString('vi-VN')} đ</div>
          <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', fontWeight: 500 }}>
            Thu nhập tài xế
          </div>
        </div>

        {/* Total KM Served */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Tổng KM Phục Vụ</span>
            <div style={{ background: '#F5F3FF', color: '#7C3AED', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#7C3AED', marginTop: '10px' }}>{totalKmServed.toLocaleString('vi-VN')} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>KM</span></div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Đồng hồ KM thực tế</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '20px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: activeTab === 'orders' ? '700' : '500',
            color: activeTab === 'orders' ? 'var(--primary, #006837)' : '#64748B',
            borderBottom: activeTab === 'orders' ? '3px solid var(--primary, #006837)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={18} />
          Danh sách Đơn Dịch vụ ({serviceOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: activeTab === 'drivers' ? '700' : '500',
            color: activeTab === 'drivers' ? 'var(--primary, #006837)' : '#64748B',
            borderBottom: activeTab === 'drivers' ? '3px solid var(--primary, #006837)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <UserCheck size={18} />
          Đội ngũ Tài xế ({drivers.length})
        </button>
      </div>

      {/* TAB 1: SERVICE ORDERS LIST */}
      {activeTab === 'orders' && (
        <>
          {selectedOrderIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,104,55,0.08)', border: '1px solid var(--primary)', padding: '12px 24px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                Đã chọn {selectedOrderIds.length} đơn dịch vụ tài xế
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={() => {
                    if (window.confirm(`Đánh dấu ĐÃ THANH TOÁN hàng loạt cho ${selectedOrderIds.length} đơn đã chọn?`)) {
                      selectedOrderIds.forEach(id => updateServiceOrder(id, { paymentStatus: 'paid' }));
                      setSelectedOrderIds([]);
                      showToast('Đã cập nhật trạng thái thanh toán hàng loạt!', 'success');
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 14px', borderRadius: '8px' }}
                >
                  Đánh dấu Đã thanh toán
                </button>
                <button 
                  onClick={() => {
                    const pct = window.prompt("Nhập tỷ lệ chiết khấu (%) mới cho các đơn đã chọn (từ 0 đến 100):");
                    if (pct !== null && !isNaN(Number(pct))) {
                      selectedOrderIds.forEach(id => {
                        const order = serviceOrders.find(o => o.id === id);
                        if (order) {
                          const distance = Math.max(0, order.endKm - order.startKm);
                          const calculatedFare = Math.round(distance * order.pricePerKm + (order.extraFee || 0));
                          const newCommAmount = Math.round(calculatedFare * (Number(pct) / 100));
                          updateServiceOrder(id, { 
                            driverCommissionRate: Number(pct),
                            driverCommissionAmount: newCommAmount
                          });
                        }
                      });
                      setSelectedOrderIds([]);
                      showToast('Đã sửa chiết khấu hàng loạt!', 'success');
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 14px', borderRadius: '8px' }}
                >
                  Sửa chiết khấu hàng loạt
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedOrderIds.length} đơn dịch vụ đã chọn?`)) {
                      selectedOrderIds.forEach(id => deleteServiceOrder(id));
                      setSelectedOrderIds([]);
                      showToast('Đã xóa hàng loạt đơn dịch vụ thành công!', 'success');
                    }
                  }}
                  className="btn btn-secondary" 
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', gap: '6px', padding: '6px 14px', borderRadius: '8px' }}
                >
                  <Trash2 size={15} /> Xóa hàng loạt
                </button>
                <button onClick={() => setSelectedOrderIds([])} className="btn-ghost" style={{ fontSize: '14px', padding: '6px 12px' }}>
                  Hủy chọn
                </button>
              </div>
            </div>
          )}

          {/* Controls & Filter Bar */}
          <div style={{ 
            background: '#FFFFFF', 
            padding: '16px', 
            borderRadius: '12px', 
            border: '1px solid #E2E8F0', 
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Tìm mã đơn, tài xế, điểm đón, điểm trả, biển số xe..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Payment Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={15} style={{ color: '#64748B' }} />
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">Tất cả thanh toán</option>
                  <option value="paid">✅ Đã thanh toán</option>
                  <option value="unpaid">⏳ Chưa thanh toán</option>
                </select>
              </div>

              {/* Car Filter */}
              <select
                value={carFilter}
                onChange={e => setCarFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: '#F8FAFC',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Tất cả xe đội xe</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Table - Desktop */}
          <div className="card desktop-only-table" style={{ padding: 0, overflowX: 'auto', width: '100%', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                <Compass size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Chưa có đơn dịch vụ nào khớp với bộ lọc</p>
                <button 
                  onClick={() => handleOpenOrderModal()}
                  className="btn btn-primary" 
                  style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
                >
                  <Plus size={16} /> Tạo đơn dịch vụ đầu tiên
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds(filteredOrders.map(o => o.id));
                            } else {
                              setSelectedOrderIds([]);
                            }
                          }}
                        />
                      </th>
                      <th style={{ padding: '10px 12px' }}>Mã Đơn / Ngày</th>
                      <th style={{ padding: '10px 12px' }}>Tài Xế Phụ Trách</th>
                      <th style={{ padding: '10px 12px' }}>Xe Sử Dụng</th>
                      <th style={{ padding: '10px 12px' }}>Điểm Đón / Trả Khách</th>
                      <th style={{ padding: '10px 12px' }}>Số KM & Đơn Giá</th>
                      <th style={{ padding: '10px 12px' }}>Tổng Cước Phí</th>
                      <th style={{ padding: '10px 12px' }}>Chiết Khấu (%)</th>
                      <th style={{ padding: '10px 12px' }}>Thanh Toán</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => {
                      const carObj = cars.find(c => c.id === order.carId);
                      const driverObj = drivers.find(d => d.id === order.driverId);
                      const distance = Math.max(0, order.endKm - order.startKm);
                      const isPaid = order.paymentStatus === 'paid';
                      const commRate = order.driverCommissionRate !== undefined ? order.driverCommissionRate : 80;
                      const commAmount = order.driverCommissionAmount || Math.round(order.totalAmount * (commRate / 100));

                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={selectedOrderIds.includes(order.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrderIds(prev => [...prev, order.id]);
                                } else {
                                  setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                                }
                              }}
                            />
                          </td>
                          
                          {/* Order ID & Date */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>{order.id}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                              <Clock size={12} />
                              {order.serviceDate ? new Date(order.serviceDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '---'}
                            </div>
                          </td>

                          {/* Driver */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ background: '#F1F5F9', padding: '5px', borderRadius: '6px', color: '#334155' }}>
                                <UserCheck size={14} />
                              </div>
                              <div>
                                <div 
                                  onClick={() => driverObj && handleSelectDriverForDetail(driverObj.id)}
                                  style={{ fontWeight: 700, color: '#006837', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}
                                  title="Bấm để mở trang chi tiết tài xế"
                                >
                                  {order.driverName}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748B' }}>SĐT: {order.driverPhone}</div>
                              </div>
                            </div>
                          </td>

                          {/* Car */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#059669', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', width: 'fit-content', border: '1px solid #A7F3D0', fontWeight: 700 }}
                              title={carObj?.name || order.carId}
                            >
                              <Car size={13} />
                              <span>{order.carId}</span>
                            </div>
                          </td>

                          {/* Pickup & Dropoff Route */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: '200px' }}>
                            {(order.pickupLocation || order.dropoffLocation) ? (
                              <div>
                                {order.pickupLocation && (
                                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={12} style={{ color: '#EF4444', flexShrink: 0 }} />
                                    <span>{order.pickupLocation}</span>
                                  </div>
                                )}
                                {order.dropoffLocation && (
                                  <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <ArrowRight size={11} style={{ flexShrink: 0 }} />
                                    <span>{order.dropoffLocation}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>Khách tự do</span>
                            )}
                          </td>

                          {/* KM & Pricing detail */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                              {distance} KM <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>({order.startKm} ➔ {order.endKm})</span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                              Giá: <strong>{order.pricePerKm.toLocaleString('vi-VN')} đ/KM</strong>
                            </div>
                            {order.extraFee > 0 && (
                              <div style={{ fontSize: '11px', color: '#D97706', marginTop: '1px' }}>
                                + Phụ phí: {order.extraFee.toLocaleString('vi-VN')} đ
                              </div>
                            )}
                          </td>

                          {/* Total Fare */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#006837' }}>
                              {order.totalAmount.toLocaleString('vi-VN')} đ
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                              Cước chuyến đi
                            </div>
                          </td>

                          {/* Driver Commission Details */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '5px', fontSize: '11px', fontWeight: 700 }}>
                              <Percent size={11} /> {commRate}%
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>
                              Tài xế: {commAmount.toLocaleString('vi-VN')} đ
                            </div>
                          </td>

                          {/* Payment status badge & toggle */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <button
                              onClick={() => toggleServiceOrderPayment(order.id)}
                              title="Bấm để đổi trạng thái thanh toán"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: isPaid ? '#DCFCE7' : '#FEE2E2',
                                color: isPaid ? '#15803D' : '#991B1B'
                              }}
                            >
                              {isPaid ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                              {isPaid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenQuoteModal(order)}
                                style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Xem đơn & Gửi báo giá cho khách"
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                onClick={() => handleOpenOrderModal(order)}
                                style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#475569' }}
                                title="Chỉnh sửa đơn"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                style={{ background: '#FEF2F2', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#EF4444' }}
                                title="Xóa đơn"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders Cards - Mobile View */}
          <div className="mobile-only-cards">
            {filteredOrders.length === 0 ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Chưa có đơn dịch vụ nào khớp với bộ lọc.
              </div>
            ) : (
              filteredOrders.map(order => {
                const distance = Math.max(0, order.endKm - order.startKm);
                const isPaid = order.paymentStatus === 'paid';
                const commRate = order.driverCommissionRate !== undefined ? order.driverCommissionRate : 80;
                const commAmount = order.driverCommissionAmount || Math.round(order.totalAmount * (commRate / 100));

                return (
                  <div key={order.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-strong)', background: 'white' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds(prev => [...prev, order.id]);
                            } else {
                              setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                            }
                          }}
                        />
                        <strong className="font-mono" style={{ fontSize: '15px', color: 'var(--primary)' }}>{order.id}</strong>
                        <span className="license-plate font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>{order.carId}</span>
                      </div>

                      <button
                        onClick={() => toggleServiceOrderPayment(order.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: isPaid ? '#DCFCE7' : '#FEE2E2',
                          color: isPaid ? '#15803D' : '#991B1B'
                        }}
                      >
                        {isPaid ? '🟢 ĐÃ THANH TOÁN' : '🔴 CHƯA THANH TOÁN'}
                      </button>
                    </div>

                    {/* Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                      <div>👤 Tài xế: <strong>{order.driverName}</strong> ({order.driverPhone})</div>
                      {order.customerName && order.customerName !== 'Tài xế tự bắt khách' && (
                        <div>🙋 Khách hàng: <strong>{order.customerName}</strong> ({order.customerPhone})</div>
                      )}
                      {(order.pickupLocation || order.dropoffLocation) && (
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          📍 Lộ trình: {order.pickupLocation || '---'} ➔ {order.dropoffLocation || '---'}
                        </div>
                      )}
                      <div>📏 Quãng đường: <strong>{distance} KM</strong> ({order.startKm} ➔ {order.endKm} km)</div>
                      <div>💰 Cước chuyến đi: <strong style={{ color: '#006837', fontSize: '15px' }}>{order.totalAmount.toLocaleString('vi-VN')} ₫</strong></div>
                      <div style={{ fontSize: '12px', color: '#D97706' }}>🏷️ Chiết khấu tài xế ({commRate}%): <strong>{commAmount.toLocaleString('vi-VN')} ₫</strong></div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenQuoteModal(order)}
                        style={{ width: '100%', padding: '10px', background: '#006837', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                      >
                        <Eye size={16} /> Xem đơn & Gửi báo giá cho khách
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenOrderModal(order)}
                          style={{ flex: 1, padding: '8px', background: 'var(--bg-page)', color: 'var(--text-main)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                        >
                          <Edit size={14} /> Chỉnh sửa đơn
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          style={{ padding: '8px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 2: DRIVER MANAGEMENT */}
      {activeTab === 'drivers' && (
        <div>
          {/* Driver Search */}
          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Tìm tên tài xế, SĐT, số bằng lái..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Drivers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredDrivers.map(driver => {
              const statusLabels = {
                available: { text: '🟢 Sẵn sàng', bg: '#DCFCE7', color: '#15803D' },
                on_trip: { text: '🔵 Đang trên chuyến', bg: '#DBEAFE', color: '#1E40AF' },
                off: { text: '⚪ Đang nghỉ', bg: '#F1F5F9', color: '#64748B' }
              };
              const statusInfo = statusLabels[driver.status] || statusLabels.available;
              const assignedCar = cars.find(c => c.id === driver.assignedCarId);

              // Calculated driver metrics
              const driverOrders = serviceOrders.filter(o => o.driverId === driver.id || o.driverName === driver.name);
              const driverEarnings = driverOrders.reduce((s, o) => s + (o.driverCommissionAmount || Math.round(o.totalAmount * 0.8)), 0);
              const driverKm = driverOrders.reduce((s, o) => s + Math.max(0, o.endKm - o.startKm), 0);

              return (
                <div key={driver.id} style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#006837', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', flexShrink: 0, overflow: 'hidden' }}>
                      {driver.avatar ? (
                        <img src={driver.avatar} alt={driver.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        driver.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: '#0F172A' }}>{driver.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={12} /> {driver.phone}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      background: statusInfo.bg,
                      color: statusInfo.color
                    }}>
                      {statusInfo.text}
                    </span>
                  </div>

                  {/* Driver Mini Stats */}
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Số đơn</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{driverOrders.length}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Tổng KM</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#7C3AED' }}>{driverKm} km</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Thu nhập nhận</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#D97706' }}>{(driverEarnings / 1000).toLocaleString('vi-VN')}k</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '8px 0', margin: '8px 0', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>GPLX:</strong> {driver.licenseNumber} (Hạng {driver.licenseClass})</div>
                    <div><strong>Chiết khấu mặc định:</strong> <span style={{ color: '#D97706', fontWeight: 700 }}>{driver.commissionRate || 80}%</span></div>
                    {assignedCar && (
                      <div style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Car size={13} /> Xe phụ trách: <strong>{assignedCar.id} - {assignedCar.name}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '12px' }}>
                    {/* Dedicated Driver Detail Page Button */}
                    <button
                      onClick={() => handleSelectDriverForDetail(driver.id)}
                      style={{ flex: 1, padding: '7px 10px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <BarChart2 size={14} /> Thống kê & Hóa đơn
                    </button>
                    
                    <button
                      onClick={() => handleOpenDriverModal(driver)}
                      style={{ padding: '7px 10px', background: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                      title="Sửa thông tin & Ảnh"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteDriver(driver.id, driver.name)}
                      style={{ padding: '7px 10px', background: '#FEF2F2', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}
                      title="Xóa tài xế"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}

      {/* MODAL 1: CREATE / EDIT SERVICE ORDER */}
      {showOrderModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '750px',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#FFF', zIndex: 10 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {editingOrder ? `Chỉnh sửa Đơn dịch vụ ${editingOrder.id}` : 'Tạo Đơn Dịch vụ Mới'}
              </h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} style={{ padding: '24px' }}>
              
              {/* Step 1: Search & Select Vehicle & Driver */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', color: '#006837', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', margin: 0 }}>
                  1. Chọn Xe & Tài Xế Phục Vụ
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                  
                  {/* Searchable Vehicle Selection */}
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#1E293B' }}>
                      🚗 Chọn Xe từ Đội xe *
                    </label>

                    <div style={{ position: 'relative', marginBottom: '6px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="text"
                        placeholder="Tìm biển số, tên xe..."
                        value={modalCarSearch}
                        onChange={e => setModalCarSearch(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px 6px 30px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <select
                      value={orderForm.carId}
                      onChange={e => handleCarSelectChange(e.target.value)}
                      required
                      size={modalCarSearch ? 4 : 1}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFF' }}
                    >
                      <option value="">-- Chọn xe --</option>
                      {modalFilteredCars.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.id} - {c.name} ({c.km.toLocaleString('vi-VN')} KM)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Searchable Driver Selection */}
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                        👤 Chọn Tài xế *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickCreateDriver(!isQuickCreateDriver)}
                        style={{ background: 'none', border: 'none', color: '#006837', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {isQuickCreateDriver ? '← Chọn sẵn' : '+ Tạo mới'}
                      </button>
                    </div>

                    {!isQuickCreateDriver ? (
                      <>
                        <div style={{ position: 'relative', marginBottom: '6px' }}>
                          <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                          <input
                            type="text"
                            placeholder="Tìm tên, SĐT tài xế..."
                            value={modalDriverSearch}
                            onChange={e => setModalDriverSearch(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px 6px 30px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <select
                          value={orderForm.driverId}
                          onChange={e => handleDriverSelectChange(e.target.value)}
                          required
                          size={modalDriverSearch ? 4 : 1}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFF' }}
                        >
                          <option value="">-- Chọn tài xế --</option>
                          {modalFilteredDrivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} - {d.phone} (Chiết khấu {d.commissionRate || 80}%)
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <div style={{ background: '#FFF', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#006837', marginBottom: '6px' }}>⚡ Tạo Nhanh Tài Xế</div>
                        <input
                          type="text"
                          placeholder="Họ tên *"
                          value={orderForm.quickDriverName}
                          onChange={e => setOrderForm({ ...orderForm, quickDriverName: e.target.value })}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', marginBottom: '4px', boxSizing: 'border-box' }}
                        />
                        <input
                          type="text"
                          placeholder="SĐT *"
                          value={orderForm.quickDriverPhone}
                          onChange={e => setOrderForm({ ...orderForm, quickDriverPhone: e.target.value })}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Step 2: Pickup & Dropoff Location */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', color: '#006837', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', margin: 0 }}>
                  2. Điểm Đón Khách & Điểm Trả Khách
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>📍 Điểm Đón Khách</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Sân bay Tân Sơn Nhất / 123 Nguyễn Trãi..."
                      value={orderForm.pickupLocation}
                      onChange={e => setOrderForm({ ...orderForm, pickupLocation: e.target.value })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>🏁 Điểm Trả Khách</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Khách sạn Rex / TP Vũng Tàu..."
                      value={orderForm.dropoffLocation}
                      onChange={e => setOrderForm({ ...orderForm, dropoffLocation: e.target.value })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Odometer & Dynamic Pricing */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', color: '#006837', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', margin: 0 }}>
                  3. Số KM Bắt đầu / Kết thúc & Chiết Khấu Tài Xế (%)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Số KM Bắt đầu *</label>
                    <input
                      type="number"
                      required
                      value={orderForm.startKm}
                      onChange={e => setOrderForm({ ...orderForm, startKm: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Số KM Kết thúc *</label>
                    <input
                      type="number"
                      required
                      value={orderForm.endKm}
                      onChange={e => setOrderForm({ ...orderForm, endKm: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Giá Tiền / KM (đ) *</label>
                    <input
                      type="number"
                      required
                      step="500"
                      value={orderForm.pricePerKm}
                      onChange={e => setOrderForm({ ...orderForm, pricePerKm: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700, color: '#006837', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Quick Price Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Gợi ý đơn giá:</span>
                  {[12000, 14000, 15000, 18000, 20000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, pricePerKm: val })}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        background: orderForm.pricePerKm === val ? '#ECFDF5' : '#FFF',
                        color: orderForm.pricePerKm === val ? '#059669' : '#475569',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: orderForm.pricePerKm === val ? 700 : 400
                      }}
                    >
                      {val.toLocaleString('vi-VN')} đ/km
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Phụ phí phát sinh</label>
                    <input
                      type="number"
                      placeholder="Vé trạm, cầu đường..."
                      value={orderForm.extraFee}
                      onChange={e => setOrderForm({ ...orderForm, extraFee: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#D97706' }}>
                      🔥 Chiết Khấu Tài Xế (%) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={orderForm.driverCommissionRate}
                      onChange={e => setOrderForm({ ...orderForm, driverCommissionRate: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #F59E0B', fontSize: '14px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Trạng thái Thanh toán *</label>
                    <select
                      value={orderForm.paymentStatus}
                      onChange={e => setOrderForm({ ...orderForm, paymentStatus: e.target.value as any })}
                      style={{ 
                        width: '100%', padding: '9px', borderRadius: '8px', 
                        border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700,
                        background: orderForm.paymentStatus === 'paid' ? '#DCFCE7' : '#FEE2E2',
                        color: orderForm.paymentStatus === 'paid' ? '#15803D' : '#991B1B'
                      }}
                    >
                      <option value="unpaid">⏳ Chưa thanh toán (Công nợ)</option>
                      <option value="paid">✅ Đã thanh toán</option>
                    </select>
                  </div>
                </div>

                {/* Quick Commission % Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 600 }}>Gợi ý Chiết khấu Tài xế:</span>
                  {[70, 75, 80, 85, 90].map(rateVal => (
                    <button
                      key={rateVal}
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, driverCommissionRate: rateVal })}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #F59E0B',
                        background: orderForm.driverCommissionRate === rateVal ? '#FEF3C7' : '#FFF',
                        color: orderForm.driverCommissionRate === rateVal ? '#B45309' : '#475569',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: orderForm.driverCommissionRate === rateVal ? 700 : 400
                      }}
                    >
                      {rateVal}%
                    </button>
                  ))}
                </div>

                {/* Fare & Commission Breakdown Box */}
                {(() => {
                  const dist = Math.max(0, orderForm.endKm - orderForm.startKm);
                  const totalFare = Math.round(dist * orderForm.pricePerKm + Number(orderForm.extraFee));
                  const driverShare = Math.round(totalFare * (orderForm.driverCommissionRate / 100));
                  const companyShare = totalFare - driverShare;

                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #FEF3C7, #ECFDF5)',
                      border: '1px solid #FDE68A',
                      borderRadius: '12px',
                      padding: '16px',
                      marginTop: '16px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ background: '#FFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>TỔNG CƯỚC THU KHÁCH</div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginTop: '2px' }}>
                          {totalFare.toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>({dist} KM x {orderForm.pricePerKm.toLocaleString('vi-VN')}đ)</div>
                      </div>

                      <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '8px', border: '1px solid #F59E0B' }}>
                        <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 700 }}>💰 THU NHẬP TÀI XẾ ({orderForm.driverCommissionRate}%)</div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#D97706', marginTop: '2px' }}>
                          {driverShare.toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '11px', color: '#B45309' }}>Chiết khấu nhận được</div>
                      </div>

                      <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>🏢 DOANH THU CÔNG TY ({100 - orderForm.driverCommissionRate}%)</div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#006837', marginTop: '2px' }}>
                          {companyShare.toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '11px', color: '#059669' }}>Công ty giữ lại</div>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Step 4: Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Ghi chú đơn hàng</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về chuyến đi..."
                  value={orderForm.notes}
                  onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '14px' }}
                >
                  {editingOrder ? 'Cập nhật đơn' : 'Xác nhận tạo đơn'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DRIVER ADD / EDIT (With Avatar Image Upload Button) */}
      {showDriverModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '550px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {editingDriver ? `Cập nhật thông tin Tài xế` : 'Thêm Tài Xế Mới'}
              </h3>
              <button onClick={() => setShowDriverModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} style={{ padding: '24px' }}>
              
              {/* Driver Avatar Upload Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#006837', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', flexShrink: 0, overflow: 'hidden', border: '2px solid #059669', boxShadow: '0 2px 6px rgba(0,104,55,0.2)' }}>
                  {driverForm.avatar ? (
                    <img src={driverForm.avatar} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (driverForm.name ? driverForm.name.slice(0, 1).toUpperCase() : '👤')
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    📸 Ảnh Đại Diện Tài Xế
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{
                      padding: '7px 14px', background: '#006837', color: '#FFF', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,104,55,0.2)'
                    }}>
                      <Upload size={14} /> Tải ảnh đại diện
                      <input type="file" accept="image/*" onChange={handleAvatarFileChange} style={{ display: 'none' }} />
                    </label>
                    {driverForm.avatar && (
                      <button
                        type="button"
                        onClick={() => setDriverForm({ ...driverForm, avatar: '' })}
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Phạm Quốc Hùng"
                    value={driverForm.name}
                    onChange={e => setDriverForm({ ...driverForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="0912..."
                    value={driverForm.phone}
                    onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Số bằng lái (GPLX)</label>
                  <input
                    type="text"
                    placeholder="GPLX-790..."
                    value={driverForm.licenseNumber}
                    onChange={e => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Hạng bằng lái</label>
                  <select
                    value={driverForm.licenseClass}
                    onChange={e => setDriverForm({ ...driverForm, licenseClass: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="B2">B2 (Ô tô đến 9 chỗ)</option>
                    <option value="C">C (Xe tải / ô tô)</option>
                    <option value="D">D (Khách từ 10-30 chỗ)</option>
                    <option value="E">E (Khách trên 30 chỗ)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Trạng thái hoạt động</label>
                  <select
                    value={driverForm.status}
                    onChange={e => setDriverForm({ ...driverForm, status: e.target.value as any })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="available">🟢 Sẵn sàng</option>
                    <option value="on_trip">🔵 Đang trên chuyến</option>
                    <option value="off">⚪ Đang nghỉ</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#D97706' }}>Chiết khấu mặc định (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={driverForm.commissionRate}
                    onChange={e => setDriverForm({ ...driverForm, commissionRate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #F59E0B', fontSize: '14px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Xe phụ trách (Nếu có)</label>
                  <select
                    value={driverForm.assignedCarId}
                    onChange={e => setDriverForm({ ...driverForm, assignedCarId: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Không cố định xe</option>
                    {cars.map(c => (
                      <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Địa chỉ tạm trú / cư trú</label>
                <input
                  type="text"
                  placeholder="Địa chỉ nhà..."
                  value={driverForm.address}
                  onChange={e => setDriverForm({ ...driverForm, address: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Ghi chú tài xế</label>
                <textarea
                  rows={2}
                  placeholder="Kinh nghiệm, kỹ năng..."
                  value={driverForm.notes}
                  onChange={e => setDriverForm({ ...driverForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '14px' }}
                >
                  {editingDriver ? 'Cập nhật tài xế' : 'Lưu tài xế mới'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ORDER QUOTE & RECEIPT MODAL ("XEM ĐƠN & GỬI BÁO GIÁ CHO KHÁCH") */}
      {showQuoteModal && quoteOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '640px',
            maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.3)',
            border: '1px solid #E2E8F0'
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={22} style={{ color: '#006837' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  Phiếu Báo Giá & Chi Tiết Đơn Dịch Vụ
                </h3>
              </div>
              <button onClick={() => setShowQuoteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              
              {/* Target Container for HTML2Canvas Image Capture */}
              <div id="quote-receipt-card" style={{ background: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                
                {/* Receipt Header Banner */}
                <div style={{ background: 'linear-gradient(135deg, #006837, #059669)', color: '#FFF', padding: '20px', borderRadius: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>BÁO GIÁ CƯỚC CHUYẾN ĐI</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '2px' }}>{quoteOrder.id}</div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> {quoteOrder.serviceDate ? new Date(quoteOrder.serviceDate).toLocaleString('vi-VN') : '---'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      background: quoteOrder.paymentStatus === 'paid' ? '#DCFCE7' : '#FEE2E2', 
                      color: quoteOrder.paymentStatus === 'paid' ? '#15803D' : '#991B1B', 
                      fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px' 
                    }}>
                      {quoteOrder.paymentStatus === 'paid' ? '✅ ĐÃ THANH TOÁN' : '⏳ CHƯA THANH TOÁN'}
                    </span>
                  </div>
                </div>

                {/* Vehicle & Driver Box */}
                {(() => {
                  const carObj = cars.find(c => c.id === quoteOrder.carId);
                  const distance = Math.max(0, quoteOrder.endKm - quoteOrder.startKm);
                  
                  return (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                        <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>🚗 THÔNG TIN XE</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{quoteOrder.carId}</div>
                          <div style={{ fontSize: '13px', color: '#334155' }}>{carObj?.name || 'Xe hợp đồng'}</div>
                        </div>

                        <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>👤 TÀI XẾ PHỤ TRÁCH</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{quoteOrder.driverName}</div>
                          <div style={{ fontSize: '13px', color: '#334155' }}>SĐT: {quoteOrder.driverPhone}</div>
                        </div>
                      </div>

                      {/* Route Info */}
                      {(quoteOrder.pickupLocation || quoteOrder.dropoffLocation) && (
                        <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>📍 HÀNH TRÌNH CHUYẾN ĐI</div>
                          {quoteOrder.pickupLocation && (
                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={14} style={{ color: '#EF4444' }} /> Điểm đón: {quoteOrder.pickupLocation}
                            </div>
                          )}
                          {quoteOrder.dropoffLocation && (
                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <ArrowRight size={14} style={{ color: '#2563EB' }} /> Điểm trả: {quoteOrder.dropoffLocation}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fare Calculation Table */}
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#F1F5F9', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                              <th style={{ padding: '10px 14px' }}>Hạng mục tính cước</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Chi tiết & Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 14px' }}>
                                <strong>Quãng đường di chuyển (Odometer)</strong>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>KM bắt đầu: {quoteOrder.startKm} ➔ KM kết thúc: {quoteOrder.endKm}</div>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                                {distance} KM
                              </td>
                            </tr>

                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 14px' }}>Đơn giá cước di chuyển trên từng KM</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                                {quoteOrder.pricePerKm.toLocaleString('vi-VN')} đ/KM
                              </td>
                            </tr>

                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 14px' }}>Tiền cước di chuyển ({distance} KM x {quoteOrder.pricePerKm.toLocaleString('vi-VN')}đ)</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                                {(distance * quoteOrder.pricePerKm).toLocaleString('vi-VN')} đ
                              </td>
                            </tr>

                            {quoteOrder.extraFee > 0 && (
                              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '10px 14px' }}>Phụ phí phát sinh (vé trạm, bến bãi...)</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#D97706' }}>
                                  + {quoteOrder.extraFee.toLocaleString('vi-VN')} đ
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        {/* Total Amount Box */}
                        <div style={{ background: '#ECFDF5', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #A7F3D0' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#047857' }}>TỔNG TIỀN CƯỚC THANH TOÁN</div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: '#006837' }}>
                            {quoteOrder.totalAmount.toLocaleString('vi-VN')} VNĐ
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}

              </div>

              {/* Action Toolbar Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                
                {/* 1. Copy Formatted Text */}
                <button
                  onClick={handleCopyQuoteText}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: copiedQuote ? '#DCFCE7' : '#FFFFFF',
                    color: copiedQuote ? '#15803D' : '#334155',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copiedQuote ? <Check size={16} /> : <Copy size={16} />}
                  {copiedQuote ? 'Đã sao chép chữ!' : 'Sao chép Chữ Zalo'}
                </button>

                {/* 2. Copy Image (PNG) directly onto Clipboard */}
                <button
                  onClick={() => handleCaptureQuoteImage('copy')}
                  disabled={isCapturingImage}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #006837, #059669)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isCapturingImage ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0,104,55,0.25)'
                  }}
                >
                  <Camera size={16} />
                  {isCapturingImage ? 'Đang chụp ảnh...' : '📸 Chụp & Sao chép Ảnh Zalo (Ctrl+V)'}
                </button>

                {/* 3. Download Image (PNG) File */}
                <button
                  onClick={() => handleCaptureQuoteImage('download')}
                  disabled={isCapturingImage}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid #059669',
                    background: '#ECFDF5',
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isCapturingImage ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ImageIcon size={16} />
                  Tải Ảnh PNG
                </button>

                {/* 4. Print Quote */}
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={16} />
                  In Phiếu
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
