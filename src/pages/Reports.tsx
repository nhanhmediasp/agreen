import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, DollarSign, TrendingUp, Percent, Award, Car, Calendar } from 'lucide-react';

const Reports = () => {
  const { cars, expenses, rentals, customers } = useApp();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'quarter' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('2026-06-15');
  const [endDate, setEndDate] = useState('2026-07-15');

  // Filter rentals and expenses based on time range
  const filteredRentals = rentals.filter(r => {
    const rentalDate = new Date(r.startDate.split('T')[0]);
    const refDate = new Date('2026-07-15'); // Current system reference date

    if (timeRange === '7d') {
      const daysDiff = (refDate.getTime() - rentalDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 0 && daysDiff <= 7;
    }
    if (timeRange === '30d') {
      const daysDiff = (refDate.getTime() - rentalDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 0 && daysDiff <= 30;
    }
    if (timeRange === 'quarter') {
      const qStart = new Date('2026-07-01');
      const qEnd = new Date('2026-09-30');
      return rentalDate >= qStart && rentalDate <= qEnd;
    }
    if (timeRange === 'custom') {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return rentalDate >= s && rentalDate <= e;
    }
    return true;
  });

  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const refDate = new Date('2026-07-15');

    if (timeRange === '7d') {
      const daysDiff = (refDate.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 0 && daysDiff <= 7;
    }
    if (timeRange === '30d') {
      const daysDiff = (refDate.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 0 && daysDiff <= 30;
    }
    if (timeRange === 'quarter') {
      const qStart = new Date('2026-07-01');
      const qEnd = new Date('2026-09-30');
      return expDate >= qStart && expDate <= qEnd;
    }
    if (timeRange === 'custom') {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return expDate >= s && expDate <= e;
    }
    return true;
  });

  // Calculate financial summary
  const totalRevenue = filteredRentals.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpenses;

  // Utilization rates
  const sortedUtilization = [...cars].map(c => {
    const carRentals = filteredRentals.filter(r => r.carId === c.id);
    const totalDaysUsed = carRentals.reduce((sum, r) => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const diff = end.getTime() - start.getTime();
      return sum + Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, 0);
    const periodDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const utilizationRate = Math.min(100, Math.round((totalDaysUsed / periodDays) * 100));
    return {
      ...c,
      daysUsed: totalDaysUsed,
      rate: utilizationRate
    };
  }).sort((a, b) => b.rate - a.rate);

  // Top customers
  const sortedTopCustomers = [...customers]
    .sort((a, b) => b.totalRentals - a.totalRentals)
    .slice(0, 3);

  // CSS charts percentages
  const maxRevenue = Math.max(totalRevenue, totalExpenses, profit, 1000000);
  const revenuePercent = Math.min(100, Math.max(10, (totalRevenue / maxRevenue) * 100));
  const expensesPercent = Math.min(100, Math.max(10, (totalExpenses / maxRevenue) * 100));
  const profitPercent = Math.min(100, Math.max(10, (profit / maxRevenue) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* Header & Time Range Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 700 }}>Báo cáo & Thống kê</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '3px' }}>Phân tích doanh thu, lợi nhuận và hiệu suất khai thác đội xe</p>
        </div>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {(['7d', '30d', 'quarter', 'custom'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: timeRange === range ? 'var(--primary)' : 'transparent',
                color: timeRange === range ? 'white' : 'var(--text-secondary)',
                fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {{ '7d': '7 ngày', '30d': '30 ngày', 'quarter': 'Quý này', 'custom': 'Tùy chỉnh' }[range]}
            </button>
          ))}
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--border)', paddingLeft: '8px', marginLeft: '4px' }}>
              <Calendar size={13} color="var(--text-muted)" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" style={{ padding: '4px 8px', width: 'auto', fontSize: '12px' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>đến</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" style={{ padding: '4px 8px', width: 'auto', fontSize: '12px' }} />
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-auto-sm gap-md">
        {[
          { label: 'Doanh thu (Tổng)', value: `${totalRevenue.toLocaleString()} ₫`, color: 'var(--status-available-text)', bg: 'var(--status-available-bg)', border: 'var(--status-available-border)', icon: <TrendingUp size={20} /> },
          { label: 'Chi phí hoạt động', value: `${totalExpenses.toLocaleString()} ₫`, color: 'var(--status-maintenance-text)', bg: 'var(--status-maintenance-bg)', border: 'var(--status-maintenance-border)', icon: <DollarSign size={20} /> },
          { label: 'Lợi nhuận ròng', value: `${profit.toLocaleString()} ₫`, color: 'var(--status-rented-text)', bg: 'var(--status-rented-bg)', border: 'var(--status-rented-border)', icon: <TrendingUp size={20} /> },
          { label: 'Tỷ lệ khai thác', value: `${cars.length > 0 ? Math.round(sortedUtilization.reduce((sum, u) => sum + u.rate, 0) / cars.length) : 0}%`, color: '#B45309', bg: '#FFFBEB', border: 'var(--accent)', icon: <Percent size={20} /> },
        ].map((item, i) => (
          <div key={i} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: `3px solid ${item.border}` }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: item.color, marginTop: '3px' }} className="font-mono">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Chart & Car Utilization */}
      <div className="grid grid-auto-lg gap-lg">
        
        {/* CSS Chart Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <BarChart size={20} color="var(--primary)" />
            Biểu đồ So sánh Tài chính
          </h2>
          
          <div style={{ display: 'flex', height: '240px', alignItems: 'flex-end', justifyContent: 'space-around', padding: '16px 0', borderBottom: '2px solid var(--border)', position: 'relative' }}>
            {/* Grid Lines */}
            <div style={{ position: 'absolute', bottom: '25%', left: 0, right: 0, height: '1px', borderBottom: '1px dashed var(--border)' }}></div>
            <div style={{ position: 'absolute', bottom: '50%', left: 0, right: 0, height: '1px', borderBottom: '1px dashed var(--border)' }}></div>
            <div style={{ position: 'absolute', bottom: '75%', left: 0, right: 0, height: '1px', borderBottom: '1px dashed var(--border)' }}></div>

            {/* Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px', zIndex: 1 }}>
              <div style={{ height: `${revenuePercent * 1.8}px`, width: '44px', backgroundColor: 'var(--status-available-border)', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '11px', transition: 'height 0.5s' }} className="font-mono">
                {Math.round(revenuePercent)}%
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px', color: 'var(--text-primary)' }}>Doanh thu</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', width: '80px', alignItems: 'center', zIndex: 1 }}>
              <div style={{ height: `${expensesPercent * 1.8}px`, width: '44px', backgroundColor: 'var(--status-maintenance-border)', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '11px', transition: 'height 0.5s' }} className="font-mono">
                {Math.round(expensesPercent)}%
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px', color: 'var(--text-primary)' }}>Chi phí</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', width: '80px', alignItems: 'center', zIndex: 1 }}>
              <div style={{ height: `${profitPercent * 1.8}px`, width: '44px', backgroundColor: 'var(--status-rented-border)', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '11px', transition: 'height 0.5s' }} className="font-mono">
                {Math.round(profitPercent)}%
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px', color: 'var(--text-primary)' }}>Lợi nhuận</span>
            </div>
          </div>
        </div>

        {/* Top Rented Cars */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Car size={20} color="var(--primary)" />
              Hiệu suất Khai thác Theo Xe ({cars.length} Xe)
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '360px', overflowY: 'auto', paddingRight: '6px' }}>
            {sortedUtilization.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="license-plate font-mono" style={{ width: '90px', fontSize: '11px', textAlign: 'center', padding: '2px 4px' }}>{u.id}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                    <span>{u.name}</span>
                    <span className="font-mono" style={{ color: 'var(--primary)' }}>{u.rate}% ({u.daysUsed} ngày)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-page)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', width: `${u.rate}%`, background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Customers & Expense Breakdown */}
      <div className="grid grid-auto-lg gap-lg">
        
        {/* Top Customers */}
        <div className="card">
          <h2 style={{ fontSize: '17px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Award size={20} color="var(--accent)" />
            Top 5 Khách Hàng Thuê Nhiều Nhất
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedTopCustomers.slice(0, 5).map((cust, idx) => (
              <div key={cust.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#FEF3C7' : 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: idx === 0 ? '#B45309' : 'var(--text-primary)', fontSize: '12px' }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{cust.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }} className="font-mono">{cust.phone}</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }} className="font-mono">
                  {cust.totalRentals} lượt
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense breakdown by Car */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Cơ cấu Chi phí Bảo dưỡng Xe</h2>
          <div className="table-wrap" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-page)' }}>
                <tr>
                  <th>Biển số</th>
                  <th>Bảo dưỡng</th>
                  <th>Vệ sinh</th>
                  <th>Chiết khấu/Khác</th>
                </tr>
              </thead>
              <tbody>
                {cars.map(c => {
                  const carExps = expenses.filter(e => e.ref === c.id);
                  const maint = carExps.filter(e => e.category === 'Bảo dưỡng').reduce((sum, e) => sum + e.amount, 0);
                  const clean = carExps.filter(e => e.category === 'Vệ sinh').reduce((sum, e) => sum + e.amount, 0);
                  const repair = carExps.filter(e => ['Sửa chữa', 'Giấy tờ', 'Chiết khấu chủ xe', 'Khác'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <tr key={c.id}>
                      <td><span className="license-plate">{c.id}</span></td>
                      <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{maint.toLocaleString()} ₫</td>
                      <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{clean.toLocaleString()} ₫</td>
                      <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{repair.toLocaleString()} ₫</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
