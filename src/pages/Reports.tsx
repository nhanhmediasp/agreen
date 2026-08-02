import { useEffect, useMemo, useState } from 'react';
import { Card, Statistic, Table } from 'antd';
import { useApp } from '../context/AppContext';
import { BarChart, Award, Car, Calendar } from 'lucide-react';

const Reports = () => {
  const { cars, expenses, rentals, customers } = useApp();

  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | 'quarter' | 'custom'>('1d');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
  );
  const [financeSummary, setFinanceSummary] = useState<{
    completed_revenue: number;
    cash_collected: number;
    receivables: number;
    deposits_held: number;
    expenses: number;
  } | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);

  const { periodStart, periodEnd } = useMemo(() => {
    const now = new Date();
    let rangeEnd = now;
    let rangeStart = new Date(now.getTime() - 86_400_000);
    if (timeRange === '7d') rangeStart = new Date(now.getTime() - 7 * 86_400_000);
    if (timeRange === '30d') rangeStart = new Date(now.getTime() - 30 * 86_400_000);
    if (timeRange === 'quarter') {
      const vietnamParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: 'numeric',
      }).formatToParts(now);
      const year = Number(vietnamParts.find((part) => part.type === 'year')?.value);
      const month = Number(vietnamParts.find((part) => part.type === 'month')?.value);
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3;
      rangeStart = new Date(Date.UTC(year, quarterStartMonth, 1) - 7 * 3_600_000);
      rangeEnd = new Date(Date.UTC(year, quarterStartMonth + 3, 1) - 7 * 3_600_000);
    }
    if (timeRange === 'custom') {
      rangeStart = new Date(`${startDate}T00:00:00+07:00`);
      rangeEnd = new Date(`${endDate}T00:00:00+07:00`);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    }
    return { periodStart: rangeStart, periodEnd: rangeEnd };
  }, [timeRange, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    });
    void fetch(`/api/finance/summary?${params.toString()}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Không thể tải sổ tài chính');
        }
        setFinanceSummary({
          completed_revenue: Number(payload.data.completed_revenue) || 0,
          cash_collected: Number(payload.data.cash_collected) || 0,
          receivables: Number(payload.data.receivables) || 0,
          deposits_held: Number(payload.data.deposits_held) || 0,
          expenses: Number(payload.data.expenses) || 0,
        });
        setFinanceError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFinanceSummary(null);
        setFinanceError(error instanceof Error ? error.message : 'Không thể tải sổ tài chính');
      });
    return () => controller.abort();
  }, [periodStart, periodEnd]);

  const filteredRentals = rentals.filter((rental) => {
    if (rental.status !== 'completed') return false;
    const recognizedAt = new Date(rental.returnedAt ?? rental.endDate);
    return recognizedAt >= periodStart && recognizedAt < periodEnd;
  });

  const filteredExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(`${expense.date}T00:00:00+07:00`);
    return expenseDate >= periodStart && expenseDate < periodEnd;
  });

  // Calculate financial summary
  const totalRevenue = financeSummary?.completed_revenue
    ?? filteredRentals.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalExpenses = financeSummary?.expenses
    ?? filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpenses;

  // Utilization rates
  const sortedUtilization = [...cars].map(c => {
    const carRentals = rentals.filter((rental) => (
      rental.carId === c.id
      && rental.status !== 'cancelled'
      && new Date(rental.startDate) < periodEnd
      && new Date(rental.endDate) > periodStart
    ));
    const totalHoursUsed = carRentals.reduce((sum, rental) => {
      const overlapStart = Math.max(new Date(rental.startDate).getTime(), periodStart.getTime());
      const overlapEnd = Math.min(new Date(rental.endDate).getTime(), periodEnd.getTime());
      return sum + Math.max(0, overlapEnd - overlapStart) / 3_600_000;
    }, 0);
    const periodHours = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / 3_600_000);
    const utilizationRate = Math.min(100, Math.round((totalHoursUsed / periodHours) * 100));
    return {
      ...c,
      daysUsed: Math.round((totalHoursUsed / 24) * 10) / 10,
      rate: utilizationRate
    };
  }).sort((a, b) => b.rate - a.rate);

  // Top customers
  const sortedTopCustomers = [...customers]
    .sort((a, b) => b.totalRentals - a.totalRentals)
    .slice(0, 3);

  // CSS charts percentages
  const maxRevenue = Math.max(Math.abs(totalRevenue), Math.abs(totalExpenses), Math.abs(profit), 1);
  const revenuePercent = Math.min(100, (totalRevenue / maxRevenue) * 100);
  const expensesPercent = Math.min(100, (totalExpenses / maxRevenue) * 100);
  const profitPercent = Math.max(-100, Math.min(100, (profit / maxRevenue) * 100));

  const avgUtilization = cars.length > 0 ? Math.round(sortedUtilization.reduce((sum, u) => sum + u.rate, 0) / cars.length) : 0;

  const expenseBreakdown = cars.map(car => {
    const carExpenses = expenses.filter(expense => expense.ref === car.id);
    return {
      id: car.id,
      maint: carExpenses
        .filter(expense => expense.category === 'Bảo dưỡng')
        .reduce((sum, expense) => sum + expense.amount, 0),
      clean: carExpenses
        .filter(expense => expense.category === 'Vệ sinh')
        .reduce((sum, expense) => sum + expense.amount, 0),
      repair: carExpenses
        .filter(expense => ['Sửa chữa', 'Giấy tờ', 'Chiết khấu chủ xe', 'Khác'].includes(expense.category))
        .reduce((sum, expense) => sum + expense.amount, 0),
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header & Time Range Filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Báo cáo & Thống kê
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
              Báo cáo
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Phân tích doanh thu, lợi nhuận và hiệu suất khai thác đội xe
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="reports-time-filter" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {(['1d', '7d', '30d', 'quarter', 'custom'] as const).map(range => (
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
              {{ '1d': 'Hôm nay', '7d': '7 ngày', '30d': '30 ngày', 'quarter': 'Quý này', 'custom': 'Tùy chỉnh' }[range]}
            </button>
          ))}
          {timeRange === 'custom' && (
            <div className="reports-custom-range" style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--border)', paddingLeft: '8px', marginLeft: '4px' }}>
              <Calendar size={13} color="var(--text-muted)" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" style={{ padding: '4px 8px', width: 'auto', fontSize: '12px' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>đến</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" style={{ padding: '4px 8px', width: 'auto', fontSize: '12px' }} />
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards with antd Card & Statistic */}
      {financeError && (
        <div className="alert alert-warning">
          Không tải được sổ thực thu/công nợ: {financeError}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card style={{ borderLeft: '4px solid #047857', borderRadius: 8 }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Doanh thu (Tổng)</div>
          <Statistic value={totalRevenue} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#047857' }} />
        </Card>
        <Card style={{ borderLeft: '4px solid #0F766E', borderRadius: 8 }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tiền thực thu</div>
          <Statistic value={financeSummary?.cash_collected ?? 0} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#0F766E' }} />
        </Card>
        <Card style={{ borderLeft: '4px solid #DC2626', borderRadius: 8 }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Công nợ</div>
          <Statistic value={financeSummary?.receivables ?? 0} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#DC2626' }} />
        </Card>
        <Card style={{ borderLeft: '4px solid #7C3AED', borderRadius: 8 }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tiền cọc đang giữ</div>
          <Statistic value={financeSummary?.deposits_held ?? 0} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#7C3AED' }} />
        </Card>
        <Card style={{ borderLeft: '4px solid #C2410C', borderRadius: 8 }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Chi phí hoạt động</div>
          <Statistic value={totalExpenses} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#C2410C' }} />
        </Card>
        <Card style={{ borderLeft: '4px solid #1D4ED8', borderRadius: 8 }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Lợi nhuận ròng</div>
          <Statistic value={profit} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#1D4ED8' }} />
        </Card>
        <Card style={{ borderLeft: '4px solid #B45309', borderRadius: 8 }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tỷ lệ khai thác</div>
          <Statistic value={avgUtilization} suffix="%" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#B45309' }} />
        </Card>
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
              <div style={{ height: `${Math.abs(profitPercent) * 1.8}px`, width: '44px', backgroundColor: profit < 0 ? '#dc2626' : 'var(--status-rented-border)', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '11px', transition: 'height 0.5s' }} className="font-mono">
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
          <div className="responsive-desktop-table">
            <Table
              dataSource={expenseBreakdown}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Biển số',
                  dataIndex: 'id',
                  key: 'id',
                  render: (id: string) => <span className="license-plate" style={{ fontSize: '11px', padding: '2px 6px' }}>{id}</span>
                },
                {
                  title: 'Bảo dưỡng',
                  dataIndex: 'maint',
                  key: 'maint',
                  render: (val: number) => <span style={{ color: '#595959' }}>{val.toLocaleString()} ₫</span>
                },
                {
                  title: 'Vệ sinh',
                  dataIndex: 'clean',
                  key: 'clean',
                  render: (val: number) => <span style={{ color: '#595959' }}>{val.toLocaleString()} ₫</span>
                },
                {
                  title: 'Chiết khấu / Khác',
                  dataIndex: 'repair',
                  key: 'repair',
                  render: (val: number) => <span style={{ color: '#595959' }}>{val.toLocaleString()} ₫</span>
                }
              ]}
            />
          </div>
          <div className="responsive-mobile-list entity-mobile-list">
            {expenseBreakdown.length === 0 ? (
              <div className="entity-mobile-empty">Chưa có dữ liệu chi phí theo xe.</div>
            ) : (
              expenseBreakdown.map(item => (
                <article className="entity-mobile-card" key={item.id}>
                  <div className="entity-mobile-head"><div><strong>{item.id}</strong></div></div>
                  <div className="entity-mobile-fields">
                    <div><span>Bảo dưỡng</span><strong>{item.maint.toLocaleString()} ₫</strong></div>
                    <div><span>Vệ sinh</span><strong>{item.clean.toLocaleString()} ₫</strong></div>
                    <div><span>Chiết khấu / Khác</span><strong>{item.repair.toLocaleString()} ₫</strong></div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
