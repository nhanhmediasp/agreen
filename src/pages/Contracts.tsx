import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Table, Tag, Modal, Form } from 'antd';
import { Plus, X, Search, ArrowLeft, ShieldAlert, FileText, Edit, Trash, FileCheck, Eye, Filter, Calendar, Clock, Camera, Upload, DollarSign, Image as ImageIcon } from 'lucide-react';
import { useApp, type Rental, type Violation } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';
import { Pagination } from '../components/Pagination';

const calculateDuration = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return '1 ngày';
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '1 ngày';
  
  const diffMs = Math.max(0, +end - +start);
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;

  if (days === 0) return `${hours || 1} giờ`;
  if (hours === 0) return `${days} ngày`;
  return `${days} ngày ${hours}h`;
};

const LiveCountdown = ({ endDateStr }: { endDateStr: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endDateStr) - +new Date();
      if (difference <= 0) return 'Đã quá hạn trả xe!';

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [endDateStr]);

  return <span className="font-mono">{timeLeft}</span>;
};

const Contracts = () => {
  const { rentals, updateRental, deleteRental, showToast, cars, owners } = useApp();
  const [selectedRentalIds, setSelectedRentalIds] = useState<string[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryMode, setGalleryMode] = useState<'contract' | 'evidence' | 'condition'>('contract');
  
  // Selected Contract for viewing or editing
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDetailRentalId = searchParams.get('id');
  const setSelectedDetailRentalId = (id: string | null) => {
    if (id) {
      setSearchParams({ id });
    } else {
      setSearchParams({});
    }
  };
  // Search & Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'all' | '7d' | '30d' | 'custom'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // KPI Statistics for Contracts
  const totalContractsCount = rentals.length;
  const totalContractRevenue = rentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const activeContractsCount = rentals.filter(r => r.status === 'active').length;
  const paidContractsCount = rentals.filter(r => r.paymentStatus === 'paid').length;

  // Edit Form State (Main Modal)
  const [editId, setEditId] = useState('');
  const [editCarId, setEditCarId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editFile, setEditFile] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<Rental['paymentStatus']>('paid');
  const [editStatus, setEditStatus] = useState<Rental['status']>('completed');
  const [editStartKm, setEditStartKm] = useState('0');
  const [editEndKm, setEditEndKm] = useState('0');

  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationEditId, setViolationEditId] = useState<string | null>(null);
  const [violationDesc, setViolationDesc] = useState('');
  const [violationDate, setViolationDate] = useState('');
  const [violationAmount, setViolationAmount] = useState('');
  const [violationEvidence, setViolationEvidence] = useState('');
  const [violationStatus, setViolationStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const handleUploadConditionFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedDetailRental) return;
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
          const updatedImages = [...(selectedDetailRental.conditionImages || []), ...newUrls];
          updateRental(selectedDetailRental.id, { conditionImages: updatedImages });
          showToast(`Đã tải lên thành công ${files.length} hình ảnh trạng thái xe thực tế!`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteConditionImage = (imgUrl: string) => {
    if (!selectedDetailRental) return;
    const updatedImages = (selectedDetailRental.conditionImages || []).filter(img => img !== imgUrl);
    updateRental(selectedDetailRental.id, { conditionImages: updatedImages });
    showToast('Đã xóa hình ảnh trạng thái xe!', 'info');
  };

  const handleUploadContractFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedDetailRental) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        updateRental(selectedDetailRental.id, { 
          source: 'uploaded', 
          fileUrl: evt.target.result as string 
        });
        showToast('Đã tải lên tệp hợp đồng thủ công thành công!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const normalizePlate = (str: string) => str ? str.toUpperCase().replace(/[-. ]/g, '') : '';
  const normalizePhone = (str: string) => str ? str.replace(/\D/g, '') : '';
  const selectedDetailRental = rentals.find(r => r.id === selectedDetailRentalId);
  const carObj = selectedDetailRental ? cars.find(c => normalizePlate(c.id) === normalizePlate(selectedDetailRental.carId)) : null;
  const ownerObj = carObj ? owners.find(o => normalizePhone(o.phone) === normalizePhone(carObj.ownerPhone)) : null;

  const filteredRentals = rentals.filter(r => {
    const matchesSearch = 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.carId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : r.status === statusFilter;

    let matchesTimeRange = true;
    const rentalDate = new Date(r.startDate.split('T')[0]);
    const refDate = new Date('2026-07-15');

    if (timeRangeFilter === '7d') {
      const daysDiff = (refDate.getTime() - rentalDate.getTime()) / (1000 * 60 * 60 * 24);
      matchesTimeRange = daysDiff >= 0 && daysDiff <= 7;
    } else if (timeRangeFilter === '30d') {
      const daysDiff = (refDate.getTime() - rentalDate.getTime()) / (1000 * 60 * 60 * 24);
      matchesTimeRange = daysDiff >= 0 && daysDiff <= 30;
    } else if (timeRangeFilter === 'custom') {
      if (startDateFilter) {
        matchesTimeRange = matchesTimeRange && new Date(r.startDate.split('T')[0]) >= new Date(startDateFilter);
      }
      if (endDateFilter) {
        matchesTimeRange = matchesTimeRange && new Date(r.startDate.split('T')[0]) <= new Date(endDateFilter);
      }
    }

    return matchesSearch && matchesStatus && matchesTimeRange;
  });

  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);
  const paginatedRentals = filteredRentals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [editOwnerCommission, setEditOwnerCommission] = useState('');

  const handleOpenEdit = (rental: Rental) => {
    setSelectedRental(rental);
    setEditId(rental.id);
    setEditCarId(rental.carId);
    setEditName(rental.customerName);
    setEditPhone(rental.customerPhone);
    setEditStart(rental.startDate);
    setEditEnd(rental.endDate);
    setEditAmount(rental.totalAmount.toString());
    setEditFile(rental.fileUrl || '');
    setEditPaymentStatus(rental.paymentStatus);
    setEditStatus(rental.status);
    setEditStartKm(rental.startKm.toString());
    setEditEndKm((rental.endKm || rental.startKm || 0).toString());
    setEditOwnerCommission((rental.ownerCommissionAmount ?? Math.round(rental.totalAmount * 0.7)).toString());
    setShowEditModal(true);
  };

  const handleUpdateContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRental) return;

    updateRental(selectedRental.id, {
      customerName: editName,
      customerPhone: editPhone,
      startDate: editStart,
      endDate: editEnd,
      totalAmount: parseInt(editAmount) || 0,
      paymentStatus: editPaymentStatus,
      status: editStatus,
      fileUrl: editFile,
      startKm: parseInt(editStartKm) || 0,
      endKm: editStatus === 'completed' ? (parseInt(editEndKm) || parseInt(editStartKm) || 0) : null,
      ownerCommissionAmount: parseInt(editOwnerCommission) || 0
    });

    setShowEditModal(false);
    showToast('Đã cập nhật thông tin đơn thuê/hợp đồng thành công!', 'success');
  };

  const handleViewContract = (rental: Rental) => {
    setSelectedRental(rental);
    if (rental.source === 'system') {
      setShowPreviewModal(true);
    } else {
      setShowDocModal(true);
    }
  };

  // Violation Management
  const handleOpenAddViolation = () => {
    setViolationEditId(null);
    setViolationDesc('');
    setViolationDate(new Date().toISOString().split('T')[0]);
    setViolationAmount('1000000');
    setViolationEvidence('');
    setViolationStatus('unpaid');
    setShowViolationModal(true);
  };

  const handleOpenEditViolation = (v: Violation) => {
    setViolationEditId(v.id);
    setViolationDesc(v.description);
    setViolationDate(v.date);
    setViolationAmount(v.amount.toString());
    setViolationEvidence(v.evidenceUrl || '');
    setViolationStatus(v.status);
    setShowViolationModal(true);
  };

  const handleUpdateFinancials = (fields: Partial<Rental>) => {
    if (!selectedDetailRentalId || !selectedDetailRental) return;

    const rentalFee = fields.rentalFee !== undefined ? fields.rentalFee : selectedDetailRental.rentalFee;
    const deliveryFee = fields.deliveryFee !== undefined ? fields.deliveryFee : selectedDetailRental.deliveryFee;
    const extraFee = fields.extraFee !== undefined ? fields.extraFee : selectedDetailRental.extraFee;
    
    const currentViolations = selectedDetailRental.violations || [];
    const violationTotal = currentViolations.reduce((sum, v) => sum + v.amount, 0);

    const totalAmount = rentalFee + deliveryFee + extraFee + violationTotal;

    updateRental(selectedDetailRentalId, {
      ...fields,
      totalAmount
    });
  };

  const handleViolationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailRentalId || !selectedDetailRental) return;

    const amountNum = parseInt(violationAmount) || 0;
    const currentViolations = selectedDetailRental.violations || [];

    let updated: Violation[];
    if (violationEditId) {
      updated = currentViolations.map(v => v.id === violationEditId ? {
        ...v,
        description: violationDesc,
        date: violationDate,
        amount: amountNum,
        evidenceUrl: violationEvidence,
        status: violationStatus
      } : v);
      showToast('Đã cập nhật vi phạm giao thông!', 'success');
    } else {
      const newV: Violation = {
        id: Date.now().toString(),
        description: violationDesc,
        date: violationDate,
        amount: amountNum,
        evidenceUrl: violationEvidence,
        status: violationStatus
      };
      updated = [...currentViolations, newV];
      showToast('Đã ghi nhận vi phạm giao thông mới!', 'success');
    }

    const violationTotal = updated.reduce((sum, v) => sum + v.amount, 0);
    const newTotalAmount = selectedDetailRental.rentalFee + selectedDetailRental.deliveryFee + selectedDetailRental.extraFee + violationTotal;

    updateRental(selectedDetailRentalId, { 
      violations: updated,
      totalAmount: newTotalAmount
    });
    setShowViolationModal(false);
  };

  const handleDeleteViolation = (violationId: string) => {
    if (!selectedDetailRentalId || !selectedDetailRental) return;
    if (confirm('Bạn có chắc chắn muốn xóa lịch sử vi phạm này?')) {
      const currentViolations = selectedDetailRental.violations || [];
      const updated = currentViolations.filter(v => v.id !== violationId);
      const violationTotal = updated.reduce((sum, v) => sum + v.amount, 0);
      const newTotalAmount = selectedDetailRental.rentalFee + selectedDetailRental.deliveryFee + selectedDetailRental.extraFee + violationTotal;

      updateRental(selectedDetailRentalId, { 
        violations: updated,
        totalAmount: newTotalAmount
      });
      showToast('Đã xóa vi phạm giao thông!', 'info');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. TRANG CHI TIẾT ĐƠN THUÊ */}
      {selectedDetailRentalId && selectedDetailRental ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setSelectedDetailRentalId(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} /> Quay lại danh sách đơn thuê
            </button>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Chi tiết đơn thuê: #{selectedDetailRental.id}</h1>
            <span style={{ 
              padding: '6px 14px', 
              borderRadius: '100px', 
              fontSize: '13px', 
              fontWeight: 700,
              background: selectedDetailRental.status === 'pending' ? '#fef3c7' : selectedDetailRental.status === 'active' ? '#e0f2fe' : selectedDetailRental.status === 'completed' ? '#d1fae5' : '#fee2e2',
              color: selectedDetailRental.status === 'pending' ? '#b45309' : selectedDetailRental.status === 'active' ? '#0369a1' : selectedDetailRental.status === 'completed' ? '#047857' : '#b91c1c',
              border: selectedDetailRental.status === 'pending' ? '1px solid #fde68a' : selectedDetailRental.status === 'active' ? '1px solid #bae6fd' : selectedDetailRental.status === 'completed' ? '1px solid #a7f3d0' : '1px solid #fca5a5'
            }}>
              {selectedDetailRental.status === 'pending' ? '🟡 Chờ bàn giao xe' : selectedDetailRental.status === 'active' ? '🔵 Đang thuê' : selectedDetailRental.status === 'completed' ? '🟢 Hoàn tất (Đã trả xe)' : '🔴 Đã hủy'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Cột Trái: Khách hàng, Thời gian thuê, Xe & Vi phạm giao thông */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Thời gian & Lịch trình thuê xe */}
              <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1.5px solid var(--border-strong)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 16px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="var(--primary)" /> Thời gian & Lịch trình thuê xe
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '16px', fontSize: '14px' }}>
                  {/* Nhận xe */}
                  <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="#166534" /> NGÀY NHẬN XE:
                    </div>
                    <strong style={{ fontSize: '15px', color: '#15803d' }}>
                      {new Date(selectedDetailRental.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </strong>
                    <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px', fontWeight: 700 }} className="font-mono">
                      {new Date(selectedDetailRental.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Trả xe */}
                  <div style={{ background: '#f0f9ff', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '12px', color: '#075985', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="#075985" /> NGÀY TRẢ XE:
                    </div>
                    <strong style={{ fontSize: '15px', color: '#0369a1' }}>
                      {new Date(selectedDetailRental.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </strong>
                    <div style={{ fontSize: '13px', color: '#075985', marginTop: '2px', fontWeight: 700 }} className="font-mono">
                      {new Date(selectedDetailRental.endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Tổng thời gian */}
                  <div style={{ background: '#fef3c7', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700 }}>
                      TỔNG THỜI GIAN:
                    </div>
                    <strong style={{ fontSize: '18px', color: '#b45309' }}>
                      {calculateDuration(selectedDetailRental.startDate, selectedDetailRental.endDate)}
                    </strong>
                    <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px', fontWeight: 600 }}>
                      {selectedDetailRental.status === 'completed' ? '🟢 Đã hoàn tất' : selectedDetailRental.status === 'active' ? '🔵 Đang sử dụng' : '🟡 Chờ bàn giao'}
                    </div>
                  </div>
                </div>

                {/* Đếm ngược nếu xe đang thuê */}
                {selectedDetailRental.status === 'active' && (
                  <div style={{ marginTop: '14px', background: '#0284c7', color: 'white', padding: '10px 16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '14px' }}>
                    <span>⏳ THỜI GIAN CÒN LẠI DÙNG XE:</span>
                    <span style={{ fontSize: '15px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <LiveCountdown endDateStr={selectedDetailRental.endDate} />
                    </span>
                  </div>
                )}
              </div>
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 16px', fontWeight: 600, color: 'var(--primary)' }}>Thông tin Khách hàng</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                  <div>Họ và tên: <Link to="/customers" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}>{selectedDetailRental.customerName}</Link></div>
                  <div>Số điện thoại: <strong>{selectedDetailRental.customerPhone}</strong></div>
                  <div>Số CCCD: <strong>{selectedDetailRental.id === 'RNT-001' ? '079090001234' : selectedDetailRental.id === 'RNT-002' ? '030090004567' : '025090008888'}</strong></div>
                  <div>Giấy phép lái xe: <strong>GPLX: 790123456789</strong></div>
                  <div style={{ gridColumn: 'span 2' }}>Địa chỉ thường trú: <strong>123 Nguyễn Trãi, Quận 5, TP.HCM</strong></div>
                </div>
              </div>

              {/* Thông tin Xe & Đối tác ký gửi */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 16px', fontWeight: 600, color: 'var(--primary)' }}>Xe sử dụng & Chủ sở hữu</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
                  {carObj ? (
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <Link to={`/fleet?id=${carObj.id}`} style={{ flexShrink: 0 }}>
                        <img src={carObj.image} style={{ width: '90px', height: '60px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-light)', cursor: 'pointer' }} title="Xem chi tiết xe" />
                      </Link>
                      <div style={{ fontSize: '14px' }}>
                        <Link to={`/fleet?id=${carObj.id}`} style={{ textDecoration: 'none' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer' }}>{carObj.name}</strong>
                        </Link>
                        <div style={{ marginTop: '4px' }}>
                          <span className="license-plate" style={{ fontSize: '11px', padding: '2px 8px' }}>{carObj.id}</span>
                        </div>
                        <div style={{ fontSize: '13px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', minWidth: '180px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>📏 KM bàn giao:</span>
                            <strong className="font-mono" style={{ color: '#0F172A' }}>{selectedDetailRental.startKm ? selectedDetailRental.startKm.toLocaleString() : 0} km</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>🏁 KM kết thúc:</span>
                            <strong className="font-mono" style={{ color: (selectedDetailRental.endKm !== undefined && selectedDetailRental.endKm !== null) ? '#16a34a' : '#d97706' }}>
                              {(selectedDetailRental.endKm !== undefined && selectedDetailRental.endKm !== null) ? `${Number(selectedDetailRental.endKm).toLocaleString()} km` : 'Chưa cập nhật'}
                            </strong>
                          </div>
                          {(selectedDetailRental.endKm !== undefined && selectedDetailRental.endKm !== null && Number(selectedDetailRental.endKm) >= selectedDetailRental.startKm) && (
                            <div style={{ fontSize: '11.5px', color: '#059669', textAlign: 'right', fontWeight: 600 }}>
                              (Đã chạy: {(Number(selectedDetailRental.endKm) - selectedDetailRental.startKm).toLocaleString()} km)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Không tìm thấy thông tin xe trong hệ thống.</div>
                  )}

                  {ownerObj ? (
                    <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '20px', fontSize: '14px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>CHỦ XE GÓP</div>
                      <Link to={`/owners?id=${ownerObj.id}`} style={{ textDecoration: 'none' }}>
                        <strong style={{ color: 'var(--primary)', fontSize: '15px', textDecoration: 'underline', cursor: 'pointer' }}>{ownerObj.name}</strong>
                      </Link>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>SĐT: {ownerObj.phone}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Địa chỉ: {ownerObj.address}</div>
                    </div>
                  ) : (
                    <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '20px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Không tìm thấy thông tin chủ xe ký gửi.</div>
                  )}
                </div>
              </div>

              {/* Chi phí phát sinh (Vi phạm giao thông, hỏng hóc, sửa chữa) */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700 }}>
                    <ShieldAlert size={18} color="var(--primary)" /> Chi phí phát sinh (Vi phạm giao thông, hỏng hóc, sửa chữa...)
                  </h3>
                  <button 
                    onClick={handleOpenAddViolation}
                    style={{ padding: '6px 12px', background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', borderRadius: 'var(--radius-md)', border: '1px solid var(--status-maintenance-border)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <Plus size={14} /> Thêm chi phí phát sinh
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 24px' }}>Ngày phát sinh</th>
                      <th style={{ padding: '12px 24px' }}>Nội dung phát sinh</th>
                      <th style={{ padding: '12px 24px' }}>Số tiền phát sinh</th>
                      <th style={{ padding: '12px 24px' }}>Tài liệu / Ảnh</th>
                      <th style={{ padding: '12px 24px' }}>Trạng thái thu</th>
                      <th style={{ padding: '12px 24px', textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!selectedDetailRental.violations || selectedDetailRental.violations.length === 0) ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          Không ghi nhận chi phí phát sinh nào trong hợp đồng này.
                        </td>
                      </tr>
                    ) : (
                      selectedDetailRental.violations.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                          <td style={{ padding: '12px 24px', fontWeight: 500 }}>
                            {new Date(v.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{ padding: '12px 24px', fontWeight: 600 }}>{v.description}</td>
                          <td style={{ padding: '12px 24px', color: 'var(--accent)', fontWeight: 700 }}>
                            {v.amount.toLocaleString()} ₫
                          </td>
                          <td style={{ padding: '12px 24px' }}>
                            {v.evidenceUrl ? (
                              <a href={v.evidenceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                                <FileText size={14} /> Xem tệp
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Không có</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 24px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '100px', 
                              fontSize: '11px', 
                              fontWeight: 600,
                              background: v.status === 'paid' ? 'var(--status-ready-bg)' : '#fef2f2',
                              color: v.status === 'paid' ? 'var(--status-ready-text)' : '#ef4444'
                            }}>
                              {v.status === 'paid' ? 'Đã thu tiền' : 'Chưa thu tiền'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button onClick={() => handleOpenEditViolation(v)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Sửa">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleDeleteViolation(v.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Xóa">
                                <Trash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* TIMELINE HOẠT ĐỘNG ĐƠN HÀNG */}
              <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700 }}>
                  <Clock size={18} color="var(--primary)" /> Timeline Tiến Trình & Mốc Hoạt Động Đơn Hàng
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '12px', marginTop: '6px' }}>
                  {/* Đường nối Timeline */}
                  <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '23px', width: '2px', background: 'var(--border-strong)', zIndex: 0 }}></div>

                  {/* Mốc 1: Tạo đơn */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', zIndex: 1 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                      1
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>Khởi tạo đơn thuê / ký hợp đồng</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }} className="font-mono">
                        Thời gian tạo: {selectedDetailRental.createdAt ? new Date(selectedDetailRental.createdAt).toLocaleString('vi-VN') : new Date(selectedDetailRental.startDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {/* Mốc 2: Bàn giao xe */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', zIndex: 1 }}>
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      background: ['active', 'completed'].includes(selectedDetailRental.status) ? '#10b981' : '#f59e0b', 
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' 
                    }}>
                      {['active', 'completed'].includes(selectedDetailRental.status) ? '✓' : '2'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                        Bàn giao xe cho khách
                        {selectedDetailRental.status === 'pending' && (
                          <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, marginLeft: '8px' }}>
                            Chờ bàn giao
                          </span>
                        )}
                        {['active', 'completed'].includes(selectedDetailRental.status) && (
                          <span style={{ fontSize: '11px', background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, marginLeft: '8px' }}>
                            Đã giao xe
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }} className="font-mono">
                        Lịch bàn giao: {new Date(selectedDetailRental.startDate).toLocaleString('vi-VN')}
                        {selectedDetailRental.deliveredAt && ` (Thực tế: ${new Date(selectedDetailRental.deliveredAt).toLocaleString('vi-VN')})`}
                      </div>
                    </div>
                  </div>

                  {/* Mốc 3: Khách trả xe */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', zIndex: 1 }}>
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      background: selectedDetailRental.status === 'completed' ? '#10b981' : '#f1f5f9', 
                      border: selectedDetailRental.status === 'completed' ? 'none' : '2px solid var(--border-strong)',
                      color: selectedDetailRental.status === 'completed' ? 'white' : 'var(--text-secondary)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' 
                    }}>
                      {selectedDetailRental.status === 'completed' ? '✓' : '3'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                        Khách trả xe & Thanh lý hợp đồng
                        {selectedDetailRental.status === 'completed' ? (
                          <span style={{ fontSize: '11px', background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, marginLeft: '8px' }}>
                            Đã hoàn tất trả xe
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, marginLeft: '8px' }}>
                            Chưa trả xe
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }} className="font-mono">
                        Lịch hẹn trả: {new Date(selectedDetailRental.endDate).toLocaleString('vi-VN')}
                        {selectedDetailRental.returnedAt && ` (Thực tế: ${new Date(selectedDetailRental.returnedAt).toLocaleString('vi-VN')})`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HÌNH ẢNH TRẠNG THÁI XE THỰC TẾ (BÀN GIAO & NGHIỆM THU) */}
              <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700 }}>
                      <Camera size={18} color="var(--primary)" /> Hình Ảnh Thực Tế Trạng Thái Xe (Bàn Giao & Nghiệm Thu)
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      Hình ảnh chụp ngoại thất, nội thất, đồng hồ KM & vết xước thực tế lúc giao và nhận lại xe từ khách.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label style={{ cursor: 'pointer', background: 'var(--primary)', color: 'white', padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={15} /> Tải ảnh từ máy / ĐT
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleUploadConditionFiles} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        setGalleryMode('condition');
                        setShowGallery(true);
                      }}
                      style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <ImageIcon size={15} /> Chọn từ thư viện
                    </button>
                  </div>
                </div>

                {/* Display photos grid */}
                {(!selectedDetailRental.conditionImages || selectedDetailRental.conditionImages.length === 0) ? (
                  <div style={{ background: '#f8fafc', padding: '28px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-strong)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Camera size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Chưa có hình ảnh trạng thái xe nào được đính kèm.</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Bấm "Tải ảnh từ máy / ĐT" để thêm hình ảnh tình trạng xe thực tế.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginTop: '4px' }}>
                    {selectedDetailRental.conditionImages.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        style={{ position: 'relative', height: '110px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-strong)', background: '#f1f5f9', cursor: 'pointer' }}
                        onClick={() => setSelectedPreviewImage(imgUrl)}
                      >
                        <img src={imgUrl} alt={`Tình trạng xe ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConditionImage(imgUrl);
                          }}
                          title="Xóa ảnh"
                          style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                        >
                          <Trash size={13} />
                        </button>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', padding: '2px 6px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Ảnh #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Cột Phải: Thanh toán, Hợp đồng & Cập nhật trạng thái */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-strong)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', margin: 0, color: 'var(--primary)' }}>Hóa đơn & Hợp đồng</h3>
                <button 
                  onClick={() => setIsEditingFinancials(!isEditingFinancials)}
                  style={{ background: '#f1f5f9', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                >
                  {isEditingFinancials ? 'Lưu giá' : 'Sửa giá'}
                </button>
              </div>
              
              {/* Calculate violation subtotal and display editable invoice */}
              {(() => {
                const violationSubtotal = (selectedDetailRental.violations || []).reduce((sum, v) => sum + v.amount, 0);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Giá thuê xe gốc:</span>
                      {isEditingFinancials ? (
                        <input 
                          type="number" 
                          value={selectedDetailRental.rentalFee}
                          onChange={e => handleUpdateFinancials({ rentalFee: parseInt(e.target.value) || 0 })}
                          style={{ width: '140px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', textAlign: 'right', fontWeight: 600, fontFamily: 'inherit' }}
                        />
                      ) : (
                        <strong>{selectedDetailRental.rentalFee.toLocaleString()} ₫</strong>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Phí giao xe:</span>
                      {isEditingFinancials ? (
                        <input 
                          type="number" 
                          value={selectedDetailRental.deliveryFee}
                          onChange={e => handleUpdateFinancials({ deliveryFee: parseInt(e.target.value) || 0 })}
                          style={{ width: '140px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', textAlign: 'right', fontWeight: 600, fontFamily: 'inherit' }}
                        />
                      ) : (
                        <strong>{selectedDetailRental.deliveryFee.toLocaleString()} ₫</strong>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Phụ phí phát sinh:</span>
                      {isEditingFinancials ? (
                        <input 
                          type="number" 
                          value={selectedDetailRental.extraFee}
                          onChange={e => handleUpdateFinancials({ extraFee: parseInt(e.target.value) || 0 })}
                          style={{ width: '140px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', textAlign: 'right', fontWeight: 600, fontFamily: 'inherit' }}
                        />
                      ) : (
                        <strong>{selectedDetailRental.extraFee.toLocaleString()} ₫</strong>
                      )}
                    </div>
                    
                    {violationSubtotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 600 }}>
                        <span>Phạt vi phạm GT (+):</span>
                        <span>{violationSubtotal.toLocaleString()} ₫</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-strong)', paddingTop: '10px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tiền đặt cọc:</span>
                      {isEditingFinancials ? (
                        <input 
                          type="number" 
                          value={selectedDetailRental.deposit}
                          onChange={e => handleUpdateFinancials({ deposit: parseInt(e.target.value) || 0 })}
                          style={{ width: '140px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', textAlign: 'right', fontWeight: 600, color: 'var(--primary)', fontFamily: 'inherit' }}
                        />
                      ) : (
                        <strong style={{ color: 'var(--primary)' }}>{selectedDetailRental.deposit.toLocaleString()} ₫</strong>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, borderTop: '1px solid var(--border-strong)', paddingTop: '12px' }}>
                      <span>TỔNG CỘNG:</span>
                      <span style={{ color: 'var(--accent)', fontSize: '20px' }}>{selectedDetailRental.totalAmount.toLocaleString()} ₫</span>
                    </div>
                  </div>
                );
              })()}

              {/* Cập nhật Trạng thái Đơn thuê / Bàn giao / Trả xe */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>Trạng thái Đơn thuê (Bàn giao & Trả xe)</label>
                <select 
                  value={selectedDetailRental.status}
                  onChange={e => {
                    const newStatus = e.target.value as any;
                    const updates: Partial<Rental> = { status: newStatus };
                    if (newStatus === 'active' && !selectedDetailRental.deliveredAt) {
                      updates.deliveredAt = new Date().toISOString();
                    }
                    if (newStatus === 'completed' && !selectedDetailRental.returnedAt) {
                      updates.returnedAt = new Date().toISOString();
                    }
                    updateRental(selectedDetailRental.id, updates);
                    showToast(`Đã cập nhật trạng thái đơn thành: ${
                      newStatus === 'pending' ? 'Chờ bàn giao xe' :
                      newStatus === 'active' ? 'Đang thuê' :
                      newStatus === 'completed' ? 'Đã trả xe' : 'Đã hủy'
                    }!`, 'success');
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '13.5px', fontFamily: 'inherit', fontWeight: 700, background: 'white' }}
                >
                  <option value="pending">🟡 Chờ bàn giao xe cho khách</option>
                  <option value="active">🔵 Đang thuê (Đã giao xe cho khách)</option>
                  <option value="completed">🟢 Đã trả xe (Khách đã trả xe xong)</option>
                  <option value="cancelled">🔴 Đã hủy đơn thuê</option>
                </select>
              </div>

              {/* Trạng thái thanh toán của Khách */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>Trạng thái thanh toán</label>
                <select 
                  value={selectedDetailRental.paymentStatus}
                  onChange={e => {
                    updateRental(selectedDetailRental.id, { paymentStatus: e.target.value as any });
                    showToast('Đã cập nhật trạng thái thanh toán đơn thuê!', 'success');
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '14px', fontFamily: 'inherit', fontWeight: 600 }}
                >
                  <option value="deposit">Đã đặt cọc (Chưa thanh toán hết)</option>
                  <option value="paid">Đã thanh toán toàn bộ</option>
                  <option value="debt">Còn nợ (Chờ thanh toán sau)</option>
                </select>
              </div>

              {/* Loại Hợp đồng thuê & Đính kèm */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>Loại Hợp đồng thuê</label>
                
                {/* Radio selection between automatic system contract and manual upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontSize: '13px', fontWeight: 600 }}>
                    <input 
                      type="radio" 
                      name="contractSourceType" 
                      checked={(selectedDetailRental.source || 'system') === 'system'} 
                      onChange={() => {
                        updateRental(selectedDetailRental.id, { source: 'system' });
                        showToast('Đã chuyển sang Hợp đồng tự động từ hệ thống!', 'info');
                      }} 
                    />
                    <span>Hệ thống tự tạo mẫu hợp đồng (Báo cáo đơn hàng)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontSize: '13px', fontWeight: 600 }}>
                    <input 
                      type="radio" 
                      name="contractSourceType" 
                      checked={selectedDetailRental.source === 'uploaded'} 
                      onChange={() => {
                        updateRental(selectedDetailRental.id, { source: 'uploaded' });
                        showToast('Đã chuyển sang Hợp đồng upload thủ công!', 'info');
                      }} 
                    />
                    <span>Upload hợp đồng thủ công (Tệp PDF/Hình ảnh)</span>
                  </label>
                </div>

                {/* Content depending on selection */}
                {(selectedDetailRental.source || 'system') === 'system' ? (
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Mẫu hợp đồng được hệ thống tự động tổng hợp từ thông tin báo cáo đơn hàng (khách hàng, xe, đơn giá, lịch thuê).
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedRental(selectedDetailRental);
                        setShowPreviewModal(true);
                      }}
                      style={{ padding: '10px 14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Eye size={16} /> Xem Báo cáo & Hợp đồng tự động
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedDetailRental.fileUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', wordBreak: 'break-all', background: 'white', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          <FileCheck size={18} color="var(--primary)" />
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {selectedDetailRental.fileName || 'File_Hop_Dong_Thu_Cong.pdf'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedRental(selectedDetailRental);
                              setShowDocModal(true);
                            }}
                            style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, background: 'white', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                          >
                            <Eye size={14} /> Xem tệp
                          </button>
                          <label style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                            <Edit size={14} /> Thay file mới
                            <input 
                              type="file" 
                              accept="image/*,application/pdf" 
                              onChange={handleUploadContractFile} 
                              style={{ display: 'none' }} 
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Chưa đính kèm tệp hợp đồng thủ công nào.</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                            <Upload size={16} /> Tải tệp từ máy / ĐT
                            <input 
                              type="file" 
                              accept="image/*,application/pdf" 
                              onChange={handleUploadContractFile} 
                              style={{ display: 'none' }} 
                            />
                          </label>
                          <button 
                            type="button"
                            onClick={() => { setGalleryMode('contract'); setShowGallery(true); }}
                            style={{ padding: '10px 14px', background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
                          >
                            Thư viện
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* 2. DANH SÁCH ĐƠN THUÊ CHÍNH */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Quản lý Đơn thuê (Hợp đồng)
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
                  Hợp đồng
                </span>
              </div>
              <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
                Danh sách đơn thuê, quản lý thông tin hợp đồng và tệp đính kèm
              </p>
            </div>
            
            <Link to="/rental/new" style={{ textDecoration: 'none' }}>
              <button 
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600 }}
              >
                <Plus size={18} />
                Tạo đơn thuê mới
              </button>
            </Link>
          </div>

          {/* KPI Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '16px', 
            marginBottom: '4px' 
          }}>
            {/* Total Contracts */}
            <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Tổng Đơn Thuê</span>
                <div style={{ background: '#EFF6FF', color: '#2563EB', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginTop: '10px' }}>{totalContractsCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>đơn</span></div>
              <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 500 }}>Vận hành liên tục</div>
            </div>

            {/* Total Revenue */}
            <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Tổng Doanh Thu HĐ</span>
                <div style={{ background: '#ECFDF5', color: '#059669', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '10px' }}>{totalContractRevenue.toLocaleString('vi-VN')} đ</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Doanh thu hợp đồng thuê xe</div>
            </div>

            {/* Active Contracts */}
            <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Đang Cho Thuê</span>
                <div style={{ background: '#FEF3C7', color: '#D97706', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#D97706', marginTop: '10px' }}>{activeContractsCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>xe</span></div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', fontWeight: 500 }}>Đang hoạt động trên đường</div>
            </div>

            {/* Paid Contracts */}
            <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Đơn Đã Thanh Toán</span>
                <div style={{ background: '#F5F3FF', color: '#7C3AED', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#7C3AED', marginTop: '10px' }}>{paidContractsCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>HĐ</span></div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Đã hoàn tất thanh toán</div>
            </div>
          </div>

          {selectedRentalIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,104,55,0.08)', border: '1px solid var(--primary)', padding: '12px 24px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                Đã chọn {selectedRentalIds.length} đơn thuê/hợp đồng
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (window.confirm(`Thay đổi trạng thái hàng loạt cho ${selectedRentalIds.length} đơn đã chọn?`)) {
                      selectedRentalIds.forEach(id => updateRental(id, { status: val as any }));
                      setSelectedRentalIds([]);
                      showToast('Đã cập nhật trạng thái hàng loạt!', 'success');
                    }
                    e.target.value = '';
                  }}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', outline: 'none' }}
                >
                  <option value="">-- Sửa trạng thái hàng loạt --</option>
                  <option value="pending">Chờ bàn giao xe</option>
                  <option value="active">Đang thuê</option>
                  <option value="completed">Đã trả xe</option>
                  <option value="cancelled">Đã hủy đơn</option>
                </select>
                <select 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (window.confirm(`Thay đổi trạng thái thanh toán hàng loạt cho ${selectedRentalIds.length} đơn đã chọn?`)) {
                      selectedRentalIds.forEach(id => updateRental(id, { paymentStatus: val as any }));
                      setSelectedRentalIds([]);
                      showToast('Đã cập nhật trạng thái thanh toán hàng loạt!', 'success');
                    }
                    e.target.value = '';
                  }}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', outline: 'none' }}
                >
                  <option value="">-- Sửa thanh toán hàng loạt --</option>
                  <option value="deposit">Đã đặt cọc</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="unpaid">Chưa thanh toán</option>
                </select>
                <button 
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedRentalIds.length} đơn thuê đã chọn?`)) {
                      selectedRentalIds.forEach(id => deleteRental(id));
                      setSelectedRentalIds([]);
                      showToast('Đã xóa hàng loạt đơn thuê thành công!', 'success');
                    }
                  }}
                  className="btn-secondary" 
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', gap: '6px', padding: '6px 14px' }}
                >
                  <Trash size={15} /> Xóa hàng loạt
                </button>
                <button onClick={() => setSelectedRentalIds([])} className="btn-ghost" style={{ fontSize: '14px', padding: '6px 12px' }}>
                  Hủy chọn
                </button>
              </div>
            </div>
          )}

          {/* Tìm kiếm & Bộ lọc nâng cao */}
          <div className="card" style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-page)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flex: 1, minWidth: '220px' }}>
              <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Tìm theo mã đơn, biển số xe, tên khách..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Trạng thái:</span>
              <select 
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                style={{ padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '13px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">🟡 Chờ bàn giao xe</option>
                <option value="active">🔵 Đang thuê</option>
                <option value="completed">🟢 Đã trả xe</option>
                <option value="cancelled">🔴 Đã hủy đơn</option>
              </select>
            </div>

            {/* Time Range Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-page)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <Filter size={14} style={{ color: 'var(--text-secondary)', marginLeft: '6px' }} />
              <button 
                onClick={() => { setTimeRangeFilter('all'); setCurrentPage(1); }}
                style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: timeRangeFilter === 'all' ? 'var(--primary)' : 'transparent', color: timeRangeFilter === 'all' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Tất cả
              </button>
              <button 
                onClick={() => { setTimeRangeFilter('7d'); setCurrentPage(1); }}
                style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: timeRangeFilter === '7d' ? 'var(--primary)' : 'transparent', color: timeRangeFilter === '7d' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                7 ngày
              </button>
              <button 
                onClick={() => { setTimeRangeFilter('30d'); setCurrentPage(1); }}
                style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: timeRangeFilter === '30d' ? 'var(--primary)' : 'transparent', color: timeRangeFilter === '30d' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                30 ngày
              </button>
              <button 
                onClick={() => { setTimeRangeFilter('custom'); setCurrentPage(1); }}
                style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: timeRangeFilter === 'custom' ? 'var(--primary)' : 'transparent', color: timeRangeFilter === 'custom' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Tùy chỉnh
              </button>
            </div>

            {/* Custom Date Pickers */}
            {timeRangeFilter === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                <input 
                  type="date"
                  value={startDateFilter}
                  onChange={e => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>đến</span>
                <input 
                  type="date"
                  value={endDateFilter}
                  onChange={e => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit' }}
                />
              </div>
            )}

            {(statusFilter !== 'all' || timeRangeFilter !== 'all' || startDateFilter || endDateFilter || searchTerm) && (
              <button 
                onClick={() => { setStatusFilter('all'); setTimeRangeFilter('all'); setStartDateFilter(''); setEndDateFilter(''); setSearchTerm(''); setCurrentPage(1); }}
                style={{ padding: '6px 12px', color: 'var(--text-secondary)', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedRentalIds.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>
                Đã chọn {selectedRentalIds.length} hợp đồng
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => {
                    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedRentalIds.length} hợp đồng đã chọn? Hành động này không thể hoàn tác.`)) {
                      selectedRentalIds.forEach(id => deleteRental(id));
                      setSelectedRentalIds([]);
                      showToast(`Đã xóa ${selectedRentalIds.length} hợp đồng!`, 'success');
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#ef4444', color: 'white', borderRadius: 'var(--radius-sm)', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  <Trash size={14} /> Xóa hàng loạt
                </button>
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="card desktop-only-table" style={{ padding: 0, overflowX: 'auto', width: '100%', background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <Table<Rental>
              dataSource={filteredRentals}
              rowKey="id"
              onRow={(rental: Rental) => ({
                onClick: () => setSelectedDetailRentalId(rental.id),
                style: { cursor: 'pointer' }
              })}
              rowSelection={{
                selectedRowKeys: selectedRentalIds,
                onChange: (keys: React.Key[]) => setSelectedRentalIds(keys as string[])
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total: number, range: [number, number]) => `Hiển thị ${range[0]}-${range[1]} / ${total} đơn thuê`
              }}
              columns={[
                {
                  title: 'Mã đơn',
                  dataIndex: 'id',
                  key: 'id',
                  sorter: (a: Rental, b: Rental) => a.id.localeCompare(b.id),
                  render: (id: string) => <span className="font-mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{id}</span>
                },
                {
                  title: 'Biển số xe',
                  dataIndex: 'carId',
                  key: 'carId',
                  render: (carId: string) => (
                    <Link to={`/fleet?id=${carId}`} onClick={(e) => e.stopPropagation()}>
                      <span className="license-plate font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>{carId}</span>
                    </Link>
                  )
                },
                {
                  title: 'Khách hàng',
                  dataIndex: 'customerName',
                  key: 'customerName',
                  sorter: (a: Rental, b: Rental) => a.customerName.localeCompare(b.customerName),
                  render: (_: unknown, record: Rental) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#262626' }}>{record.customerName}</div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }} className="font-mono">{record.customerPhone}</div>
                    </div>
                  )
                },
                {
                  title: 'Loại đơn',
                  dataIndex: 'source',
                  key: 'source',
                  render: (source: string) => source === 'system' ? <Tag color="green">Hệ thống tạo</Tag> : <Tag color="default">Tải lên tệp</Tag>
                },
                {
                  title: 'Tổng tiền',
                  dataIndex: 'totalAmount',
                  key: 'totalAmount',
                  sorter: (a: Rental, b: Rental) => a.totalAmount - b.totalAmount,
                  render: (amount: number) => <span style={{ fontWeight: 700, color: '#1677ff' }}>{(amount || 0).toLocaleString()} ₫</span>
                },
                {
                  title: 'Thời gian thuê',
                  key: 'duration',
                  render: (_: unknown, record: Rental) => (
                    <div style={{ fontSize: '12px', color: '#595959' }} className="font-mono">
                      {new Date(record.startDate).toLocaleDateString('vi-VN')} → {new Date(record.endDate).toLocaleDateString('vi-VN')}
                    </div>
                  )
                },
                {
                  title: 'Số KM',
                  key: 'km_range',
                  render: (_: unknown, record: Rental) => (
                    <div style={{ fontSize: '12.5px', color: '#475569' }} className="font-mono">
                      <div>Giao: <strong>{record.startKm.toLocaleString()}</strong> km</div>
                      {record.status === 'completed' && record.endKm !== undefined && (
                        <div style={{ marginTop: '2px', color: '#16a34a' }}>Nhận: <strong>{record.endKm.toLocaleString()}</strong> km</div>
                      )}
                    </div>
                  )
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  key: 'status',
                  filters: [
                    { text: 'Chờ giao xe', value: 'pending' },
                    { text: 'Đang thuê', value: 'active' },
                    { text: 'Đã trả xe', value: 'completed' },
                    { text: 'Đã hủy', value: 'cancelled' },
                  ],
                  onFilter: (value: boolean | React.Key, record: Rental) => record.status === value,
                  render: (status: string) => {
                    if (status === 'pending') return <Tag color="warning">🟡 Chờ giao</Tag>;
                    if (status === 'active') return <Tag color="processing">🔵 Đang thuê</Tag>;
                    if (status === 'completed') return <Tag color="success">🟢 Đã trả</Tag>;
                    return <Tag color="error">🔴 Đã hủy</Tag>;
                  }
                },
                {
                  title: 'Hành động',
                  key: 'actions',
                  render: (_: unknown, record: Rental) => (
                    <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedDetailRentalId(record.id)}
                        style={{ padding: '4px 8px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, color: '#595959' }}
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={() => handleViewContract(record)}
                        style={{ padding: '4px 8px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                        title="Xem HĐ"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(record)}
                        style={{ padding: '4px 8px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  )
                }
              ]}
            />
          </div>

          {/* Mobile Only Cards View */}
          <div className="mobile-only-cards">
            {paginatedRentals.length === 0 ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Không tìm thấy đơn thuê nào phù hợp.
              </div>
            ) : (
              paginatedRentals.map((rental) => (
                <div 
                  key={rental.id} 
                  className="card"
                  style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-strong)', background: 'white' }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox"
                        checked={selectedRentalIds.includes(rental.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRentalIds(prev => [...prev, rental.id]);
                          } else {
                            setSelectedRentalIds(prev => prev.filter(id => id !== rental.id));
                          }
                        }}
                      />
                      <strong className="font-mono" style={{ fontSize: '15px', color: 'var(--primary)' }}>{rental.id}</strong>
                      <span className="license-plate font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>{rental.carId}</span>
                    </div>

                    <span style={{ 
                      padding: '3px 10px', 
                      borderRadius: '100px', 
                      fontSize: '11.5px', 
                      fontWeight: 700,
                      background: rental.status === 'pending' ? '#fef3c7' : rental.status === 'active' ? '#e0f2fe' : rental.status === 'completed' ? '#d1fae5' : '#fee2e2',
                      color: rental.status === 'pending' ? '#b45309' : rental.status === 'active' ? '#0369a1' : rental.status === 'completed' ? '#047857' : '#b91c1c'
                    }}>
                      {rental.status === 'pending' ? '🟡 Chờ giao' : rental.status === 'active' ? '🔵 Đang thuê' : rental.status === 'completed' ? '🟢 Đã trả' : '🔴 Đã hủy'}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13.5px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                    <div>👤 <strong>{rental.customerName}</strong> ({rental.customerPhone})</div>
                    <div>📅 {new Date(rental.startDate).toLocaleDateString('vi-VN')} → {new Date(rental.endDate).toLocaleDateString('vi-VN')}</div>
                    <div>💰 Tổng tiền: <strong className="font-mono" style={{ color: 'var(--primary)', fontSize: '15px' }}>{rental.totalAmount.toLocaleString()} ₫</strong></div>
                  </div>

                  {/* Mobile Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                    <button 
                      type="button"
                      onClick={() => setSelectedDetailRentalId(rental.id)}
                      style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <Eye size={16} /> Xem thông tin chi tiết đơn
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => handleViewContract(rental)}
                        style={{ flex: 1, padding: '8px', background: 'var(--bg-page)', color: 'var(--text-main)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <FileText size={14} /> Xem HĐ
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleOpenEdit(rental)}
                        style={{ flex: 1, padding: '8px', background: 'var(--bg-page)', color: 'var(--text-main)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <Edit size={14} /> Sửa
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc chắn muốn XÓA vĩnh viễn đơn thuê #${rental.id}?`)) {
                            deleteRental(rental.id);
                          }
                        }}
                        style={{ padding: '8px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRentals.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              unitName="đơn thuê"
            />
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Đơn Thuê - Ant Design Modal & Form */}
      <Modal
        title={`Chỉnh sửa đơn thuê #${editId}`}
        open={showEditModal && !!selectedRental}
        onCancel={() => setShowEditModal(false)}
        footer={null}
        width={520}
      >
        <Form layout="vertical" onFinish={handleUpdateContractSubmit} style={{ marginTop: '16px' }}>
          <Form.Item label="Liên kết Xe">
            <input type="text" value={editCarId} disabled style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', background: '#f5f5f5' }} />
          </Form.Item>

          <Form.Item label="Họ tên Khách hàng" required>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
          </Form.Item>

          <Form.Item label="SĐT Khách hàng" required>
            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Ngày bắt đầu" style={{ flex: 1 }}>
              <input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
            </Form.Item>
            <Form.Item label="Ngày dự kiến trả" style={{ flex: 1 }}>
              <input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Thanh toán" style={{ flex: 1 }}>
              <select value={editPaymentStatus} onChange={e => setEditPaymentStatus(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
                <option value="deposit">Đã cọc</option>
                <option value="paid">Đã thanh toán</option>
                <option value="debt">Còn nợ</option>
              </select>
            </Form.Item>
            <Form.Item label="Vận hành" style={{ flex: 1 }}>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
                <option value="active">Đang chạy</option>
                <option value="completed">Hoàn tất</option>
              </select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Số KM lúc bàn giao" style={{ flex: 1 }}>
              <input type="number" value={editStartKm} onChange={e => setEditStartKm(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
            </Form.Item>
            <Form.Item label="Số KM lúc trả xe (kết thúc)" style={{ flex: 1 }}>
              <input type="number" value={editEndKm} onChange={e => setEditEndKm(e.target.value)} disabled={editStatus !== 'completed'} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', background: editStatus !== 'completed' ? '#f5f5f5' : 'white' }} />
            </Form.Item>
          </div>

          <Form.Item label="Tệp đính kèm (URL hợp đồng scan)">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={editFile} onChange={e => setEditFile(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
              <button type="button" style={{ padding: '8px 12px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }} onClick={() => { setGalleryMode('contract'); setShowGallery(true); }}>
                Thư viện
              </button>
            </div>
          </Form.Item>

          <div style={{ background: '#f6ffed', padding: '12px', borderRadius: '6px', border: '1px solid #b7eb8f', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#389e0d' }}>🔒 Tiền chi trả cho chủ xe (Admin)</div>
            <input 
              type="number" 
              value={editOwnerCommission} 
              onChange={e => setEditOwnerCommission(e.target.value)}
              placeholder="Nhập số tiền..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', marginTop: '6px', fontWeight: 700, color: '#389e0d' }} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Lưu thay đổi</button>
          </div>
        </Form>
      </Modal>

      {/* Modal Thêm/Sửa Chi Phí Phát Sinh (Vi phạm GT, Hỏng hóc, Sửa xe) */}
      <Modal
        title={violationEditId ? 'Sửa chi phí phát sinh' : 'Ghi nhận chi phí phát sinh mới'}
        open={showViolationModal}
        onCancel={() => setShowViolationModal(false)}
        footer={null}
        width={500}
      >
        <Form layout="vertical" onFinish={handleViolationSubmit} style={{ marginTop: '16px' }}>
          <Form.Item label="Nội dung chi phí phát sinh" required>
            <input 
              type="text" 
              placeholder="VD: Phạt quá tốc độ, Vỡ đèn hậu, Rửa xe dơ, Hỏng lốp..." 
              value={violationDesc} 
              onChange={e => setViolationDesc(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} 
              required 
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Ngày phát sinh" required style={{ flex: 1 }}>
              <input 
                type="date" 
                value={violationDate} 
                onChange={e => setViolationDate(e.target.value)} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} 
                required 
              />
            </Form.Item>
            <Form.Item label="Số tiền phát sinh (₫)" required style={{ flex: 1 }}>
              <input 
                type="number" 
                value={violationAmount} 
                onChange={e => setViolationAmount(e.target.value)} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} 
                required 
              />
            </Form.Item>
          </div>

          <Form.Item label="Tài liệu chứng minh (Ảnh biên bản, hình sửa xe...)">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="URL hình ảnh chứng minh..." 
                value={violationEvidence} 
                onChange={e => setViolationEvidence(e.target.value)} 
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} 
              />
              <button 
                type="button" 
                style={{ padding: '8px 12px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }}
                onClick={() => { setGalleryMode('evidence'); setShowGallery(true); }}
              >
                Chọn ảnh
              </button>
            </div>
          </Form.Item>

          <Form.Item label="Trạng thái thu tiền">
            <select 
              value={violationStatus} 
              onChange={e => setViolationStatus(e.target.value as any)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}
            >
              <option value="unpaid">Chưa thu tiền từ khách</option>
              <option value="paid">Khách đã thanh toán tiền phát sinh</option>
            </select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={() => setShowViolationModal(false)} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              {violationEditId ? 'Lưu thay đổi' : 'Ghi nhận vi phạm'}
            </button>
          </div>
        </Form>
      </Modal>

      {/* Modal Hóa Đơn Bàn Giao Xe & Hợp Đồng */}
      {showPreviewModal && selectedRental && (
        <div className="print-overlay-wrapper" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px', overflowY: 'auto' }}>
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
                  AUTOMANAGE GARAGE
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Dịch Vụ Cho Thuê Xe Tự Lái & Có Tài Xế • Hotline: 0901 234 567
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', background: 'var(--status-available-bg)', color: 'var(--status-available-text)', padding: '4px 10px', borderRadius: '100px', fontWeight: 700 }}>
                  ✓ PHIẾU BÀN GIAO HỢP ĐỒNG
                </span>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px', color: 'var(--text-primary)' }}>
                  Mã đơn: #{selectedRental.id}
                </div>
                <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Ngày lập: {new Date(selectedRental.startDate).toLocaleDateString('vi-VN')}
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
                  <div>Họ và tên: <strong>{selectedRental.customerName}</strong></div>
                  <div>Số điện thoại: <strong className="font-mono">{selectedRental.customerPhone}</strong></div>
                </div>
              </div>

              {/* Vehicle Box */}
              <div style={{ background: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '13px', margin: '0 0 10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  🚗 XE BÀN GIAO & TRẢ
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Biển số xe:</span>
                    <span className="license-plate font-mono">{selectedRental.carId}</span>
                  </div>
                  <div>KM bàn giao (bắt đầu): <strong className="font-mono">{selectedRental.startKm.toLocaleString()} km</strong></div>
                  <div>KM trả xe (kết thúc): <strong className="font-mono">{selectedRental.endKm !== undefined && selectedRental.endKm !== null ? `${Number(selectedRental.endKm).toLocaleString()} km` : 'Chưa ghi nhận'}</strong></div>
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
                      {new Date(selectedRental.startDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>Thời gian trả xe dự kiến</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                      {new Date(selectedRental.endDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>Cước tiền thuê xe</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                      {selectedRental.rentalFee.toLocaleString()} ₫
                    </td>
                  </tr>
                  {selectedRental.deliveryFee > 0 && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px' }}>Phí giao xe tận nơi</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                        {selectedRental.deliveryFee.toLocaleString()} ₫
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>Tiền cọc giữ xe (Đã nhận)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }} className="font-mono">
                      {selectedRental.deposit.toLocaleString()} ₫
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Summary Row */}
            <div style={{ background: 'var(--status-available-bg)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--status-available-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-available-text)' }}>TỔNG TIỀN THANH TOÁN:</span>
                <div style={{ fontSize: '11px', color: 'var(--status-available-text)' }}>Trạng thái: {selectedRental.paymentStatus === 'paid' ? 'Đã thanh toán đủ' : 'Đã đặt cọc tiền giữ xe'}</div>
              </div>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-available-text)' }}>
                {selectedRental.totalAmount.toLocaleString()} ₫
              </div>
            </div>

            {/* Action Buttons */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setShowPreviewModal(false)}
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Đóng
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
      )}

      {/* Modal xem tài liệu tải lên */}
      {showDocModal && selectedRental && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '850px', height: '85vh', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Tệp hợp đồng lưu trữ: {selectedRental.id}</h2>
              <button onClick={() => setShowDocModal(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedRental.fileUrl ? (
                (selectedRental.fileUrl.startsWith('data:application/pdf') || selectedRental.fileUrl.includes('.pdf') || selectedRental.fileUrl.includes('pdf')) ? (
                  <iframe 
                    src={selectedRental.fileUrl} 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                    title={`PDF Contract ${selectedRental.id}`}
                  />
                ) : (
                  <img src={selectedRental.fileUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Tệp hợp đồng" />
                )
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <FileText size={48} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <div>Không tìm thấy nội dung tệp hình ảnh / PDF đính kèm.</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)' }} onClick={() => setShowDocModal(false)}>Đóng</button>
              {selectedRental.fileUrl && (
                <a href={selectedRental.fileUrl} download={`Hop_Dong_${selectedRental.id}.pdf`} style={{ textDecoration: 'none' }}>
                  <button className="btn-primary">Tải xuống tệp</button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {showGallery && (
        <ImageGallery 
          onClose={() => setShowGallery(false)} 
          onSelect={(urls, name) => {
            const arr = Array.isArray(urls) ? urls : [urls];
            if (galleryMode === 'contract') {
              setEditFile(arr[0]);
              if (selectedDetailRentalId) {
                updateRental(selectedDetailRentalId, { 
                  fileUrl: arr[0],
                  fileName: name || 'File_Hop_Dong_Thu_Cong.pdf',
                  source: 'uploaded'
                });
                showToast('Đã cập nhật tệp hợp đồng mới!', 'success');
              }
            } else if (galleryMode === 'evidence') {
              setViolationEvidence(arr[0]);
            } else if (galleryMode === 'condition') {
              if (selectedDetailRentalId) {
                const existing = rentals.find(r => r.id === selectedDetailRentalId)?.conditionImages || [];
                updateRental(selectedDetailRentalId, { conditionImages: [...existing, ...arr] });
                showToast(`Đã đính kèm ${arr.length} hình ảnh trạng thái xe vào đơn thuê!`, 'success');
              }
            }
          }}
        />
      )}

      {/* Fullscreen Image Preview Modal */}
      {selectedPreviewImage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              onClick={() => setSelectedPreviewImage(null)}
              style={{ position: 'absolute', top: '-16px', right: '-16px', background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 'bold' }}
            >
              <X size={20} />
            </button>
            <img src={selectedPreviewImage} alt="Hình ảnh trạng thái xe" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />
          </div>
        </div>
      )}

    </div>
  );
};

export default Contracts;
