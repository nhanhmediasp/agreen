import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, Phone, MapPin, X, ArrowLeft, Edit, Image as ImageIcon, Receipt, Trash2 } from 'lucide-react';
import { useApp, type Owner } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';
import { Pagination } from '../components/Pagination';
import { confirmAction } from '../utils/confirmAction';

const Owners = () => {
  const {
    owners,
    addOwner,
    updateOwner,
    deleteOwner,
    createOwnerPayout,
    cars,
    rentals,
    showToast,
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const selectedOwnerId = searchParams.get('id');
  const setSelectedOwnerId = (id: string | null) => {
    if (id) {
      setSearchParams({ id });
    } else {
      setSearchParams({});
    }
  };

  // Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'add' | 'edit'>('add');

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newCommissionRate, setNewCommissionRate] = useState('75');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editCommissionRate, setEditCommissionRate] = useState('75');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const activeOwner = owners.find(o => o.id === selectedOwnerId);

  // Get cars owned by this owner
  const ownerCars = activeOwner 
    ? cars.filter(c => c.ownerPhone === activeOwner.phone)
    : [];

  const ownerCarIds = ownerCars.map(c => c.id);

  // Get rental history for owner's cars (newest first)
  const ownerRentals = activeOwner
    ? rentals
        .filter(r => ownerCarIds.includes(r.carId))
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    : [];

  // Owner rental history pagination
  const [ownerRentalPage, setOwnerRentalPage] = useState(1);
  const OWNER_RENTALS_PER_PAGE = 10;
  const ownerRentalTotalPages = Math.ceil(ownerRentals.length / OWNER_RENTALS_PER_PAGE);
  const pagedOwnerRentals = ownerRentals.slice((ownerRentalPage - 1) * OWNER_RENTALS_PER_PAGE, ownerRentalPage * OWNER_RENTALS_PER_PAGE);

  // Reset về trang 1 khi chuyển chủ xe
  useEffect(() => { setOwnerRentalPage(1); }, [selectedOwnerId]);

  // Financial direct payout calculations
  const completedOwnerRentals = ownerRentals.filter((rental) => rental.status === 'completed');
  const totalGrossRevenue = completedOwnerRentals.reduce((sum, r) => sum + r.totalAmount, 0);
  const ownerPayoutAmount = completedOwnerRentals.reduce((sum, r) => sum + (r.ownerCommissionAmount ?? 0), 0);
  const companyNetRevenue = totalGrossRevenue - ownerPayoutAmount;

  const filteredOwners = owners.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.phone.includes(searchTerm)
  );

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      showToast('Vui lòng nhập đầy đủ Tên và Số điện thoại!', 'error');
      return;
    }

    const ownerToAdd: Owner = {
      id: Date.now().toString(),
      name: newName,
      phone: newPhone,
      address: newAddress || 'Chưa cập nhật',
      notes: newNotes || 'Không có ghi chú.',
      image: newImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      commissionRate: parseInt(newCommissionRate) || 75
    };

    const success = await addOwner(ownerToAdd);
    if (success) {
      setShowAddForm(false);
      
      // Clear
      setNewName('');
      setNewPhone('');
      setNewAddress('');
      setNewNotes('');
      setNewImage('');
      setNewCommissionRate('75');
    }
  };

  const handleOpenEdit = () => {
    if (!activeOwner) return;
    setEditName(activeOwner.name);
    setEditPhone(activeOwner.phone);
    setEditAddress(activeOwner.address);
    setEditNotes(activeOwner.notes);
    setEditImage(activeOwner.image);
    setEditCommissionRate((activeOwner.commissionRate ?? 75).toString());
    setShowEditForm(true);
  };

  const handleUpdateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwnerId) return;

    const success = await updateOwner(selectedOwnerId, {
      name: editName,
      phone: editPhone,
      address: editAddress,
      notes: editNotes,
      image: editImage,
      commissionRate: parseInt(editCommissionRate) || 75
    });

    if (success) {
      setShowEditForm(false);
      showToast('Đã cập nhật thông tin chủ xe thành công!', 'success');
    }
  };

  const handleCreateCommissionExpense = async () => {
    if (!activeOwner) return;
    const now = new Date();
    const vietnamParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(now);
    const year = Number(vietnamParts.find((part) => part.type === 'year')?.value);
    const month = Number(vietnamParts.find((part) => part.type === 'month')?.value);
    const periodStart = new Date(Date.UTC(year, month - 1, 1) - 7 * 3_600_000);
    const periodEnd = new Date(Date.UTC(year, month, 1) - 7 * 3_600_000);
    const eligibleRentals = completedOwnerRentals.filter((rental) => {
      const completedAt = new Date(rental.returnedAt ?? rental.endDate);
      return completedAt >= periodStart && completedAt < periodEnd;
    });
    if (eligibleRentals.length === 0) {
      showToast('Không có hợp đồng hoàn thành trong tháng hiện tại để tạo payout.', 'error');
      return;
    }
    await createOwnerPayout(
      activeOwner.id,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      eligibleRentals.map((rental) => rental.id),
    );
  };

  const handleDeleteOwner = async () => {
    if (!selectedOwnerId) return;
    if (ownerCars.length > 0) {
      showToast('Không thể xóa chủ xe đang sở hữu xe hoạt động trong hệ thống!', 'error');
      return;
    }
    if (await confirmAction({
      title: 'Xoá chủ xe?',
      content: 'Chủ xe không có xe liên kết sẽ bị xoá khỏi hệ thống.',
      danger: true,
    })) {
      if (await deleteOwner(selectedOwnerId)) setSelectedOwnerId(null);
    }
  };

  return (
    <div className="owners-page" style={{ height: '100%' }}>
      {selectedOwnerId && activeOwner ? (
        /* Sub-page chi tiết chủ xe */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setSelectedOwnerId(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} /> Quay lại danh sách chủ xe
            </button>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Hồ sơ chủ xe: {activeOwner.name}</h1>
          </div>

          {/* Owner Financial & Vehicle Quick Stats */}
          <div className="grid grid-auto-sm gap-md">
            <div className="card" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Doanh số xe phát sinh</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {totalGrossRevenue.toLocaleString()} ₫
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ownerRentals.length} lượt thuê xe</div>
            </div>

            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tỷ lệ % chi trả gợi ý</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {activeOwner.commissionRate ?? 75}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Dùng tính tự động gợi ý khi tạo đơn</div>
            </div>

            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--status-maintenance-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Chi phí chiết khấu phải trả</span>
                <button 
                  onClick={handleCreateCommissionExpense}
                  className="btn-primary" 
                  style={{ padding: '3px 8px', fontSize: '11px', background: 'var(--primary)' }}
                  title="Tạo phiếu chi thanh toán cho chủ xe"
                >
                  <Receipt size={12} /> Tạo payout nháp tháng này
                </button>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-maintenance-text)', marginTop: '4px' }}>
                {ownerPayoutAmount.toLocaleString()} ₫
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Khoản trả lại cho chủ xe</div>
            </div>

            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--status-available-border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Doanh thu Agreen giữ lại</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-available-text)', marginTop: '4px' }}>
                {companyNetRevenue.toLocaleString()} ₫
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Lợi nhuận ròng của Agreen</div>
            </div>
          </div>

          <div className="grid grid-auto-lg gap-lg">
            
            {/* Cột trái: Thông tin cá nhân */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img src={activeOwner.image} alt={activeOwner.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>{activeOwner.name}</h2>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mã: #{activeOwner.id}</span>
                  </div>
                </div>
                <button className="btn-primary" onClick={handleOpenEdit} style={{ background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '6px 12px' }}>
                  <Edit size={14} style={{ marginRight: '6px' }} /> Chỉnh sửa
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={16} color="var(--primary)" />
                  <span>Số điện thoại: <strong>{activeOwner.phone}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <MapPin size={16} color="var(--primary)" style={{ marginTop: '2px' }} />
                  <span>Địa chỉ: <strong>{activeOwner.address}</strong></span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                  Ghi chú đối tác
                </label>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '14px', lineHeight: '1.5', minHeight: '80px' }}>
                  {activeOwner.notes}
                </div>
              </div>
            </div>

            {/* Cột phải: Danh sách xe sở hữu & Lịch sử doanh thu thuê */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Xe sở hữu */}
              <div className="card" style={{ padding: '24px 0' }}>
                <div style={{ padding: '0 24px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Danh sách xe sở hữu ({ownerCars.length})</h3>
                </div>
                <div className="responsive-desktop-table" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <th style={{ padding: '12px 24px' }}>Biển số</th>
                        <th style={{ padding: '12px 24px' }}>Dòng xe</th>
                        <th style={{ padding: '12px 24px' }}>Màu sắc</th>
                        <th style={{ padding: '12px 24px' }}>Số KM</th>
                        <th style={{ padding: '12px 24px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerCars.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Chủ xe này chưa đăng ký xe nào trên hệ thống.
                          </td>
                        </tr>
                      ) : (
                        ownerCars.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                            <td style={{ padding: '12px 24px', fontWeight: 600 }}>{c.id}</td>
                            <td style={{ padding: '12px 24px', fontWeight: 500 }}>
                              <Link 
                                to={`/fleet?id=${c.id}`}
                                style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                {c.name}
                              </Link>
                            </td>
                            <td style={{ padding: '12px 24px' }}>{c.color}</td>
                            <td style={{ padding: '12px 24px' }}>{c.km.toLocaleString()} km</td>
                            <td style={{ padding: '12px 24px' }}>
                              <span style={{ 
                                display: 'inline-block', 
                                padding: '2px 8px', 
                                borderRadius: '100px', 
                                fontSize: '11px', 
                                fontWeight: 600,
                                background: c.status === 'ready' ? 'var(--status-ready-bg)' : c.status === 'rented' ? 'var(--status-rented-bg)' : 'var(--status-maintenance-bg)',
                                color: c.status === 'ready' ? 'var(--status-ready-text)' : c.status === 'rented' ? 'var(--status-rented-text)' : 'var(--status-maintenance-text)'
                              }}>
                                {c.status === 'ready' ? 'Sẵn sàng' : c.status === 'rented' ? 'Đang thuê' : c.status === 'maintenance' ? 'Bảo trì' : 'Tạm ngưng'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="responsive-mobile-list entity-mobile-list entity-mobile-list-in-card">
                  {ownerCars.length === 0 ? (
                    <div className="entity-mobile-empty">Chủ xe này chưa đăng ký xe nào trên hệ thống.</div>
                  ) : (
                    ownerCars.map(car => (
                      <article className="entity-mobile-card" key={car.id}>
                        <div className="entity-mobile-head">
                          <div><strong>{car.id}</strong><span>{car.name}</span></div>
                          <span className={`entity-mobile-status ${car.status === 'ready' ? 'success' : car.status === 'rented' ? 'active' : 'warning'}`}>
                            {car.status === 'ready' ? 'Sẵn sàng' : car.status === 'rented' ? 'Đang thuê' : car.status === 'maintenance' ? 'Bảo trì' : 'Tạm ngưng'}
                          </span>
                        </div>
                        <div className="entity-mobile-fields">
                          <div><span>Màu sắc</span><strong>{car.color}</strong></div>
                          <div><span>Số KM</span><strong>{car.km.toLocaleString()} km</strong></div>
                        </div>
                        <div className="entity-mobile-actions">
                          <Link to={`/fleet?id=${car.id}`}>Xem chi tiết xe</Link>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              {/* Lịch sử thuê xe */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Lịch sử lượt thuê xe</h3>
                </div>
                <table className="responsive-desktop-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <th style={{ padding: '12px 24px' }}>Mã hợp đồng</th>
                      <th style={{ padding: '12px 24px' }}>Biển số</th>
                      <th style={{ padding: '12px 24px' }}>Khách hàng</th>
                      <th style={{ padding: '12px 24px' }}>Doanh thu</th>
                      <th style={{ padding: '12px 24px' }}>Thời gian thuê</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerRentals.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          Chưa phát sinh lượt thuê nào đối với các xe của chủ xe này.
                        </td>
                      </tr>
                    ) : (
                      pagedOwnerRentals.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                          <td style={{ padding: '12px 24px', fontWeight: 600 }}>{r.id}</td>
                          <td style={{ padding: '12px 24px' }}>
                            <span className="license-plate" style={{ fontSize: '11px', padding: '2px 8px' }}>{r.carId}</span>
                          </td>
                          <td style={{ padding: '12px 24px' }}>{r.customerName}</td>
                          <td style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--accent)' }}>{r.totalAmount.toLocaleString()} ₫</td>
                          <td style={{ padding: '12px 24px', color: 'var(--text-secondary)' }}>
                            {new Date(r.startDate).toLocaleDateString('vi-VN')} → {new Date(r.endDate).toLocaleDateString('vi-VN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="responsive-mobile-list entity-mobile-list entity-mobile-list-in-card">
                  {ownerRentals.length === 0 ? (
                    <div className="entity-mobile-empty">Chưa phát sinh lượt thuê nào đối với các xe của chủ xe này.</div>
                  ) : (
                    pagedOwnerRentals.map(rental => (
                      <article className="entity-mobile-card" key={rental.id}>
                        <div className="entity-mobile-head">
                          <div><strong>#{rental.id}</strong><span>{rental.carId}</span></div>
                        </div>
                        <div className="entity-mobile-fields">
                          <div><span>Khách hàng</span><strong>{rental.customerName}</strong></div>
                          <div><span>Thời gian thuê</span><strong>{new Date(rental.startDate).toLocaleDateString('vi-VN')} → {new Date(rental.endDate).toLocaleDateString('vi-VN')}</strong></div>
                          <div><span>Doanh thu</span><strong className="entity-mobile-amount">{rental.totalAmount.toLocaleString()} ₫</strong></div>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                {/* Phân trang lịch sử thuê xe */}
                {ownerRentalTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-main)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Hiển thị <strong>{(ownerRentalPage - 1) * OWNER_RENTALS_PER_PAGE + 1}</strong>–<strong>{Math.min(ownerRentalPage * OWNER_RENTALS_PER_PAGE, ownerRentals.length)}</strong> / <strong>{ownerRentals.length}</strong> lượt thuê
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        disabled={ownerRentalPage === 1}
                        onClick={() => setOwnerRentalPage(p => p - 1)}
                        style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: ownerRentalPage === 1 ? '#f1f5f9' : 'white', color: ownerRentalPage === 1 ? 'var(--text-secondary)' : 'var(--text-main)', cursor: ownerRentalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: ownerRentalPage === 1 ? 0.5 : 1 }}
                      >‹</button>

                      {Array.from({ length: ownerRentalTotalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setOwnerRentalPage(page)}
                          style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: ownerRentalPage === page ? '1.5px solid var(--primary)' : '1px solid var(--border-strong)', background: ownerRentalPage === page ? 'var(--primary)' : 'white', color: ownerRentalPage === page ? 'white' : 'var(--text-main)', cursor: 'pointer', fontSize: '13px', fontWeight: ownerRentalPage === page ? 800 : 400, minWidth: '32px' }}
                        >{page}</button>
                      ))}

                      <button
                        type="button"
                        disabled={ownerRentalPage === ownerRentalTotalPages}
                        onClick={() => setOwnerRentalPage(p => p + 1)}
                        style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: ownerRentalPage === ownerRentalTotalPages ? '#f1f5f9' : 'white', color: ownerRentalPage === ownerRentalTotalPages ? 'var(--text-secondary)' : 'var(--text-main)', cursor: ownerRentalPage === ownerRentalTotalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: ownerRentalPage === ownerRentalTotalPages ? 0.5 : 1 }}
                      >›</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* Danh sách chủ xe chính */
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Quản lý Đối tác góp xe (Chủ xe)
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
                  Chủ xe
                </span>
              </div>
              <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
                Danh sách đối tác gửi xe, tỷ lệ chiết khấu, thông tin thanh toán và số lượng xe quản lý
              </p>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600 }}
            >
              <Plus size={18} />
              Thêm chủ xe mới
            </button>
          </div>

          {selectedOwnerIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,104,55,0.08)', border: '1px solid var(--primary)', padding: '12px 24px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                Đã chọn {selectedOwnerIds.length} đối tác chủ xe
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={async () => {
                    const rate = window.prompt("Nhập tỷ lệ chia hoa hồng (%) mới cho các chủ xe đã chọn (từ 0 đến 100):");
                    if (rate !== null && !isNaN(Number(rate))) {
                      const results = await Promise.all(selectedOwnerIds.map(id => updateOwner(id, { commissionRate: Number(rate) })));
                      if (results.every(Boolean)) {
                        setSelectedOwnerIds([]);
                        showToast('Đã cập nhật tỷ lệ chia hoa hồng hàng loạt!', 'success');
                      }
                    }
                  }}
                  className="btn-secondary"
                  style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 14px' }}
                >
                  Sửa hoa hồng hàng loạt
                </button>
                <button 
                  onClick={async () => {
                    if (await confirmAction({
                      title: `Xoá ${selectedOwnerIds.length} chủ xe?`,
                      content: 'Chỉ các chủ xe không còn dữ liệu liên kết mới có thể xoá.',
                      danger: true,
                    })) {
                      const results = await Promise.all(selectedOwnerIds.map(id => deleteOwner(id)));
                      if (results.every(Boolean)) {
                        setSelectedOwnerIds([]);
                        showToast('Đã xóa hàng loạt chủ xe thành công!', 'success');
                      }
                    }
                  }}
                  className="btn-secondary" 
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', gap: '6px', padding: '6px 14px' }}
                >
                  <Trash2 size={15} /> Xóa hàng loạt
                </button>
                <button onClick={() => setSelectedOwnerIds([])} className="btn-ghost" style={{ fontSize: '14px', padding: '6px 12px' }}>
                  Hủy chọn
                </button>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '16px 24px', display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '8px 16px', borderRadius: 'var(--radius-md)', flex: 1 }}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Tìm theo tên hoặc số điện thoại chủ xe..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ border: 'none', background: 'transparent', marginLeft: '8px', outline: 'none', width: '100%', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div className="card responsive-desktop-table" style={{ padding: 0, overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <th style={{ padding: '16px 24px', width: '50px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={filteredOwners.length > 0 && filteredOwners.every(o => selectedOwnerIds.includes(o.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOwnerIds(filteredOwners.map(o => o.id));
                        } else {
                          setSelectedOwnerIds([]);
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '16px 24px', fontWeight: 500, width: '80px' }}>STT</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Chủ xe</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Số điện thoại</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Địa chỉ</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Số xe sở hữu</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Tổng chi trả (₫)</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Ghi chú</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500, width: '100px' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredOwners.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Không tìm thấy chủ xe nào.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedOwners = filteredOwners.slice(startIndex, startIndex + itemsPerPage);

                    return paginatedOwners.map((o, idx) => {
                      const oCars = cars.filter(c => c.ownerPhone === o.phone);
                      const oCarIds = oCars.map(c => c.id);
                      const oRentals = rentals.filter(
                        (rental) => oCarIds.includes(rental.carId) && rental.status === 'completed',
                      );
                      const oPayoutTotal = oRentals.reduce(
                        (sum, rental) => sum + (rental.ownerCommissionAmount ?? 0),
                        0,
                      );

                      return (
                        <tr 
                          key={o.id} 
                          onClick={() => setSelectedOwnerId(o.id)}
                          style={{ 
                            borderBottom: '1px solid var(--border-light)', 
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          <td style={{ padding: '16px 24px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={selectedOwnerIds.includes(o.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOwnerIds(prev => [...prev, o.id]);
                                } else {
                                  setSelectedOwnerIds(prev => prev.filter(id => id !== o.id));
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-secondary)' }}>{startIndex + idx + 1}</td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={o.image} alt={o.name} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-strong)' }} />
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{o.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: #{o.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Phone size={14} />
                              {o.phone}
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>{o.address}</td>
                          <td style={{ padding: '16px 24px', fontWeight: 700 }}>{oCars.length} xe</td>
                          <td style={{ padding: '16px 24px', fontWeight: 800, color: 'var(--primary)' }}>
                            {oPayoutTotal.toLocaleString()} ₫
                          </td>
                          <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>{o.notes}</td>
                          <td style={{ padding: '16px 24px' }} onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={async () => {
                                if (await confirmAction({
                                  title: `Xoá chủ xe ${o.name}?`,
                                  content: 'Hành động chỉ thành công khi chủ xe không còn xe liên kết.',
                                  danger: true,
                                })) {
                                  await deleteOwner(o.id);
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Xóa chủ xe"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredOwners.length / itemsPerPage)}
              totalItems={filteredOwners.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              unitName="chủ xe"
            />
          </div>

          <div className="responsive-mobile-list entity-mobile-list">
            {filteredOwners.length === 0 ? (
              <div className="entity-mobile-empty">Không tìm thấy chủ xe nào.</div>
            ) : (
              filteredOwners
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map(owner => {
                  const ownerCarsForCard = cars.filter(car => car.ownerPhone === owner.phone);
                  const ownerCarIdsForCard = ownerCarsForCard.map(car => car.id);
                  const ownerPayoutTotal = rentals
                    .filter(rental => ownerCarIdsForCard.includes(rental.carId) && rental.status === 'completed')
                    .reduce((sum, rental) => sum + (rental.ownerCommissionAmount ?? 0), 0);

                  return (
                    <article
                      className="entity-mobile-card entity-mobile-card-clickable"
                      key={owner.id}
                      onClick={() => setSelectedOwnerId(owner.id)}
                    >
                      <div className="entity-mobile-head">
                        <div className="entity-mobile-person">
                          <input
                            type="checkbox"
                            checked={selectedOwnerIds.includes(owner.id)}
                            onClick={event => event.stopPropagation()}
                            onChange={event => {
                              setSelectedOwnerIds(current => event.target.checked
                                ? [...current, owner.id]
                                : current.filter(id => id !== owner.id));
                            }}
                            aria-label={`Chọn chủ xe ${owner.name}`}
                          />
                          <img src={owner.image} alt={owner.name} />
                          <div><strong>{owner.name}</strong><span>ID: #{owner.id}</span></div>
                        </div>
                      </div>
                      <div className="entity-mobile-fields">
                        <div><span>Số điện thoại</span><strong>{owner.phone}</strong></div>
                        <div><span>Địa chỉ</span><strong>{owner.address || 'Chưa cập nhật'}</strong></div>
                        <div><span>Tỷ lệ chi trả</span><strong>{owner.commissionRate ?? 75}%</strong></div>
                        <div><span>Xe sở hữu</span><strong>{ownerCarsForCard.map(car => car.id).join(', ') || 'Chưa có xe'}</strong></div>
                        <div><span>Tổng chi trả</span><strong className="entity-mobile-amount">{ownerPayoutTotal.toLocaleString()} ₫</strong></div>
                        <div><span>Ghi chú</span><strong>{owner.notes || 'Không có ghi chú'}</strong></div>
                      </div>
                      <div className="entity-mobile-actions">
                        <button type="button" onClick={event => { event.stopPropagation(); setSelectedOwnerId(owner.id); }}>
                          Xem thông tin
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={async event => {
                            event.stopPropagation();
                            if (await confirmAction({
                              title: `Xoá chủ xe ${owner.name}?`,
                              content: 'Hành động chỉ thành công khi chủ xe không còn xe liên kết.',
                              danger: true,
                            })) {
                              await deleteOwner(owner.id);
                            }
                          }}
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </article>
                  );
                })
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredOwners.length / itemsPerPage)}
              totalItems={filteredOwners.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              unitName="chủ xe"
            />
          </div>
        </div>
      )}

      {/* Add Owner Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleCreateOwner} style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Thêm chủ xe/đối tác mới</h2>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Họ và tên *</label>
              <input type="text" placeholder="VD: Nguyễn Thị E" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số điện thoại *</label>
              <input type="tel" placeholder="VD: 0901234567" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit' }} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Địa chỉ</label>
              <input type="text" placeholder="Nhập địa chỉ" value={newAddress} onChange={e => setNewAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Tỷ lệ % chi trả gợi ý (%) *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  placeholder="75" 
                  value={newCommissionRate} 
                  onChange={e => setNewCommissionRate(e.target.value)} 
                  style={{ width: '110px', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', fontWeight: 700 }} 
                  required 
                />
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>% (Hệ thống tự tính tiền gợi ý khi tạo đơn)</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh / Avatar</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {newImage ? (
                  <img src={newImage} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-main)', border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={18} color="var(--text-secondary)" />
                  </div>
                )}
                <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 12px' }} onClick={() => { setGalleryTarget('add'); setShowGallery(true); }}>
                  Chọn ảnh
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Ghi chú riêng</label>
              <textarea placeholder="VD: Đối tác gửi xe 5 chỗ, chia sẻ hoa hồng 10%..." value={newNotes} onChange={e => setNewNotes(e.target.value)} style={{ width: '100%', height: '80px', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
              <button type="submit" className="btn-primary">Thêm chủ xe</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Owner Modal */}
      {showEditForm && activeOwner && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleUpdateOwner} style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Chỉnh sửa thông tin đối tác</h2>
              <button type="button" onClick={() => setShowEditForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Họ và tên *</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số điện thoại *</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit' }} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Địa chỉ</label>
              <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Tỷ lệ % chi trả gợi ý (%) *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  placeholder="75" 
                  value={editCommissionRate} 
                  onChange={e => setEditCommissionRate(e.target.value)} 
                  style={{ width: '110px', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', fontWeight: 700 }} 
                  required 
                />
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>% (Hệ thống tự tính tiền gợi ý khi tạo đơn)</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh / Avatar</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={editImage} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 12px' }} onClick={() => { setGalleryTarget('edit'); setShowGallery(true); }}>
                  Thay đổi ảnh
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Ghi chú riêng</label>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ width: '100%', height: '80px', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '12px' }}>
              <button type="button" className="btn-primary" onClick={handleDeleteOwner} style={{ background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', border: 'none' }}>
                Xóa đối tác này
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowEditForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
                <button type="submit" className="btn-primary">Cập nhật</button>
              </div>
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

export default Owners;
