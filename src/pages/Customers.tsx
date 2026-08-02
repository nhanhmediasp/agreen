import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Tag, Modal, Form } from 'antd';
import { Search, Plus, Phone, FileCheck, AlertCircle, MapPin, FileText, ArrowLeft, Trash2 } from 'lucide-react';
import { useApp, type Customer } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';
import { Pagination } from '../components/Pagination';
import { confirmAction } from '../utils/confirmAction';

const Customers = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, rentals, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const selectedCustomerId = searchParams.get('id');
  const setSelectedCustomerId = (id: string | null) => {
    if (id) {
      setSearchParams({ id });
    } else {
      setSearchParams({});
    }
  };

  // Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLicense, setNewLicense] = useState('');
  const [newCccd, setNewCccd] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newClass, setNewClass] = useState<'normal' | 'vip' | 'warning'>('normal');
  const [newNotes, setNewNotes] = useState('');
  const [newImage, setNewImage] = useState('');

  // Edit Customer State
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editCccd, setEditCccd] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editClass, setEditClass] = useState<'normal' | 'vip' | 'warning'>('normal');
  const [editNotes, setEditNotes] = useState('');
  const [editImage, setEditImage] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Selected customer details
  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const [noteDraft, setNoteDraft] = useState('');
  useEffect(() => {
    setNoteDraft(activeCustomer?.notes ?? '');
  }, [activeCustomer?.id, activeCustomer?.notes]);
  // Get rental history for active customer
  const customerHistory = activeCustomer 
    ? rentals.filter(r => r.customerPhone === activeCustomer.phone)
    : [];

  const filteredCustomerHistory = customerHistory.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(historySearch.toLowerCase()) || r.carId.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus = historyStatusFilter === 'all' 
      ? true 
      : historyStatusFilter === 'active' 
        ? r.status === 'active' 
        : r.status === 'completed';
    return matchesSearch && matchesStatus;
  });

  // Calculate customer metrics
  const totalCustomerSpent = customerHistory
    .filter((rental) => rental.status === 'completed')
    .reduce((sum, rental) => sum + rental.totalAmount, 0);
  const activeRentalsCount = customerHistory.filter(r => r.status === 'active').length;
  const completedRentalsCount = customerHistory.filter(r => r.status === 'completed').length;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleOpenEditCustomer = () => {
    if (!activeCustomer) return;
    setEditName(activeCustomer.name);
    setEditPhone(activeCustomer.phone);
    setEditLicense(activeCustomer.license.replace('GPLX: ', ''));
    setEditCccd(activeCustomer.cccd);
    setEditAddress(activeCustomer.address);
    setEditClass(activeCustomer.classification);
    setEditNotes(activeCustomer.notes);
    setEditImage(activeCustomer.image);
    setShowEditForm(true);
  };

  const handleUpdateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    const success = await updateCustomer(selectedCustomerId, {
      name: editName,
      phone: editPhone,
      license: `GPLX: ${editLicense}`,
      cccd: editCccd,
      address: editAddress,
      classification: editClass,
      notes: editNotes,
      image: editImage
    });
    if (success) {
      setShowEditForm(false);
      showToast('Đã cập nhật thông tin khách hàng thành công!', 'success');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newLicense || !newCccd) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc!', 'error');
      return;
    }

    const existingCustomer = customers.find(c => c.phone === newPhone);
    if (existingCustomer) {
      showToast('Số điện thoại khách hàng đã tồn tại trong hệ thống!', 'error');
      return;
    }

    const customerToAdd: Customer = {
      id: Date.now().toString(),
      name: newName,
      phone: newPhone,
      license: `GPLX: ${newLicense}`,
      cccd: newCccd,
      address: newAddress || 'Chưa cập nhật',
      classification: newClass,
      notes: newNotes || 'Không có ghi chú.',
      activeRentals: 0,
      totalRentals: 0,
      status: 'verified',
      statusText: 'Đã xác minh',
      image: newImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    };

    if (!await addCustomer(customerToAdd)) return;
    setShowAddForm(false);
    
    // Clear
    setNewName('');
    setNewPhone('');
    setNewLicense('');
    setNewCccd('');
    setNewAddress('');
    setNewClass('normal');
    setNewNotes('');
    setNewImage('');
  };

  const handleUpdateNotes = async () => {
    if (!selectedCustomerId) return;
    await updateCustomer(selectedCustomerId, { notes: noteDraft });
  };

  return (
    <div className="customers-page" style={{ height: '100%' }}>
      {selectedCustomerId && activeCustomer ? (
        /* Sub-page chi tiết khách hàng */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={() => setSelectedCustomerId(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <ArrowLeft size={16} /> Quay lại danh sách khách
              </button>
              <h1 style={{ fontSize: '24px', margin: 0 }}>Hồ sơ khách hàng: {activeCustomer.name}</h1>
            </div>

            <button 
              className="btn-primary"
              onClick={handleOpenEditCustomer}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Chỉnh sửa thông tin
            </button>
          </div>

          {/* Customer Quick Financial Stats */}
          <div className="grid grid-auto-sm gap-md">
            <div className="card" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tổng doanh số / Chi tiêu</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-ready-text)', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>
                {totalCustomerSpent.toLocaleString()} ₫
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tổng số lượt thuê</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>
                {activeCustomer.totalRentals} lượt
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Đơn đang thuê</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-rented-text)', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>
                {activeRentalsCount} đơn
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Đơn đã hoàn thành</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>
                {completedRentalsCount} đơn
              </div>
            </div>
          </div>

          <div className="grid grid-auto-lg gap-lg">
            {/* Cột trái: Thông tin cá nhân */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img src={activeCustomer.image} alt={activeCustomer.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>{activeCustomer.name}</h2>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ID: #{activeCustomer.id}</span>
                  </div>
                </div>
                <div>
                  {activeCustomer.classification === 'vip' ? (
                    <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '100px', background: '#fef3c7', color: '#d97706', fontSize: '13px', fontWeight: 700 }}>
                      ⭐ VIP
                    </span>
                  ) : activeCustomer.classification === 'warning' ? (
                    <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '100px', background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', fontSize: '13px', fontWeight: 700 }}>
                      ⚠️ Cần chú ý
                    </span>
                  ) : (
                    <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '100px', background: '#f1f5f9', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                      Khách thường
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={16} color="var(--primary)" />
                  <span>Số điện thoại: <strong>{activeCustomer.phone}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} color="var(--primary)" />
                  <span>Số CCCD: <strong>{activeCustomer.cccd}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} color="var(--primary)" />
                  <span>Giấy phép lái xe: <strong>{activeCustomer.license}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <MapPin size={16} color="var(--primary)" style={{ marginTop: '2px' }} />
                  <span>Địa chỉ thường trú: <strong>{activeCustomer.address}</strong></span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {activeCustomer.status === 'verified' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '100px', background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '13px', fontWeight: 700 }}>
                      <FileCheck size={15} /> {activeCustomer.statusText || 'Đã xác minh'}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '100px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontSize: '13px', fontWeight: 700 }}>
                      <AlertCircle size={15} /> {activeCustomer.statusText || 'GPLX hết hạn'}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                  Ghi chú nội bộ (Chỉnh sửa trực tiếp)
                </label>
                <textarea 
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  style={{ width: '100%', height: '120px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '14px', fontFamily: 'inherit', resize: 'none', lineHeight: '1.5' }}
                />
                <button type="button" className="btn-primary" onClick={handleUpdateNotes} style={{ marginTop: '8px' }}>
                  Lưu ghi chú
                </button>
              </div>
            </div>

            {/* Cột phải: Lịch sử thuê + Bộ lọc & Tìm kiếm */}
            <div className="card customer-history-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Lịch sử giao dịch & đơn thuê</h3>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>Tổng đơn: {customerHistory.length}</span>
                </div>

                {/* Filter and Search Bar for History */}
                <div className="entity-history-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 'var(--radius-md)', flex: 1 }}>
                    <Search size={16} color="var(--text-secondary)" />
                    <input 
                      type="text" 
                      placeholder="Tìm theo mã đơn hoặc biển số xe..." 
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', marginLeft: '8px', outline: 'none', width: '100%', fontSize: '13px' }}
                    />
                  </div>
                  <select 
                    value={historyStatusFilter}
                    onChange={e => setHistoryStatusFilter(e.target.value as 'all' | 'active' | 'completed')}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '13px' }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang thuê</option>
                    <option value="completed">Đã trả / Hoàn thành</option>
                  </select>
                </div>
              </div>

              <table className="responsive-desktop-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <th style={{ padding: '12px 24px' }}>Mã hợp đồng</th>
                    <th style={{ padding: '12px 24px' }}>Xe thuê</th>
                    <th style={{ padding: '12px 24px' }}>Thời gian thuê</th>
                    <th style={{ padding: '12px 24px' }}>Tổng thanh toán</th>
                    <th style={{ padding: '12px 24px' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomerHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Chưa phát sinh giao dịch phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomerHistory.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 600 }}>{r.id}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span className="license-plate" style={{ fontSize: '11px', padding: '2px 8px' }}>{r.carId}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          {new Date(r.startDate).toLocaleDateString('vi-VN')} → {new Date(r.endDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--accent)' }}>
                          {r.totalAmount.toLocaleString()} ₫
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          {r.status === 'active' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '100px', background: 'var(--status-rented-bg)', color: 'var(--status-rented-text)', fontSize: '11px', fontWeight: 600 }}>
                              Đang chạy
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '100px', background: 'var(--status-ready-bg)', color: 'var(--status-ready-text)', fontSize: '11px', fontWeight: 600 }}>
                              Đã trả xe
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="responsive-mobile-list entity-mobile-list entity-mobile-list-in-card">
                {filteredCustomerHistory.length === 0 ? (
                  <div className="entity-mobile-empty">Chưa phát sinh giao dịch phù hợp.</div>
                ) : (
                  filteredCustomerHistory.map(rental => (
                    <article className="entity-mobile-card" key={rental.id}>
                      <div className="entity-mobile-head">
                        <div><strong>#{rental.id}</strong><span>{rental.carId}</span></div>
                        <span className={`entity-mobile-status ${rental.status === 'active' ? 'active' : 'success'}`}>
                          {rental.status === 'active' ? 'Đang thuê' : 'Đã trả xe'}
                        </span>
                      </div>
                      <div className="entity-mobile-fields">
                        <div><span>Thời gian thuê</span><strong>{new Date(rental.startDate).toLocaleDateString('vi-VN')} → {new Date(rental.endDate).toLocaleDateString('vi-VN')}</strong></div>
                        <div><span>Tổng thanh toán</span><strong className="entity-mobile-amount">{rental.totalAmount.toLocaleString()} ₫</strong></div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Danh sách khách hàng chính */
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Quản lý Khách hàng
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
                  Khách hàng
                </span>
              </div>
              <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
                Danh sách thông tin cá nhân, liên hệ, lịch sử thuê xe và tình trạng thanh toán của khách hàng
              </p>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600 }}
            >
              <Plus size={18} />
              Thêm khách hàng
            </button>
          </div>

          {selectedCustomerIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,104,55,0.08)', border: '1px solid var(--primary)', padding: '12px 24px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                Đã chọn {selectedCustomerIds.length} khách hàng
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select 
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (await confirmAction({
                      title: 'Đổi phân loại hàng loạt?',
                      content: `${selectedCustomerIds.length} khách hàng sẽ được cập nhật phân loại.`,
                    })) {
                      const results = await Promise.all(selectedCustomerIds.map(id => updateCustomer(id, { classification: val as Customer['classification'] })));
                      if (results.every(Boolean)) {
                        setSelectedCustomerIds([]);
                        showToast('Đã cập nhật phân loại hàng loạt!', 'success');
                      }
                    }
                    e.target.value = '';
                  }}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', outline: 'none' }}
                >
                  <option value="">-- Sửa phân loại hàng loạt --</option>
                  <option value="normal">Bình thường</option>
                  <option value="vip">Khách VIP ⭐</option>
                  <option value="warning">Khách Cần Chú Ý ⚠️</option>
                </select>
                <button 
                  onClick={async () => {
                    if (await confirmAction({
                      title: `Xoá ${selectedCustomerIds.length} khách hàng?`,
                      content: 'Khách hàng có hợp đồng liên kết sẽ không thể xoá.',
                      danger: true,
                    })) {
                      const results = await Promise.all(selectedCustomerIds.map(id => deleteCustomer(id)));
                      if (results.every(Boolean)) {
                        setSelectedCustomerIds([]);
                        showToast('Đã xóa hàng loạt thành công!', 'success');
                      }
                    }
                  }}
                  className="btn-secondary" 
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', gap: '6px', padding: '6px 14px' }}
                >
                  <Trash2 size={15} /> Xóa hàng loạt
                </button>
                <button onClick={() => setSelectedCustomerIds([])} className="btn-ghost" style={{ fontSize: '14px', padding: '6px 12px' }}>
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
                placeholder="Tìm theo tên hoặc số điện thoại..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ border: 'none', background: 'transparent', marginLeft: '8px', outline: 'none', width: '100%', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div className="card responsive-desktop-table" style={{ padding: 0, overflowX: 'auto', width: '100%', background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <Table<Customer>
              dataSource={filteredCustomers}
              rowKey="id"
              onRow={(customer: Customer) => ({
                onClick: (e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('.ant-checkbox-wrapper') || target.closest('.ant-table-selection-column')) {
                    return;
                  }
                  setSelectedCustomerId(customer.id);
                },
                style: { cursor: 'pointer' }
              })}
              rowSelection={{
                selectedRowKeys: selectedCustomerIds,
                onChange: (keys: React.Key[]) => setSelectedCustomerIds(keys as string[])
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total: number, range: [number, number]) => `Hiển thị ${range[0]}-${range[1]} / ${total} khách hàng`
              }}
              columns={[
                {
                  title: 'Khách hàng',
                  dataIndex: 'name',
                  key: 'name',
                  sorter: (a: Customer, b: Customer) => a.name.localeCompare(b.name),
                  render: (_: unknown, record: Customer) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={record.image} alt={record.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #f0f0f0' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#262626' }}>{record.name}</div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>ID: #{record.id}</div>
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Số điện thoại',
                  dataIndex: 'phone',
                  key: 'phone',
                  render: (phone: string) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#595959' }}>
                      <Phone size={14} />
                      {phone}
                    </div>
                  )
                },
                {
                  title: 'Phân loại',
                  dataIndex: 'classification',
                  key: 'classification',
                  filters: [
                    { text: '⭐ VIP', value: 'vip' },
                    { text: 'Thường', value: 'normal' },
                    { text: '⚠️ Chú ý', value: 'warning' },
                  ],
                  onFilter: (value: boolean | React.Key, record: Customer) => record.classification === value,
                  render: (classification: string) => {
                    if (classification === 'vip') return <Tag color="gold" style={{ borderRadius: 12, fontWeight: 700 }}>⭐ VIP</Tag>;
                    if (classification === 'warning') return <Tag color="error" style={{ borderRadius: 12, fontWeight: 700 }}>⚠️ Chú ý</Tag>;
                    return <Tag color="default" style={{ borderRadius: 12, fontWeight: 600 }}>Thường</Tag>;
                  }
                },
                {
                  title: 'Trạng thái hồ sơ',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string, record: Customer) => {
                    if (status === 'verified') return <Tag color="success" style={{ borderRadius: 12, fontWeight: 700 }}>✓ {record.statusText || 'Đã xác minh'}</Tag>;
                    return <Tag color="error" style={{ borderRadius: 12, fontWeight: 700 }}>⚠️ {record.statusText || 'GPLX hết hạn'}</Tag>;
                  }
                },
                {
                  title: 'Đơn hoạt động',
                  dataIndex: 'activeRentals',
                  key: 'activeRentals',
                  sorter: (a: Customer, b: Customer) => a.activeRentals - b.activeRentals,
                  render: (count: number) => <span style={{ fontWeight: 600, color: '#262626' }}>{count}</span>
                },
                {
                  title: 'Hành động',
                  key: 'actions',
                  render: (_: unknown, record: Customer) => (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirmAction({
                          title: `Xoá khách hàng ${record.name}?`,
                          content: 'Khách hàng có hợp đồng liên kết sẽ không thể xoá.',
                          danger: true,
                        })) {
                          await deleteCustomer(record.id);
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                      title="Xóa khách hàng"
                    >
                      <Trash2 size={16} />
                    </button>
                  )
                }
              ]}
            />
          </div>

          <div className="responsive-mobile-list entity-mobile-list">
            {filteredCustomers.length === 0 ? (
              <div className="entity-mobile-empty">Không tìm thấy khách hàng phù hợp.</div>
            ) : (
              filteredCustomers
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map(customer => (
                  <article
                    className="entity-mobile-card entity-mobile-card-clickable"
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <div className="entity-mobile-head">
                      <div className="entity-mobile-person">
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.includes(customer.id)}
                          onClick={event => event.stopPropagation()}
                          onChange={event => {
                            setSelectedCustomerIds(current => event.target.checked
                              ? [...current, customer.id]
                              : current.filter(id => id !== customer.id));
                          }}
                          aria-label={`Chọn khách hàng ${customer.name}`}
                        />
                        <img src={customer.image} alt={customer.name} />
                        <div><strong>{customer.name}</strong><span>ID: #{customer.id}</span></div>
                      </div>
                      <span className={`entity-mobile-status ${customer.status === 'verified' ? 'success' : 'warning'}`}>
                        {customer.statusText || (customer.status === 'verified' ? 'Đã xác minh' : 'Cần kiểm tra')}
                      </span>
                    </div>
                    <div className="entity-mobile-fields">
                      <div><span>Số điện thoại</span><strong>{customer.phone}</strong></div>
                      <div><span>Số CCCD</span><strong>{customer.cccd || 'Chưa cập nhật'}</strong></div>
                      <div><span>Giấy phép lái xe</span><strong>{customer.license || 'Chưa cập nhật'}</strong></div>
                      <div><span>Địa chỉ</span><strong>{customer.address || 'Chưa cập nhật'}</strong></div>
                      <div><span>Phân loại</span><strong>{customer.classification === 'vip' ? '⭐ VIP' : customer.classification === 'warning' ? '⚠️ Cần chú ý' : 'Khách thường'}</strong></div>
                      <div><span>Đơn đang thuê</span><strong>{customer.activeRentals}</strong></div>
                    </div>
                    <div className="entity-mobile-actions">
                      <button type="button" onClick={event => { event.stopPropagation(); setSelectedCustomerId(customer.id); }}>
                        Xem thông tin
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={async event => {
                          event.stopPropagation();
                          if (await confirmAction({
                            title: `Xoá khách hàng ${customer.name}?`,
                            content: 'Khách hàng có hợp đồng liên kết sẽ không thể xoá.',
                            danger: true,
                          })) {
                            await deleteCustomer(customer.id);
                          }
                        }}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </article>
                ))
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredCustomers.length / itemsPerPage)}
              totalItems={filteredCustomers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              unitName="khách hàng"
            />
          </div>
        </div>
      )}

      {/* Add Customer Modal - Ant Design Modal & Form */}
      <Modal
        title="Thêm khách hàng mới"
        open={showAddForm}
        onCancel={() => setShowAddForm(false)}
        footer={null}
        width={520}
      >
        <Form layout="vertical" onFinish={handleCreateCustomer} style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Họ và tên" required style={{ flex: 1.5 }}>
              <input type="text" placeholder="VD: Nguyễn Văn A" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
            </Form.Item>
            <Form.Item label="Phân loại" style={{ flex: 1 }}>
              <select value={newClass} onChange={e => setNewClass(e.target.value as Customer['classification'])} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
                <option value="normal">Bình thường</option>
                <option value="vip">Khách VIP ⭐</option>
                <option value="warning">Khách Cần Chú Ý ⚠️</option>
              </select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Số điện thoại" required style={{ flex: 1 }}>
              <input type="tel" placeholder="VD: 0901234567" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
            </Form.Item>
            <Form.Item label="Số CCCD" required style={{ flex: 1 }}>
              <input type="text" placeholder="Nhập số CCCD" value={newCccd} onChange={e => setNewCccd(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
            </Form.Item>
          </div>

          <Form.Item label="Số GPLX" required>
            <input type="text" placeholder="VD: 790123456789" value={newLicense} onChange={e => setNewLicense(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
          </Form.Item>

          <Form.Item label="Địa chỉ thường trú">
            <input type="text" placeholder="Nhập địa chỉ" value={newAddress} onChange={e => setNewAddress(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
          </Form.Item>

          <Form.Item label="Ghi chú nội bộ">
            <textarea placeholder="VD: Khách trả xe đúng giờ." value={newNotes} onChange={e => setNewNotes(e.target.value)} style={{ width: '100%', height: '70px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', resize: 'vertical' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Thêm khách</button>
          </div>
        </Form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        title="Chỉnh sửa thông tin khách hàng"
        open={showEditForm}
        onCancel={() => setShowEditForm(false)}
        footer={null}
        width={520}
      >
        <Form layout="vertical" onFinish={handleUpdateCustomerSubmit} style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Họ và tên" required style={{ flex: 1.5 }}>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
            </Form.Item>
            <Form.Item label="Phân loại" style={{ flex: 1 }}>
              <select value={editClass} onChange={e => setEditClass(e.target.value as Customer['classification'])} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
                <option value="normal">Bình thường</option>
                <option value="vip">Khách VIP ⭐</option>
                <option value="warning">Khách Cần Chú Ý ⚠️</option>
              </select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Số điện thoại" required style={{ flex: 1 }}>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
            </Form.Item>
            <Form.Item label="Số CCCD" required style={{ flex: 1 }}>
              <input type="text" value={editCccd} onChange={e => setEditCccd(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
            </Form.Item>
          </div>

          <Form.Item label="Số GPLX" required>
            <input type="text" value={editLicense} onChange={e => setEditLicense(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
          </Form.Item>

          <Form.Item label="Địa chỉ thường trú">
            <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
          </Form.Item>

          <Form.Item label="Ghi chú nội bộ">
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ width: '100%', height: '70px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', resize: 'vertical' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={() => setShowEditForm(false)} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Lưu thay đổi</button>
          </div>
        </Form>
      </Modal>

      {showGallery && (
        <ImageGallery 
          onClose={() => setShowGallery(false)}
          onSelect={(url) => {
            const imgUrl = Array.isArray(url) ? url[0] : url;
            setNewImage(imgUrl);
          }}
        />
      )}
    </div>
  );
};

export default Customers;
