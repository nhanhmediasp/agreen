import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Phone, FileCheck, AlertCircle, X, MapPin, FileText, ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useApp, type Customer } from '../context/AppContext';
import { ImageGallery } from '../components/ImageGallery';
import { Pagination } from '../components/Pagination';

const Customers = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, rentals, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
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
  const [galleryMode, setGalleryMode] = useState<'add' | 'edit'>('add');

  // Customer Transaction filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected customer details
  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
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
  const totalCustomerSpent = customerHistory.reduce((sum, r) => sum + r.totalAmount, 0);
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

  const handleUpdateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    updateCustomer(selectedCustomerId, {
      name: editName,
      phone: editPhone,
      license: `GPLX: ${editLicense}`,
      cccd: editCccd,
      address: editAddress,
      classification: editClass,
      notes: editNotes,
      image: editImage
    });
    setShowEditForm(false);
    showToast('Đã cập nhật thông tin khách hàng thành công!', 'success');
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newLicense || !newCccd) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc!', 'error');
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

    addCustomer(customerToAdd);
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

  const handleUpdateNotes = (notesText: string) => {
    if (!selectedCustomerId) return;
    updateCustomer(selectedCustomerId, { notes: notesText });
  };

  return (
    <div style={{ height: '100%' }}>
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
                  value={activeCustomer.notes}
                  onChange={e => handleUpdateNotes(e.target.value)}
                  style={{ width: '100%', height: '120px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '14px', fontFamily: 'inherit', resize: 'none', lineHeight: '1.5' }}
                />
              </div>
            </div>

            {/* Cột phải: Lịch sử thuê + Bộ lọc & Tìm kiếm */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Lịch sử giao dịch & đơn thuê</h3>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>Tổng đơn: {customerHistory.length}</span>
                </div>

                {/* Filter and Search Bar for History */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                    onChange={e => setHistoryStatusFilter(e.target.value as any)}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: '13px' }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang thuê</option>
                    <option value="completed">Đã trả / Hoàn thành</option>
                  </select>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
            </div>
          </div>
        </div>
      ) : (
        /* Danh sách khách hàng chính */
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '24px', margin: 0 }}>Quản lý Khách hàng</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Danh sách thông tin và lịch sử thuê của khách hàng</p>
            </div>
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
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
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (window.confirm(`Thay đổi phân loại hàng loạt cho ${selectedCustomerIds.length} khách hàng đã chọn?`)) {
                      selectedCustomerIds.forEach(id => updateCustomer(id, { classification: val as any }));
                      setSelectedCustomerIds([]);
                      showToast('Đã cập nhật phân loại hàng loạt!', 'success');
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
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedCustomerIds.length} khách hàng đã chọn?`)) {
                      selectedCustomerIds.forEach(id => deleteCustomer(id));
                      setSelectedCustomerIds([]);
                      showToast('Đã xóa hàng loạt thành công!', 'success');
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

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <th style={{ padding: '16px 24px', width: '50px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomerIds.includes(c.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomerIds(filteredCustomers.map(c => c.id));
                        } else {
                          setSelectedCustomerIds([]);
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '16px 24px', fontWeight: 500, width: '80px' }}>STT</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Khách hàng</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Số điện thoại</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Phân loại</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Trạng thái hồ sơ</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500 }}>Đơn hoạt động</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500, width: '100px' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Không tìm thấy khách hàng nào.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

                    return paginatedCustomers.map((customer, idx) => (
                      <tr 
                        key={customer.id} 
                        onClick={() => setSelectedCustomerId(customer.id)}
                        style={{ 
                          borderBottom: '1px solid var(--border-light)', 
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '16px 24px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={selectedCustomerIds.includes(customer.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomerIds(prev => [...prev, customer.id]);
                              } else {
                                setSelectedCustomerIds(prev => prev.filter(id => id !== customer.id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-secondary)' }}>{startIndex + idx + 1}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={customer.image} alt={customer.name} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-strong)' }} />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{customer.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: #{customer.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={14} />
                            {customer.phone}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          {customer.classification === 'vip' ? (
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '100px', background: '#fef3c7', color: '#d97706', fontSize: '12px', fontWeight: 700 }}>
                              ⭐ VIP
                            </span>
                          ) : customer.classification === 'warning' ? (
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '100px', background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', fontSize: '12px', fontWeight: 700 }}>
                              ⚠️ Chú ý
                            </span>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '100px', background: '#f1f5f9', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
                              Thường
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          {customer.status === 'verified' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '100px', background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '12.5px', fontWeight: 700 }}>
                              <FileCheck size={14} /> {customer.statusText || 'Đã xác minh'}
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '100px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontSize: '12.5px', fontWeight: 700 }}>
                              <AlertCircle size={14} /> {customer.statusText || 'GPLX hết hạn'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 600, paddingLeft: '48px' }}>
                          {customer.activeRentals}
                        </td>
                        <td style={{ padding: '16px 24px' }} onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${customer.name}" khỏi hệ thống?`)) {
                                deleteCustomer(customer.id);
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Xóa khách hàng"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>

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

      {/* Add Customer Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleCreateCustomer} style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Thêm khách hàng mới</h2>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Họ và tên *</label>
                <input type="text" placeholder="VD: Nguyễn Văn A" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Phân loại khách</label>
                <select value={newClass} onChange={e => setNewClass(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }}>
                  <option value="normal">Bình thường</option>
                  <option value="vip">Khách VIP ⭐</option>
                  <option value="warning">Khách Cần Chú Ý ⚠️</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số điện thoại *</label>
                <input type="tel" placeholder="VD: 0901234567" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số CCCD *</label>
                <input type="text" placeholder="Nhập số CCCD" value={newCccd} onChange={e => setNewCccd(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số GPLX *</label>
                <input type="text" placeholder="VD: 790123456789" value={newLicense} onChange={e => setNewLicense(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh / Avatar</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {newImage ? (
                    <img src={newImage} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-main)', border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={16} color="var(--text-secondary)" />
                    </div>
                  )}
                  <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 10px' }} onClick={() => setShowGallery(true)}>
                    Chọn
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Địa chỉ thường trú</label>
              <input type="text" placeholder="Nhập địa chỉ của khách hàng" value={newAddress} onChange={e => setNewAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Ghi chú riêng</label>
              <textarea placeholder="VD: Khách trả xe rất đúng giờ, xe sạch." value={newNotes} onChange={e => setNewNotes(e.target.value)} style={{ width: '100%', height: '80px', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
              <button type="submit" className="btn-primary">Thêm khách</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleUpdateCustomerSubmit} style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Chỉnh sửa thông tin khách hàng</h2>
              <button type="button" onClick={() => setShowEditForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Họ và tên *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Phân loại khách</label>
                <select value={editClass} onChange={e => setEditClass(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }}>
                  <option value="normal">Bình thường</option>
                  <option value="vip">Khách VIP ⭐</option>
                  <option value="warning">Khách Cần Chú Ý ⚠️</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số điện thoại *</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số CCCD *</label>
                <input type="text" value={editCccd} onChange={e => setEditCccd(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số GPLX *</label>
                <input type="text" value={editLicense} onChange={e => setEditLicense(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Hình ảnh / Avatar</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {editImage ? (
                    <img src={editImage} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-main)', border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={16} color="var(--text-secondary)" />
                    </div>
                  )}
                  <button type="button" className="btn-primary" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '6px 10px' }} onClick={() => { setGalleryMode('edit'); setShowGallery(true); }}>
                    Chọn
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Địa chỉ thường trú</label>
              <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Ghi chú riêng</label>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ width: '100%', height: '80px', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowEditForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
              <button type="submit" className="btn-primary">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}

      {showGallery && (
        <ImageGallery 
          onClose={() => setShowGallery(false)}
          onSelect={(url) => {
            const imgUrl = Array.isArray(url) ? url[0] : url;
            if (galleryMode === 'edit') {
              setEditImage(imgUrl);
            } else {
              setNewImage(imgUrl);
            }
          }}
        />
      )}
    </div>
  );
};

export default Customers;
