import { useState } from 'react';
import { Table, Tag, Modal, Form, Card, Statistic } from 'antd';
import { Plus, Search, ShieldAlert, UserCheck, DollarSign, Receipt } from 'lucide-react';
import { useApp, type Expense } from '../context/AppContext';
import { MoneyInputLeft } from '../components/MoneyInput';
import { Pagination } from '../components/Pagination';

const Expenses = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, cars, rentals, owners, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'incidental' | 'owners'>('general');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Operational Forms States
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Bảo dưỡng');
  const [date, setDate] = useState('2026-07-15');
  const [ref, setRef] = useState('');

  // Filtering & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | '7' | '30' | 'custom'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const itemsPerPage = 10;

  // Edit Operational Expense States
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Bảo dưỡng');
  const [editDate, setEditDate] = useState('2026-07-15');
  const [editRef, setEditRef] = useState('');

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

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      title,
      amount: parseInt(amount) || 0,
      category,
      date,
      ref
    };

    addExpense(newExpense);
    setShowAddForm(false);
    showToast('Đã ghi nhận khoản chi phí vận hành mới!', 'success');
    setTitle('');
    setAmount('');
    setRef('');
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditTitle(expense.title);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditDate(expense.date);
    setEditRef(expense.ref);
    setShowEditForm(true);
  };

  const handleUpdateExpense = () => {
    if (!editingExpenseId || !editTitle || !editAmount) return;

    updateExpense(editingExpenseId, {
      title: editTitle,
      amount: parseInt(editAmount) || 0,
      category: editCategory,
      date: editDate,
      ref: editRef
    });

    setShowEditForm(false);
    showToast('Đã cập nhật chi phí vận hành!', 'success');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khoản chi phí vận hành này?')) {
      deleteExpense(id);
      showToast('Đã xóa khoản chi phí!', 'success');
    }
  };

  // Filter Logic General Expenses
  const getFilteredExpenses = () => {
    const today = new Date('2026-07-15');
    
    return expenses.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ref.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (timeFilter === 'all') return true;
      if (timeFilter === 'custom') {
        const itemDateStr = item.date.split('T')[0];
        if (startDateFilter && itemDateStr < startDateFilter) return false;
        if (endDateFilter && itemDateStr > endDateFilter) return false;
        return true;
      }
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

  // Filter Logic Incidental Costs
  const filteredIncidentals = allIncidentalExpenses.filter(i => 
    i.rentalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.carId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header & Action */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Quản lý Sổ Thu Chi & Chi Phí
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
              Tài chính
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Theo dõi toàn bộ chi phí vận hành, chi phí phát sinh và tiền chi trả cho chủ xe
          </p>
        </div>
        {activeTab === 'general' && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowAddForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600 }}
          >
            <Plus size={18} />
            Ghi nhận chi phí
          </button>
        )}
      </div>

      {/* Main Subtabs Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid var(--border)', paddingBottom: '2px' }}>
        <button 
          onClick={() => setActiveTab('general')}
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
          onClick={() => setActiveTab('incidental')}
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
          onClick={() => setActiveTab('owners')}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <Card style={{ borderLeft: '4px solid var(--accent)', borderRadius: 8 }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tổng chi phí hệ thống</div>
              <Statistic value={totalAmount} suffix="₫" valueStyle={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }} />
            </Card>
            <Card style={{ borderLeft: '4px solid #047857', borderRadius: 8 }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Bình quân mỗi xe</div>
              <Statistic value={cars.length > 0 ? Math.round(totalAmount / cars.length) : 0} suffix="₫" valueStyle={{ fontSize: '24px', fontWeight: 700, color: '#047857' }} />
            </Card>
            <Card style={{ borderLeft: '4px solid #1D4ED8', borderRadius: 8 }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Số giao dịch lọc được</div>
              <Statistic value={`${filteredList.length} / ${expenses.length}`} valueStyle={{ fontSize: '24px', fontWeight: 700, color: '#1D4ED8' }} />
            </Card>
          </div>

          <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-page)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flex: 1, minWidth: '240px' }}>
              <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Tìm theo nội dung, danh mục, biển số xe..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setTimeFilter('all')}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: timeFilter === 'all' ? 'var(--primary)' : 'transparent', color: timeFilter === 'all' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setTimeFilter('7')}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: timeFilter === '7' ? 'var(--primary)' : 'transparent', color: timeFilter === '7' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                7 ngày
              </button>
              <button 
                onClick={() => setTimeFilter('30')}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: timeFilter === '30' ? 'var(--primary)' : 'transparent', color: timeFilter === '30' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                30 ngày
              </button>
              <button 
                onClick={() => setTimeFilter('custom')}
                style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: timeFilter === 'custom' ? 'var(--primary)' : 'transparent', color: timeFilter === 'custom' ? 'white' : 'var(--text-secondary)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                Tùy chỉnh
              </button>
            </div>
          </div>

          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Lọc từ ngày:</span>
              <input 
                type="date" 
                value={startDateFilter} 
                onChange={e => setStartDateFilter(e.target.value)} 
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} 
              />
              <span style={{ color: '#64748B', fontSize: '13px' }}>đến ngày:</span>
              <input 
                type="date" 
                value={endDateFilter} 
                onChange={e => setEndDateFilter(e.target.value)} 
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }} 
              />
              {(startDateFilter || endDateFilter) && (
                <button 
                  onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                  style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '4px' }}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
            <Table<Expense>
              dataSource={sortedList}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total: number, range: [number, number]) => `Hiển thị ${range[0]}-${range[1]} / ${total} khoản chi`
              }}
              columns={[
                {
                  title: 'Khoản chi',
                  dataIndex: 'title',
                  key: 'title',
                  sorter: (a: Expense, b: Expense) => a.title.localeCompare(b.title),
                  render: (title: string) => <span style={{ fontWeight: 600, color: '#262626' }}>{title}</span>
                },
                {
                  title: 'Số tiền (₫)',
                  dataIndex: 'amount',
                  key: 'amount',
                  sorter: (a: Expense, b: Expense) => a.amount - b.amount,
                  render: (amount: number) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{(amount || 0).toLocaleString()} ₫</span>
                },
                {
                  title: 'Danh mục',
                  dataIndex: 'category',
                  key: 'category',
                  filters: [
                    { text: 'Bảo dưỡng', value: 'Bảo dưỡng' },
                    { text: 'Sửa chữa', value: 'Sửa chữa' },
                    { text: 'Rửa xe', value: 'Rửa xe' },
                    { text: 'Nhiên liệu', value: 'Nhiên liệu' },
                  ],
                  onFilter: (value: boolean | React.Key, record: Expense) => record.category === value,
                  render: (category: string) => <Tag color="blue">{category}</Tag>
                },
                {
                  title: 'Liên kết xe',
                  dataIndex: 'ref',
                  key: 'ref',
                  render: (ref: string) => ref ? <span className="license-plate" style={{ fontSize: '11px', padding: '2px 8px' }}>{ref}</span> : <span style={{ color: '#8c8c8c' }}>Chi phí chung</span>
                },
                {
                  title: 'Ngày chi',
                  dataIndex: 'date',
                  key: 'date',
                  sorter: (a: Expense, b: Expense) => new Date(a.date).getTime() - new Date(b.date).getTime(),
                  render: (date: string) => <span style={{ fontFamily: 'monospace', color: '#595959' }}>{new Date(date).toLocaleDateString('vi-VN')}</span>
                },
                {
                  title: 'Thao tác',
                  key: 'actions',
                  render: (_: unknown, record: Expense) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEdit(record)}
                        style={{ padding: '4px 10px', background: 'none', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#1677ff' }}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        style={{ padding: '4px 10px', background: 'none', border: '1px solid #ffa39e', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#ff4d4f' }}
                      >
                        Xóa
                      </button>
                    </div>
                  )
                }
              ]}
            />
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
                                onClick={() => {
                                  if (payoutTotal <= 0) {
                                    showToast('Chủ xe này chưa có số tiền chi trả cần thanh toán!', 'error');
                                    return;
                                  }
                                  addExpense({
                                    id: Date.now().toString(),
                                    title: `Thanh toán chi trả cho chủ xe ${owner.name}`,
                                    amount: payoutTotal,
                                    category: 'Chiết khấu chủ xe',
                                    date: new Date().toISOString().split('T')[0],
                                    ref: ownerCars[0]?.id || ''
                                  });
                                  showToast(`Đã tạo phiếu chi ${payoutTotal.toLocaleString()} ₫ cho chủ xe ${owner.name}!`, 'success');
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

      {/* Form Ghi nhận Chi phí Vận Hành - Ant Design Modal & Form */}
      <Modal
        title="Ghi nhận chi phí mới"
        open={showAddForm}
        onCancel={() => setShowAddForm(false)}
        footer={null}
        width={480}
      >
        <Form layout="vertical" onFinish={handleAddExpense} style={{ marginTop: '16px' }}>
          <Form.Item label="Nội dung chi" required>
            <input type="text" placeholder="VD: Sửa lốp, thay nhớt..." value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
          </Form.Item>

          <Form.Item label="Số tiền (₫)" required>
            <MoneyInputLeft
              value={amount}
              onChange={setAmount}
              placeholder="500000"
              style={{ textAlign: 'left', fontWeight: 700 }}
              required
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Danh mục chi" style={{ flex: 1.2 }}>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
                <option value="Bảo dưỡng">Bảo dưỡng</option>
                <option value="Sửa chữa">Sửa chữa</option>
                <option value="Vệ sinh">Vệ sinh</option>
                <option value="Giấy tờ">Giấy tờ</option>
                <option value="Chi trả chủ xe">Chi trả chủ xe</option>
                <option value="Khác">Hạng mục khác</option>
              </select>
            </Form.Item>
            <Form.Item label="Ngày chi" style={{ flex: 1 }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
            </Form.Item>
          </div>

          <Form.Item label="Liên kết xe (tùy chọn)">
            <select value={ref} onChange={e => setRef(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
              <option value="">-- Không liên kết xe --</option>
              {cars.map(c => (
                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
              ))}
            </select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Ghi nhận</button>
          </div>
        </Form>
      </Modal>

      {/* Form Chỉnh sửa Chi phí Vận Hành - Ant Design Modal & Form */}
      <Modal
        title="Chỉnh sửa chi phí"
        open={showEditForm}
        onCancel={() => setShowEditForm(false)}
        footer={null}
        width={480}
      >
        <Form layout="vertical" onFinish={handleUpdateExpense} style={{ marginTop: '16px' }}>
          <Form.Item label="Nội dung chi" required>
            <input type="text" placeholder="VD: Sửa lốp, thay nhớt..." value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} required />
          </Form.Item>

          <Form.Item label="Số tiền (₫)" required>
            <MoneyInputLeft
              value={editAmount}
              onChange={setEditAmount}
              placeholder="500000"
              style={{ textAlign: 'left', fontWeight: 700 }}
              required
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="Danh mục chi" style={{ flex: 1.2 }}>
              <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
                <option value="Bảo dưỡng">Bảo dưỡng</option>
                <option value="Sửa chữa">Sửa chữa</option>
                <option value="Vệ sinh">Vệ sinh</option>
                <option value="Giấy tờ">Giấy tờ</option>
                <option value="Chi trả chủ xe">Chi trả chủ xe</option>
                <option value="Khác">Hạng mục khác</option>
              </select>
            </Form.Item>
            <Form.Item label="Ngày chi" style={{ flex: 1 }}>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }} />
            </Form.Item>
          </div>

          <Form.Item label="Liên kết xe (tùy chọn)">
            <select value={editRef} onChange={e => setEditRef(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
              <option value="">-- Không liên kết xe --</option>
              {cars.map(c => (
                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
              ))}
            </select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={() => setShowEditForm(false)} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Cập nhật</button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Expenses;
