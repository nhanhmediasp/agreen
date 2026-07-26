import { useState } from 'react';
import { Plus, Tag, X, Search, ChevronLeft, ChevronRight, ShieldAlert, UserCheck, DollarSign, Receipt } from 'lucide-react';
import { useApp, type Expense } from '../context/AppContext';
import { MoneyInputLeft } from '../components/MoneyInput';
import { Pagination } from '../components/Pagination';

const Expenses = () => {
  const { expenses, addExpense, cars, rentals, owners, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'incidental' | 'owners'>('general');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Operational Forms States
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Bảo dưỡng');
  // Mặc định là HÔM NAY thay vì ngày cắm cứng 15/07/2026
  const [date, setDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [ref, setRef] = useState('');

  // Filtering & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | '7' | '30'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Tab 2 (Incidental) Filter & Pagination State
  const [incidentalSearch, setIncidentalSearch] = useState('');
  const [incidentalStatusFilter, setIncidentalStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [incidentalPage, setIncidentalPage] = useState(1);

  // Tab 3 (Owner Payout) Filter & Pagination State
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerPage, setOwnerPage] = useState(1);

  // All incidental costs (violations, damages, repairs) from all rentals
  const allIncidentalExpenses = rentals.flatMap(r => 
    (r.violations || []).map(v => ({
      ...v,
      rentalId: r.id,
      carId: r.carId,
      customerName: r.customerName,
      customerPhone: r.customerPhone
    }))
  );

  const totalIncidentalAmount = allIncidentalExpenses.reduce((sum, i) => sum + i.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    const newExpense: Expense = {
      id: '', // server sinh id
      title,
      amount: parseInt(amount) || 0,
      category,
      date,
      ref
    };

    const ok = await addExpense(newExpense);
    if (!ok) return;
    setShowAddForm(false);
    showToast('Đã ghi nhận khoản chi phí vận hành mới!', 'success');
    setTitle('');
    setAmount('');
    setRef('');
    setCurrentPage(1);
  };

  // Filter Logic General Expenses
  const getFilteredExpenses = () => {
    // Mốc so sánh là hôm nay (bản cũ cắm cứng 15/07/2026 nên chi phí mới không lọt bộ lọc)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return expenses.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ref.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (timeFilter === 'all') return true;
      const expenseDate = new Date(item.date);
      const diffTime = today.getTime() - expenseDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeFilter === '7' && diffDays > 7) return false;
      if (timeFilter === '30' && diffDays > 30) return false;

      return true;
    });
  };

  const filteredList = getFilteredExpenses();
  const sortedList = [...filteredList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = sortedList.slice(startIndex, startIndex + itemsPerPage);

  // Filter Logic Incidental Costs
  const filteredIncidentals = allIncidentalExpenses.filter(i => 
    i.rentalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.carId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Quản lý Sổ Thu Chi & Chi Phí</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Theo dõi toàn bộ chi phí vận hành, chi phí phát sinh và tiền chi trả cho chủ xe</p>
        </div>
        {activeTab === 'general' && (
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={18} />
            Ghi nhận chi phí
          </button>
        )}
      </div>

      {/* Main Subtabs Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid var(--border)', paddingBottom: '2px' }}>
        <button 
          onClick={() => { setActiveTab('general'); setCurrentPage(1); }}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'general' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'general' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <DollarSign size={18} /> Sổ chi phí vận hành
        </button>

        <button 
          onClick={() => { setActiveTab('incidental'); setCurrentPage(1); }}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'incidental' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'incidental' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={18} /> Chi phí phát sinh đơn thuê ({allIncidentalExpenses.length})
        </button>

        <button 
          onClick={() => { setActiveTab('owners'); setCurrentPage(1); }}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            background: 'transparent',
            color: activeTab === 'owners' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'owners' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <UserCheck size={18} /> Thống kê chi trả Chủ xe ({owners.length})
        </button>
      </div>

      {/* TAB 1: SỔ CHI PHÍ VẬN HÀNH */}
      {activeTab === 'general' && (
        <>
          <div className="grid grid-3 gap-md">
            <div className="card card-pad" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng chi phí hệ thống</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', color: 'var(--text-primary)' }}>
                {totalAmount.toLocaleString('vi-VN')} ₫
              </div>
            </div>
            <div className="card card-pad" style={{ borderLeft: '4px solid var(--status-available-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bình quân mỗi xe</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', color: 'var(--status-available-text)' }}>
                {(cars.length > 0 ? Math.round(totalAmount / cars.length) : 0).toLocaleString('vi-VN')} ₫
              </div>
            </div>
            <div className="card card-pad" style={{ borderLeft: '4px solid var(--status-rented-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số giao dịch lọc được</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', color: 'var(--status-rented-text)' }}>
                {filteredList.length} / {expenses.length}
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-page)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flex: 1, minWidth: '240px' }}>
              <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Tìm theo nội dung, danh mục, biển số xe..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => { setTimeFilter('all'); setCurrentPage(1); }}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: timeFilter === 'all' ? 'var(--primary)' : 'transparent', color: timeFilter === 'all' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                Tất cả
              </button>
              <button 
                onClick={() => { setTimeFilter('7'); setCurrentPage(1); }}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: timeFilter === '7' ? 'var(--primary)' : 'transparent', color: timeFilter === '7' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                7 ngày
              </button>
              <button 
                onClick={() => { setTimeFilter('30'); setCurrentPage(1); }}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: timeFilter === '30' ? 'var(--primary)' : 'transparent', color: timeFilter === '30' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                30 ngày
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600, width: '70px' }}>STT</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Khoản chi</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Số tiền (₫)</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Danh mục</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Liên kết xe</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Ngày chi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Không tìm thấy chi phí nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {startIndex + idx + 1}
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 600 }}>{item.title}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--primary)' }} className="font-mono">
                        {item.amount.toLocaleString()} ₫
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-page)', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)' }}>
                          <Tag size={12} color="var(--primary)" />
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {item.ref ? (
                          item.ref.includes('-') ? (
                            <span className="license-plate font-mono" style={{ fontSize: '11px', padding: '2px 8px' }}>{item.ref}</span>
                          ) : (
                            <span style={{ display: 'inline-block', background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '3px 9px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)' }}>{item.ref}</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chi phí chung</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }} className="font-mono">
                        {new Date(item.date).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Trang {currentPage} / {totalPages} (Tổng {sortedList.length} khoản chi)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: CHI PHÍ PHÁT SINH ĐƠN THUÊ */}
      {activeTab === 'incidental' && (
        <>
          <div className="grid grid-3 gap-md">
            <div className="card card-pad" style={{ borderLeft: '4px solid var(--status-maintenance-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng phát sinh ghi nhận</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', color: 'var(--status-maintenance-text)' }}>
                {totalIncidentalAmount.toLocaleString('vi-VN')} ₫
              </div>
            </div>
            <div className="card card-pad" style={{ borderLeft: '4px solid var(--status-available-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đã thu tiền khách</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', color: 'var(--status-available-text)' }}>
                {allIncidentalExpenses.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0).toLocaleString('vi-VN')} ₫
              </div>
            </div>
            <div className="card card-pad" style={{ borderLeft: '4px solid var(--status-overdue-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chưa thu tiền khách</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', color: 'var(--status-overdue-text)' }}>
                {allIncidentalExpenses.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0).toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-page)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flex: 1, minWidth: '240px' }}>
              <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Tìm theo nội dung, mã đơn, biển số xe, tên khách..." 
                value={incidentalSearch}
                onChange={e => { setIncidentalSearch(e.target.value); setIncidentalPage(1); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => { setIncidentalStatusFilter('all'); setIncidentalPage(1); }}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: incidentalStatusFilter === 'all' ? 'var(--primary)' : 'transparent', color: incidentalStatusFilter === 'all' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
              >
                Tất cả
              </button>
              <button 
                onClick={() => { setIncidentalStatusFilter('paid'); setIncidentalPage(1); }}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: incidentalStatusFilter === 'paid' ? 'var(--primary)' : 'transparent', color: incidentalStatusFilter === 'paid' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
              >
                ✓ Đã thu
              </button>
              <button 
                onClick={() => { setIncidentalStatusFilter('unpaid'); setIncidentalPage(1); }}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: incidentalStatusFilter === 'unpaid' ? 'var(--primary)' : 'transparent', color: incidentalStatusFilter === 'unpaid' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
              >
                ⚡ Chưa thu
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600, width: '70px' }}>STT</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Mã đơn thuê</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Biển số xe</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Khách hàng thuê</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Nội dung phát sinh</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Ngày phát sinh</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Số tiền (₫)</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Trạng thái thu</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = filteredIncidentals.filter(inc => {
                    const matchesSearch = inc.description.toLowerCase().includes(incidentalSearch.toLowerCase()) ||
                      inc.rentalId.toLowerCase().includes(incidentalSearch.toLowerCase()) ||
                      inc.carId.toLowerCase().includes(incidentalSearch.toLowerCase()) ||
                      inc.customerName.toLowerCase().includes(incidentalSearch.toLowerCase());
                    const matchesStatus = incidentalStatusFilter === 'all' ? true : inc.status === incidentalStatusFilter;
                    return matchesSearch && matchesStatus;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Không tìm thấy chi phí phát sinh phù hợp.
                        </td>
                      </tr>
                    );
                  }

                  const startIndex = (incidentalPage - 1) * itemsPerPage;
                  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <>
                      {paginated.map((inc, idx) => (
                        <tr key={inc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>{startIndex + idx + 1}</td>
                          <td style={{ padding: '16px 20px', fontWeight: 700 }} className="font-mono">#{inc.rentalId}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span className="license-plate font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>{inc.carId}</span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600 }}>{inc.customerName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }} className="font-mono">{inc.customerPhone}</div>
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: 600 }}>{inc.description}</td>
                          <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-secondary)' }} className="font-mono">
                            {new Date(inc.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--status-maintenance-text)' }} className="font-mono">
                            {inc.amount.toLocaleString()} ₫
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '100px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: inc.status === 'paid' ? 'var(--status-available-bg)' : 'var(--status-overdue-bg)',
                              color: inc.status === 'paid' ? 'var(--status-available-text)' : 'var(--status-overdue-text)'
                            }}>
                              {inc.status === 'paid' ? '✓ Đã thu tiền' : '⚡ Chưa thu tiền'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })()}
              </tbody>
            </table>

            {(() => {
              const filtered = filteredIncidentals.filter(inc => {
                const matchesSearch = inc.description.toLowerCase().includes(incidentalSearch.toLowerCase()) ||
                  inc.rentalId.toLowerCase().includes(incidentalSearch.toLowerCase()) ||
                  inc.carId.toLowerCase().includes(incidentalSearch.toLowerCase()) ||
                  inc.customerName.toLowerCase().includes(incidentalSearch.toLowerCase());
                const matchesStatus = incidentalStatusFilter === 'all' ? true : inc.status === incidentalStatusFilter;
                return matchesSearch && matchesStatus;
              });
              return (
                <Pagination
                  currentPage={incidentalPage}
                  totalPages={Math.ceil(filtered.length / itemsPerPage)}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setIncidentalPage}
                  unitName="khoản chi phát sinh"
                />
              );
            })()}
          </div>
        </>
      )}

      {/* TAB 3: THỐNG KÊ CHI TRẢ CHỦ XE */}
      {activeTab === 'owners' && (
        <>
          {/* Search Bar for Tab 3 */}
          <div className="card" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-page)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flex: 1 }}>
              <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Tìm theo tên đối tác, số điện thoại, biển số xe sở hữu..." 
                value={ownerSearch}
                onChange={e => { setOwnerSearch(e.target.value); setOwnerPage(1); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600, width: '70px' }}>STT</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Tên Chủ xe / Đối tác</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Số điện thoại</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Xe sở hữu</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Doanh số xe phát sinh</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Tổng tiền chi trả trực tiếp (₫)</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredOwners = owners.filter(o => {
                    const oCars = cars.filter(c => c.ownerPhone === o.phone);
                    const carPlates = oCars.map(c => c.id).join(' ');
                    return o.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
                      o.phone.includes(ownerSearch) ||
                      carPlates.toLowerCase().includes(ownerSearch.toLowerCase());
                  });

                  if (filteredOwners.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Không tìm thấy chủ xe / đối tác nào.
                        </td>
                      </tr>
                    );
                  }

                  const startIndex = (ownerPage - 1) * itemsPerPage;
                  const paginated = filteredOwners.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <>
                      {paginated.map((owner, idx) => {
                        const ownerCars = cars.filter(c => c.ownerPhone === owner.phone);
                        const ownerCarIds = ownerCars.map(c => c.id);
                        const ownerRentals = rentals.filter(r => ownerCarIds.includes(r.carId));
                        const grossRevenue = ownerRentals.reduce((s, r) => s + r.totalAmount, 0);
                        const payoutTotal = ownerRentals.reduce((s, r) => s + (r.ownerCommissionAmount ?? Math.round(r.totalAmount * 0.7)), 0);

                        return (
                          <tr key={owner.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>{startIndex + idx + 1}</td>
                            <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={owner.image} alt={owner.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                {owner.name}
                              </div>
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 600 }} className="font-mono">{owner.phone}</td>
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {ownerCars.map(c => (
                                  <span key={c.id} className="license-plate font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>{c.id}</span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 600 }} className="font-mono">
                              {grossRevenue.toLocaleString()} ₫
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--primary)' }} className="font-mono">
                              {payoutTotal.toLocaleString()} ₫
                            </td>
                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                              <button 
                                onClick={async () => {
                                  if (payoutTotal <= 0) {
                                    showToast('Chủ xe này chưa có số tiền chi trả cần thanh toán!', 'error');
                                    return;
                                  }
                                  const created = await addExpense({
                                    id: '', // server sinh id
                                    title: `Thanh toán chi trả cho chủ xe ${owner.name}`,
                                    amount: payoutTotal,
                                    category: 'Chiết khấu chủ xe',
                                    date: new Date().toISOString().split('T')[0],
                                    ref: `Chủ xe ${owner.name}`
                                  });
                                  if (created) {
                                    showToast(`Đã tạo phiếu chi ${payoutTotal.toLocaleString('vi-VN')} ₫ cho chủ xe ${owner.name}!`, 'success');
                                  }
                                }}
                                className="btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                <Receipt size={14} /> Tạo phiếu chi
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()}
              </tbody>
            </table>

            {(() => {
              const filteredOwners = owners.filter(o => {
                const oCars = cars.filter(c => c.ownerPhone === o.phone);
                const carPlates = oCars.map(c => c.id).join(' ');
                return o.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
                  o.phone.includes(ownerSearch) ||
                  carPlates.toLowerCase().includes(ownerSearch.toLowerCase());
              });
              return (
                <Pagination
                  currentPage={ownerPage}
                  totalPages={Math.ceil(filteredOwners.length / itemsPerPage)}
                  totalItems={filteredOwners.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setOwnerPage}
                  unitName="đối tác chủ xe"
                />
              );
            })()}
          </div>
        </>
      )}

      {/* Form Ghi nhận Chi phí Vận Hành */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={handleAddExpense} style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Ghi nhận chi phí mới</h2>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Nội dung chi *</label>
              <input type="text" placeholder="VD: Sửa lốp, thay nhớt..." value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit' }} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Số tiền (₫) *</label>
              <MoneyInputLeft
                value={amount}
                onChange={setAmount}
                placeholder="500000"
                style={{ textAlign: 'left', fontWeight: 700 }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1.2 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Danh mục chi</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>
                  <option value="Bảo dưỡng">Bảo dưỡng</option>
                  <option value="Sửa chữa">Sửa chữa</option>
                  <option value="Vệ sinh">Vệ sinh</option>
                  <option value="Giấy tờ">Giấy tờ</option>
                  <option value="Chi trả chủ xe">Chi trả chủ xe</option>
                  <option value="Khác">Hạng mục khác</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Ngày chi</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Liên kết xe (tùy chọn)</label>
              <select value={ref} onChange={e => setRef(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>
                <option value="">-- Không liên kết xe --</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Hủy</button>
              <button type="submit" className="btn-primary">Ghi nhận</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Expenses;
