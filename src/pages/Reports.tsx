import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Calendar, Car, CircleDollarSign, FileWarning, PieChart, RefreshCw, Users, WalletCards } from 'lucide-react';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
type TimeRange = 'today' | '7d' | 'month' | 'quarter' | 'year' | 'custom';
type GroupBy = 'day' | 'week' | 'month';

type ReportSummary = {
  revenue: number;
  rental_revenue: number;
  service_revenue: number;
  collected_revenue: number;
  cash_in: number;
  operating_expenses: number;
  owner_payouts: number;
  driver_commissions: number;
  total_costs: number;
  profit: number;
  profit_margin: number;
  receivables: number;
  deposits_held: number;
  deposit_refunded: number;
  motorcycle_collateral_held: number;
  net_cash_flow: number;
};

type ReportSeries = {
  bucket: string;
  revenue: number;
  rental_revenue: number;
  service_revenue: number;
  collected_revenue: number;
  cash_in: number;
  operating_expenses: number;
  owner_payouts: number;
  driver_commissions: number;
};

type VehicleReport = {
  id: string;
  name: string;
  revenue: number;
  operating_expenses: number;
  owner_payouts: number;
  driver_commissions: number;
  rental_count: number;
  service_count: number;
  utilized_hours: number;
  utilization_rate: number;
  profit: number;
};

type CustomerReport = {
  name: string;
  phone: string;
  orders: number;
  revenue: number;
};

type ReportData = {
  summary: ReportSummary;
  series: ReportSeries[];
  expense_breakdown: Array<{ category: string; amount: number }>;
  vehicles: VehicleReport[];
  customers: CustomerReport[];
  fleet: {
    total: number;
    available: number;
    reserved: number;
    rented: number;
    maintenance: number;
    suspended: number;
  };
};

const emptySummary: ReportSummary = {
  revenue: 0,
  rental_revenue: 0,
  service_revenue: 0,
  collected_revenue: 0,
  cash_in: 0,
  operating_expenses: 0,
  owner_payouts: 0,
  driver_commissions: 0,
  total_costs: 0,
  profit: 0,
  profit_margin: 0,
  receivables: 0,
  deposits_held: 0,
  deposit_refunded: 0,
  motorcycle_collateral_held: 0,
  net_cash_flow: 0,
};

const emptyReport: ReportData = {
  summary: emptySummary,
  series: [],
  expense_breakdown: [],
  vehicles: [],
  customers: [],
  fleet: { total: 0, available: 0, reserved: 0, rented: 0, maintenance: 0, suspended: 0 },
};

const numberValue = (value: unknown) => Number(value) || 0;
const formatMoney = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} ₫`;

const dateKey = (date: Date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date);

const shiftDateKey = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

const shiftMonthKey = (value: string, months: number) => {
  const [year, month] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return shifted.toISOString().slice(0, 10);
};

const isoStart = (value: string) => `${value}T00:00:00+07:00`;
const parseBucketDate = (value: string) => new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}+07:00`);

const normalizeReport = (payload: any): ReportData => {
  const source = payload?.data || {};
  const summary = source.summary || {};
  return {
    summary: Object.fromEntries(Object.keys(emptySummary).map((key) => [key, numberValue(summary[key])])) as ReportSummary,
    series: Array.isArray(source.series) ? source.series.map((item: any) => ({
      bucket: String(item.bucket || ''),
      revenue: numberValue(item.revenue),
      rental_revenue: numberValue(item.rental_revenue),
      service_revenue: numberValue(item.service_revenue),
      collected_revenue: numberValue(item.collected_revenue),
      cash_in: numberValue(item.cash_in),
      operating_expenses: numberValue(item.operating_expenses),
      owner_payouts: numberValue(item.owner_payouts),
      driver_commissions: numberValue(item.driver_commissions),
    })) : [],
    expense_breakdown: Array.isArray(source.expense_breakdown) ? source.expense_breakdown.map((item: any) => ({
      category: String(item.category || 'Khác'),
      amount: numberValue(item.amount),
    })).filter((item: { amount: number }) => item.amount > 0) : [],
    vehicles: Array.isArray(source.vehicles) ? source.vehicles.map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || item.id || 'Xe'),
      revenue: numberValue(item.revenue),
      operating_expenses: numberValue(item.operating_expenses),
      owner_payouts: numberValue(item.owner_payouts),
      driver_commissions: numberValue(item.driver_commissions),
      rental_count: numberValue(item.rental_count),
      service_count: numberValue(item.service_count),
      utilized_hours: numberValue(item.utilized_hours),
      utilization_rate: numberValue(item.utilization_rate),
      profit: numberValue(item.profit),
    })) : [],
    customers: Array.isArray(source.customers) ? source.customers.map((item: any) => ({
      name: String(item.name || 'Khách lẻ'),
      phone: String(item.phone || ''),
      orders: numberValue(item.orders),
      revenue: numberValue(item.revenue),
    })) : [],
    fleet: {
      total: numberValue(source.fleet?.total),
      available: numberValue(source.fleet?.available),
      reserved: numberValue(source.fleet?.reserved),
      rented: numberValue(source.fleet?.rented),
      maintenance: numberValue(source.fleet?.maintenance),
      suspended: numberValue(source.fleet?.suspended),
    },
  };
};

const moneyShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${Math.round(value)}`;
};

const ChartLegend = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
    <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#047857', marginRight: 5 }} />Doanh thu</span>
    <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#ea580c', marginRight: 5 }} />Tổng chi phí</span>
    <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#2563eb', marginRight: 5 }} />Lợi nhuận</span>
  </div>
);

const TrendChart = ({ series }: { series: ReportSeries[] }) => {
  const chartSeries = series.map((item) => ({
    ...item,
    total_costs: item.operating_expenses + item.owner_payouts + item.driver_commissions,
    profit: item.revenue - item.operating_expenses - item.owner_payouts - item.driver_commissions,
  }));
  const maxValue = Math.max(1, ...chartSeries.flatMap((item) => [item.revenue, item.total_costs, Math.abs(item.profit)]));
  const x = (index: number) => chartSeries.length <= 1 ? 360 : 24 + (index / (chartSeries.length - 1)) * 672;
  const y = (value: number) => 218 - (Math.max(0, value) / maxValue) * 190;
  const points = (key: 'revenue' | 'total_costs' | 'profit') => chartSeries.map((item, index) => `${x(index)},${y(item[key])}`).join(' ');

  if (chartSeries.length === 0) {
    return <div style={{ height: 250, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu trong khoảng thời gian này.</div>;
  }

  return (
    <div>
      <svg viewBox="0 0 720 250" role="img" aria-label="Biểu đồ doanh thu, chi phí và lợi nhuận" style={{ width: '100%', height: 250, overflow: 'visible' }}>
        {[0, 1, 2, 3, 4].map((line) => {
          const lineY = 218 - line * 47.5;
          return <line key={line} x1="24" x2="696" y1={lineY} y2={lineY} stroke="#e2e8f0" strokeDasharray="4 5" />;
        })}
        <polyline points={points('revenue')} fill="none" stroke="#047857" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points('total_costs')} fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points('profit')} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {chartSeries.map((item, index) => <circle key={item.bucket} cx={x(index)} cy={y(item.revenue)} r="3.5" fill="#047857" />)}
        <text x="24" y="242" fontSize="10" fill="#64748b">{parseBucketDate(chartSeries[0].bucket).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</text>
        <text x="696" y="242" textAnchor="end" fontSize="10" fill="#64748b">{parseBucketDate(chartSeries[chartSeries.length - 1].bucket).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</text>
        <text x="24" y="18" fontSize="10" fill="#64748b">{moneyShort(maxValue)}</text>
      </svg>
      <ChartLegend />
    </div>
  );
};

const KpiCard = ({ label, value, note, color, icon, negative }: { label: string; value: string; note?: string; color: string; icon: React.ReactNode; negative?: boolean }) => (
  <div className="card" style={{ borderTop: `3px solid ${color}`, minHeight: 124, position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</span>
      <span style={{ color, opacity: .9 }}>{icon}</span>
    </div>
    <div style={{ color: negative ? '#dc2626' : 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginTop: 14, letterSpacing: '-.02em' }}>{value}</div>
    {note && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 5 }}>{note}</div>}
  </div>
);

const Reports = () => {
  const today = dateKey();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [startDate, setStartDate] = useState(() => shiftDateKey(today, -29));
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<ReportData>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    const current = dateKey();
    if (timeRange === 'today') return { startKey: current, endKey: shiftDateKey(current, 1) };
    if (timeRange === '7d') return { startKey: shiftDateKey(current, -6), endKey: shiftDateKey(current, 1) };
    if (timeRange === 'month') {
      const startKey = `${current.slice(0, 7)}-01`;
      return { startKey, endKey: shiftMonthKey(startKey, 1) };
    }
    if (timeRange === 'quarter') {
      const month = Number(current.slice(5, 7));
      const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
      const startKey = `${current.slice(0, 4)}-${String(startMonth).padStart(2, '0')}-01`;
      return { startKey, endKey: shiftMonthKey(startKey, 3) };
    }
    if (timeRange === 'year') {
      const startKey = `${current.slice(0, 4)}-01-01`;
      return { startKey, endKey: `${Number(current.slice(0, 4)) + 1}-01-01` };
    }
    return { startKey: startDate, endKey: endDate < startDate ? startDate : shiftDateKey(endDate, 1) };
  }, [timeRange, startDate, endDate]);

  const groupBy = useMemo<GroupBy>(() => {
    const durationDays = (Date.parse(isoStart(period.endKey)) - Date.parse(isoStart(period.startKey))) / 86_400_000;
    if (durationDays > 120) return 'month';
    if (durationDays > 45) return 'week';
    return 'day';
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    if (timeRange === 'custom' && endDate < startDate) {
      setLoading(false);
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return () => controller.abort();
    }

    setLoading(true);
    const params = new URLSearchParams({
      start: isoStart(period.startKey),
      end: isoStart(period.endKey),
      groupBy,
    });
    void fetch(`/api/reports/summary?${params.toString()}`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Không thể tải báo cáo');
        setReport(normalizeReport(payload));
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Không thể tải báo cáo');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [period, groupBy, timeRange, startDate, endDate]);

  const summary = report.summary;
  const fleet = report.fleet;
  const fleetTotal = Math.max(1, fleet.total);
  const averageUtilization = report.vehicles.length > 0
    ? report.vehicles.reduce((sum, vehicle) => sum + vehicle.utilization_rate, 0) / report.vehicles.length
    : 0;
  const periodLabel = `${new Date(isoStart(period.startKey)).toLocaleDateString('vi-VN')} – ${new Date(isoStart(shiftDateKey(period.endKey, -1))).toLocaleDateString('vi-VN')}`;

  return (
    <div className="reports-page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Báo cáo & Thống kê</h1>
            <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 800 }}>SỔ BÁO CÁO</span>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 0' }}>Theo dõi doanh thu, dòng tiền, chi phí, lợi nhuận và hiệu suất đội xe.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12 }}><Calendar size={15} /> Kỳ báo cáo: <strong style={{ color: '#0f172a' }}>{periodLabel}</strong></div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10 }}>
        {([['today', 'Hôm nay'], ['7d', '7 ngày'], ['month', 'Tháng này'], ['quarter', 'Quý này'], ['year', 'Năm nay'], ['custom', 'Tùy chỉnh']] as Array<[TimeRange, string]>).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTimeRange(key)} style={{ border: 0, borderRadius: 8, padding: '8px 13px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: timeRange === key ? 'var(--primary)' : 'transparent', color: timeRange === key ? '#fff' : '#64748b' }}>{label}</button>
        ))}
        {timeRange === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, borderLeft: '1px solid var(--border)', paddingLeft: 10, marginLeft: 4 }}>
            <input aria-label="Ngày bắt đầu" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="form-input" style={{ width: 142, padding: '6px 8px', fontSize: 12 }} />
            <span style={{ color: '#94a3b8' }}>đến</span>
            <input aria-label="Ngày kết thúc" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="form-input" style={{ width: 142, padding: '6px 8px', fontSize: 12 }} />
          </div>
        )}
        {loading && <RefreshCw size={15} className="spin" color="var(--primary)" />}
      </div>

      {error && <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileWarning size={16} /> Không tải được sổ báo cáo: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: 14 }}>
        <KpiCard label="Doanh thu ghi nhận" value={formatMoney(summary.revenue)} note={`Thuê xe ${formatMoney(summary.rental_revenue)} · Dịch vụ ${formatMoney(summary.service_revenue)}`} color="#047857" icon={<CircleDollarSign size={19} />} />
        <KpiCard label="Đã thu từ doanh thu" value={formatMoney(summary.collected_revenue)} note="Không tính cọc hoàn lại vào doanh thu" color="#0f766e" icon={<ArrowDownRight size={19} />} />
        <KpiCard label="Tổng chi phí" value={formatMoney(summary.total_costs)} note={`Vận hành ${formatMoney(summary.operating_expenses)} · Chủ xe/tài xế`} color="#ea580c" icon={<ArrowUpRight size={19} />} />
        <KpiCard label="Lợi nhuận ròng" value={formatMoney(summary.profit)} note={`Biên lợi nhuận ${summary.profit_margin.toFixed(1)}%`} color={summary.profit < 0 ? '#dc2626' : '#2563eb'} negative={summary.profit < 0} icon={<Activity size={19} />} />
        <KpiCard label="Công nợ trong kỳ" value={formatMoney(summary.receivables)} note="Doanh thu đã ghi nhận chưa thu đủ" color="#b91c1c" icon={<WalletCards size={19} />} />
        <KpiCard label="Tiền cọc đang giữ" value={formatMoney(summary.deposits_held)} note={`Đã hoàn kỳ này ${formatMoney(summary.deposit_refunded)}`} color="#7c3aed" icon={<WalletCards size={19} />} />
        <KpiCard label="Tiền vào thực tế" value={formatMoney(summary.cash_in)} note="Có tách riêng tiền cọc" color="#0891b2" icon={<ArrowDownRight size={19} />} />
        <KpiCard label="Dòng tiền ròng" value={formatMoney(summary.net_cash_flow)} note="Tiền vào - chi vận hành - payout" color={summary.net_cash_flow < 0 ? '#dc2626' : '#16a34a'} negative={summary.net_cash_flow < 0} icon={<CircleDollarSign size={19} />} />
      </div>

      <div className="grid grid-auto-lg gap-lg">
        <div className="card" style={{ minHeight: 330 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div><h2 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={19} color="var(--primary)" /> Xu hướng tài chính</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12 }}>Nhóm theo {groupBy === 'day' ? 'ngày' : groupBy === 'week' ? 'tuần' : 'tháng'}.</p></div>
          </div>
          <TrendChart series={report.series} />
        </div>

        <div className="card" style={{ minHeight: 330 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><PieChart size={19} color="var(--primary)" /> Cơ cấu chi phí</h2>
          <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 12 }}>Tổng chi phí trong kỳ, gồm vận hành, payout chủ xe và hoa hồng tài xế.</p>
          {report.expense_breakdown.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Chưa có chi phí trong kỳ.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {report.expense_breakdown.slice(0, 7).map((item) => {
                const percent = summary.total_costs > 0 ? (item.amount / summary.total_costs) * 100 : 0;
                return <div key={item.category}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, marginBottom: 5 }}><span style={{ color: '#334155', fontWeight: 600 }}>{item.category}</span><strong>{formatMoney(item.amount)}</strong></div><div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, percent)}%`, height: '100%', borderRadius: 99, background: item.category === 'Hoa hồng tài xế' ? '#2563eb' : item.category === 'Chi trả chủ xe' ? '#7c3aed' : '#ea580c' }} /></div></div>;
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-auto-lg gap-lg">
        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Car size={19} color="var(--primary)" /> Tình trạng đội xe</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 142, height: 142, borderRadius: '50%', background: `conic-gradient(#16a34a 0 ${(fleet.available / fleetTotal) * 100}%, #f59e0b ${(fleet.available / fleetTotal) * 100}% ${((fleet.available + fleet.reserved) / fleetTotal) * 100}%, #2563eb ${((fleet.available + fleet.reserved) / fleetTotal) * 100}% ${((fleet.available + fleet.reserved + fleet.rented) / fleetTotal) * 100}%, #94a3b8 ${((fleet.available + fleet.reserved + fleet.rented) / fleetTotal) * 100}% 100%)`, display: 'grid', placeItems: 'center' }}><div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}><strong style={{ fontSize: 25 }}>{fleet.total}</strong><span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>tổng xe</span></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(110px, 1fr))', gap: 12, flex: 1 }}>
              {[['Sẵn sàng', fleet.available, '#16a34a'], ['Đã đặt', fleet.reserved, '#f59e0b'], ['Đang thuê', fleet.rented, '#2563eb'], ['Bảo dưỡng', fleet.maintenance, '#64748b'], ['Tạm ngưng', fleet.suspended, '#dc2626'], ['Khai thác bình quân', `${averageUtilization.toFixed(1)}%`, '#7c3aed']].map(([label, value, color]) => <div key={String(label)} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 9, borderLeft: `3px solid ${color}` }}><div style={{ color: '#64748b', fontSize: 11 }}>{label}</div><strong style={{ display: 'block', marginTop: 4, fontSize: 17 }}>{value}</strong></div>)}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={19} color="var(--primary)" /> Khách hàng nổi bật trong kỳ</h2>
          {report.customers.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Chưa có đơn hoàn thành trong kỳ.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{report.customers.map((customer, index) => <div key={`${customer.phone}-${customer.name}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 12px', background: '#f8fafc', borderRadius: 9 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 25, height: 25, display: 'grid', placeItems: 'center', borderRadius: '50%', background: index === 0 ? '#fef3c7' : '#e2e8f0', color: index === 0 ? '#92400e' : '#475569', fontWeight: 800, fontSize: 12 }}>{index + 1}</span><div><strong style={{ display: 'block', fontSize: 13 }}>{customer.name}</strong><span style={{ color: '#64748b', fontSize: 11 }}>{customer.orders} đơn {customer.phone && `· ${customer.phone}`}</span></div></div><strong style={{ color: 'var(--primary)', fontSize: 13 }}>{formatMoney(customer.revenue)}</strong></div>)}</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Car size={19} color="var(--primary)" /> Hiệu quả theo xe</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12 }}>Doanh thu, chi phí, lợi nhuận và tỷ lệ khai thác theo kỳ đã chọn.</p></div><span style={{ fontSize: 12, color: '#64748b' }}>{report.vehicles.length} xe</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 780 }}>
            <thead><tr><th>Xe</th><th>Đơn thuê</th><th>Doanh thu</th><th>Chi phí</th><th>Lợi nhuận</th><th>Khai thác</th></tr></thead>
            <tbody>{report.vehicles.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 25, color: '#94a3b8' }}>Chưa có dữ liệu xe.</td></tr> : report.vehicles.slice(0, 12).map((vehicle) => { const costs = vehicle.operating_expenses + vehicle.owner_payouts + vehicle.driver_commissions; return <tr key={vehicle.id}><td><strong>{vehicle.id}</strong><div style={{ color: '#64748b', fontSize: 11 }}>{vehicle.name}</div></td><td>{vehicle.rental_count + vehicle.service_count}</td><td style={{ fontWeight: 700 }}>{formatMoney(vehicle.revenue)}</td><td style={{ color: '#c2410c' }}>{formatMoney(costs)}</td><td style={{ fontWeight: 700, color: vehicle.profit < 0 ? '#dc2626' : '#047857' }}>{formatMoney(vehicle.profit)}</td><td><div style={{ minWidth: 110 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span>{vehicle.utilization_rate.toFixed(1)}%</span><span style={{ color: '#64748b' }}>{vehicle.utilized_hours.toFixed(1)}h</span></div><div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, vehicle.utilization_rate)}%`, background: 'var(--primary)', borderRadius: 99 }} /></div></div></td></tr>; })}</tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}><FileWarning size={18} color="#64748b" /><div><strong style={{ fontSize: 13 }}>Quy ước tính báo cáo</strong><div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.7, marginTop: 4 }}>Doanh thu chỉ ghi nhận từ đơn đã hoàn thành. Tiền cọc được tách khỏi doanh thu và lợi nhuận. Lợi nhuận = doanh thu - chi phí vận hành - payout chủ xe - hoa hồng tài xế. Các bản ghi cũ không bị xóa hoặc ghi đè.</div></div></div>
      </div>
    </div>
  );
};

export default Reports;
