import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Car,
  CircleDollarSign,
  FileWarning,
  PieChart,
  RefreshCw,
  Users,
  WalletCards,
} from 'lucide-react';
import { Pagination } from '../components/Pagination';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const VEHICLES_PER_PAGE = 10;
type TimeRange = 'today' | '7d' | 'month' | 'quarter' | 'year' | 'custom';
type GroupBy = 'day' | 'week' | 'month';

type ReportSummary = {
  booked_value: number;
  revenue: number;
  rental_revenue: number;
  service_revenue: number;
  rental_fee_revenue: number;
  delivery_fee_revenue: number;
  rental_extra_revenue: number;
  violation_revenue: number;
  discount_amount: number;
  service_base_revenue: number;
  service_extra_revenue: number;
  collected_revenue: number;
  period_receivables: number;
  total_receivables: number;
  cash_received: number;
  customer_refunds: number;
  cash_in: number;
  cash_out: number;
  operating_expenses: number;
  expense_cash_out: number;
  owner_commissions: number;
  owner_payouts_confirmed: number;
  owner_manual_payouts: number;
  owner_payouts_draft: number;
  driver_commissions: number;
  driver_manual_payouts: number;
  owner_payables: number;
  driver_payables: number;
  partner_payables: number;
  total_costs: number;
  profit: number;
  profit_margin: number;
  deposits_held: number;
  deposit_received: number;
  deposit_refunded: number;
  motorcycle_collateral_held: number;
  net_cash_flow: number;
  rental_orders_completed: number;
  service_orders_completed: number;
  rental_orders_open: number;
  service_orders_open: number;
};

type ReportSeries = {
  bucket: string;
  revenue: number;
  rental_revenue: number;
  service_revenue: number;
  operating_expenses: number;
  owner_commissions: number;
  owner_payouts: number;
  driver_commissions: number;
  total_costs: number;
  profit: number;
  cash_received: number;
  cash_out: number;
  net_cash_flow: number;
};

type MoneyBreakdown = { category: string; amount: number };

type VehicleReport = {
  id: string;
  name: string;
  revenue: number;
  operating_expenses: number;
  owner_commissions: number;
  driver_commissions: number;
  total_costs: number;
  rental_count: number;
  service_count: number;
  utilized_hours: number;
  utilization_rate: number;
  profit: number;
};

type OwnerReport = {
  id: string;
  name: string;
  vehicle_count: number;
  rental_count: number;
  accrued: number;
  paid: number;
  draft: number;
  outstanding: number;
};

type DriverReport = {
  id: string;
  name: string;
  service_count: number;
  accrued: number;
  paid: number;
  outstanding: number;
};

type CustomerReport = {
  name: string;
  phone: string;
  orders: number;
  revenue: number;
};

type DataQuality = {
  legacy_rentals_without_ledger: number;
  legacy_services_without_ledger: number;
  missing_owner_commissions: number;
  missing_driver_commissions: number;
  draft_owner_payouts: number;
  manual_partner_payouts: number;
  report_query_failures: string[];
};

type ReportData = {
  summary: ReportSummary;
  series: ReportSeries[];
  expense_breakdown: MoneyBreakdown[];
  cash_out_breakdown: MoneyBreakdown[];
  vehicles: VehicleReport[];
  owners: OwnerReport[];
  drivers: DriverReport[];
  customers: CustomerReport[];
  fleet: {
    total: number;
    available: number;
    reserved: number;
    rented: number;
    maintenance: number;
    suspended: number;
  };
  data_quality: DataQuality;
};

const numberValue = (value: unknown) => Number(value) || 0;
const formatMoney = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} ₫`;
const moneyShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${Math.round(value)}`;
};

const summaryKeys: Array<keyof ReportSummary> = [
  'booked_value', 'revenue', 'rental_revenue', 'service_revenue', 'rental_fee_revenue',
  'delivery_fee_revenue', 'rental_extra_revenue', 'violation_revenue', 'discount_amount',
  'service_base_revenue', 'service_extra_revenue', 'collected_revenue', 'period_receivables',
  'total_receivables', 'cash_received', 'customer_refunds', 'cash_in', 'cash_out',
  'operating_expenses', 'expense_cash_out', 'owner_commissions', 'owner_payouts_confirmed',
  'owner_manual_payouts', 'owner_payouts_draft', 'driver_commissions', 'driver_manual_payouts',
  'owner_payables', 'driver_payables', 'partner_payables', 'total_costs', 'profit',
  'profit_margin', 'deposits_held', 'deposit_received', 'deposit_refunded',
  'motorcycle_collateral_held', 'net_cash_flow', 'rental_orders_completed',
  'service_orders_completed', 'rental_orders_open', 'service_orders_open',
];

const emptySummary = Object.fromEntries(summaryKeys.map((key) => [key, 0])) as ReportSummary;
const emptyQuality: DataQuality = {
  legacy_rentals_without_ledger: 0,
  legacy_services_without_ledger: 0,
  missing_owner_commissions: 0,
  missing_driver_commissions: 0,
  draft_owner_payouts: 0,
  manual_partner_payouts: 0,
  report_query_failures: [],
};
const qualityNumberKeys = Object.keys(emptyQuality)
  .filter((key) => key !== 'report_query_failures') as Array<Exclude<keyof DataQuality, 'report_query_failures'>>;
const emptyReport: ReportData = {
  summary: emptySummary,
  series: [],
  expense_breakdown: [],
  cash_out_breakdown: [],
  vehicles: [],
  owners: [],
  drivers: [],
  customers: [],
  fleet: { total: 0, available: 0, reserved: 0, rented: 0, maintenance: 0, suspended: 0 },
  data_quality: emptyQuality,
};

const dateKey = (date: Date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date);

const shiftDateKey = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const shiftMonthKey = (value: string, months: number) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 10);
};

const isoStart = (value: string) => `${value}T00:00:00+07:00`;
const parseBucketDate = (value: string) => new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}+07:00`);

const normalizeMoneyRows = (value: unknown): MoneyBreakdown[] => Array.isArray(value)
  ? value.map((item: any) => ({ category: String(item.category || 'Khác'), amount: numberValue(item.amount) }))
    .filter((item) => item.amount !== 0)
  : [];

const normalizeReport = (payload: any): ReportData => {
  const source = payload?.data || {};
  const sourceSummary = source.summary || {};
  const summary = Object.fromEntries(summaryKeys.map((key) => [key, numberValue(sourceSummary[key])])) as ReportSummary;
  const qualitySource = source.data_quality || {};
  return {
    summary,
    series: Array.isArray(source.series) ? source.series.map((item: any) => ({
      bucket: String(item.bucket || ''),
      revenue: numberValue(item.revenue),
      rental_revenue: numberValue(item.rental_revenue),
      service_revenue: numberValue(item.service_revenue),
      operating_expenses: numberValue(item.operating_expenses),
      owner_commissions: numberValue(item.owner_commissions),
      owner_payouts: numberValue(item.owner_payouts),
      driver_commissions: numberValue(item.driver_commissions),
      total_costs: numberValue(item.total_costs),
      profit: numberValue(item.profit),
      cash_received: numberValue(item.cash_received),
      cash_out: numberValue(item.cash_out),
      net_cash_flow: numberValue(item.net_cash_flow),
    })) : [],
    expense_breakdown: normalizeMoneyRows(source.expense_breakdown),
    cash_out_breakdown: normalizeMoneyRows(source.cash_out_breakdown),
    vehicles: Array.isArray(source.vehicles) ? source.vehicles.map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || item.id || 'Xe'),
      revenue: numberValue(item.revenue),
      operating_expenses: numberValue(item.operating_expenses),
      owner_commissions: numberValue(item.owner_commissions),
      driver_commissions: numberValue(item.driver_commissions),
      total_costs: numberValue(item.total_costs),
      rental_count: numberValue(item.rental_count),
      service_count: numberValue(item.service_count),
      utilized_hours: numberValue(item.utilized_hours),
      utilization_rate: numberValue(item.utilization_rate),
      profit: numberValue(item.profit),
    })) : [],
    owners: Array.isArray(source.owners) ? source.owners.map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || 'Chủ xe'),
      vehicle_count: numberValue(item.vehicle_count),
      rental_count: numberValue(item.rental_count),
      accrued: numberValue(item.accrued),
      paid: numberValue(item.paid),
      draft: numberValue(item.draft),
      outstanding: numberValue(item.outstanding),
    })) : [],
    drivers: Array.isArray(source.drivers) ? source.drivers.map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || 'Tài xế'),
      service_count: numberValue(item.service_count),
      accrued: numberValue(item.accrued),
      paid: numberValue(item.paid),
      outstanding: numberValue(item.outstanding),
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
    data_quality: {
      ...Object.fromEntries(
        qualityNumberKeys.map((key) => [key, numberValue(qualitySource[key])]),
      ),
      report_query_failures: Array.isArray(qualitySource.report_query_failures)
        ? qualitySource.report_query_failures.map(String)
        : [],
    } as DataQuality,
  };
};

const KpiCard = ({
  label,
  value,
  note,
  color,
  icon,
  background,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
  icon: ReactNode;
  background?: string;
}) => (
  <div className="card" style={{ borderTop: `3px solid ${color}`, minHeight: 126, background: background || 'var(--bg-card)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
      <span style={{ color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.035em' }}>{label}</span>
      <span style={{ color }}>{icon}</span>
    </div>
    <div style={{ color: value.startsWith('-') ? '#dc2626' : '#0f172a', fontSize: 23, fontWeight: 850, marginTop: 13, letterSpacing: '-.025em' }}>{value}</div>
    <div style={{ color: '#64748b', fontSize: 11.5, lineHeight: 1.45, marginTop: 5 }}>{note}</div>
  </div>
);

const FormulaLine = ({ label, amount, tone, operator }: { label: string; amount: number; tone?: string; operator?: string }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr) auto', gap: 7, alignItems: 'center', padding: '6px 0', fontSize: 12.5 }}>
    <span style={{ color: tone || '#94a3b8', fontWeight: 900 }}>{operator || ''}</span>
    <span style={{ color: '#475569' }}>{label}</span>
    <strong style={{ color: tone || '#0f172a' }}>{formatMoney(amount)}</strong>
  </div>
);

const BreakdownBars = ({ rows, total, palette = '#ea580c' }: { rows: MoneyBreakdown[]; total: number; palette?: string }) => (
  rows.length === 0
    ? <div style={{ padding: '34px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu trong kỳ.</div>
    : <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {rows.slice(0, 9).map((item, index) => {
        const percent = total > 0 ? Math.min(100, (item.amount / total) * 100) : 0;
        return (
          <div key={`${item.category}-${index}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, marginBottom: 5 }}>
              <span style={{ color: '#334155', fontWeight: 650 }}>{item.category}</span>
              <strong>{formatMoney(item.amount)}</strong>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${percent}%`, borderRadius: 99, background: index === 0 ? palette : `${palette}c7` }} />
            </div>
          </div>
        );
      })}
    </div>
);

type ChartKey = 'revenue' | 'total_costs' | 'profit' | 'cash_received' | 'cash_out' | 'net_cash_flow';
const TrendChart = ({
  series,
  datasets,
}: {
  series: ReportSeries[];
  datasets: Array<{ key: ChartKey; label: string; color: string }>;
}) => {
  if (series.length === 0) {
    return <div style={{ height: 255, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu trong khoảng thời gian này.</div>;
  }
  const values = series.flatMap((item) => datasets.map((dataset) => item[dataset.key]));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const range = Math.max(1, maxValue - minValue);
  const x = (index: number) => series.length <= 1 ? 360 : 32 + (index / (series.length - 1)) * 652;
  const y = (value: number) => 215 - ((value - minValue) / range) * 178;
  const zeroY = y(0);

  return (
    <div>
      <svg viewBox="0 0 720 250" role="img" aria-label="Biểu đồ báo cáo tài chính" style={{ width: '100%', height: 250, overflow: 'visible' }}>
        {[0, 1, 2, 3, 4].map((line) => {
          const lineY = 37 + line * 44.5;
          return <line key={line} x1="32" x2="684" y1={lineY} y2={lineY} stroke="#e2e8f0" strokeDasharray="4 5" />;
        })}
        {minValue < 0 && <line x1="32" x2="684" y1={zeroY} y2={zeroY} stroke="#94a3b8" strokeWidth="1.2" />}
        {datasets.map((dataset) => (
          <polyline
            key={dataset.key}
            points={series.map((item, index) => `${x(index)},${y(item[dataset.key])}`).join(' ')}
            fill="none"
            stroke={dataset.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <text x="32" y="19" fontSize="10" fill="#64748b">{moneyShort(maxValue)}</text>
        <text x="32" y="242" fontSize="10" fill="#64748b">{parseBucketDate(series[0].bucket).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</text>
        <text x="684" y="242" textAnchor="end" fontSize="10" fill="#64748b">{parseBucketDate(series[series.length - 1].bucket).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</text>
      </svg>
      <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', color: '#64748b', fontSize: 11.5 }}>
        {datasets.map((dataset) => <span key={dataset.key}><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: dataset.color, marginRight: 5 }} />{dataset.label}</span>)}
      </div>
    </div>
  );
};

const Reports = () => {
  const today = dateKey();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [startDate, setStartDate] = useState(() => shiftDateKey(today, -29));
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<ReportData>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehiclePage, setVehiclePage] = useState(1);

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
    const days = (Date.parse(isoStart(period.endKey)) - Date.parse(isoStart(period.startKey))) / 86_400_000;
    if (days > 120) return 'month';
    if (days > 45) return 'week';
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
    const params = new URLSearchParams({ start: isoStart(period.startKey), end: isoStart(period.endKey), groupBy });
    void fetch(`/api/reports/summary?${params.toString()}`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Không thể tải báo cáo');
        setReport(normalizeReport(payload));
        setVehiclePage(1);
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
  const vehicleTotalPages = Math.max(1, Math.ceil(report.vehicles.length / VEHICLES_PER_PAGE));
  const currentVehiclePage = Math.min(vehiclePage, vehicleTotalPages);
  const paginatedVehicles = report.vehicles.slice(
    (currentVehiclePage - 1) * VEHICLES_PER_PAGE,
    currentVehiclePage * VEHICLES_PER_PAGE,
  );
  const fleetTotal = Math.max(1, fleet.total);
  const averageUtilization = report.vehicles.length
    ? report.vehicles.reduce((sum, vehicle) => sum + vehicle.utilization_rate, 0) / report.vehicles.length
    : 0;
  const periodLabel = `${new Date(isoStart(period.startKey)).toLocaleDateString('vi-VN')} – ${new Date(isoStart(shiftDateKey(period.endKey, -1))).toLocaleDateString('vi-VN')}`;
  const businessCashOut = summary.expense_cash_out + summary.owner_payouts_confirmed;
  const refundCashOut = summary.customer_refunds + summary.deposit_refunded;
  const qualityWarnings = qualityNumberKeys.reduce(
    (sum, key) => sum + report.data_quality[key],
    report.data_quality.report_query_failures.length,
  );

  return (
    <div className="reports-page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', margin: 0 }}>Báo cáo & Thống kê</h1>
            <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 800 }}>SỔ TÀI CHÍNH</span>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 0' }}>Doanh thu, toàn bộ chi phí phát sinh, dòng tiền, công nợ và hiệu quả đội xe.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12 }}><Calendar size={15} /> Kỳ báo cáo: <strong style={{ color: '#0f172a' }}>{periodLabel}</strong></div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10 }}>
        {([['today', 'Hôm nay'], ['7d', '7 ngày'], ['month', 'Tháng này'], ['quarter', 'Quý này'], ['year', 'Năm nay'], ['custom', 'Tùy chỉnh']] as Array<[TimeRange, string]>).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTimeRange(key)} style={{ border: 0, borderRadius: 8, padding: '8px 13px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: timeRange === key ? 'var(--primary)' : 'transparent', color: timeRange === key ? '#fff' : '#64748b' }}>{label}</button>
        ))}
        {timeRange === 'custom' && <div style={{ display: 'flex', alignItems: 'center', gap: 7, borderLeft: '1px solid var(--border)', paddingLeft: 10, marginLeft: 4 }}>
          <input aria-label="Ngày bắt đầu" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="form-input" style={{ width: 142, padding: '6px 8px', fontSize: 12 }} />
          <span style={{ color: '#94a3b8' }}>đến</span>
          <input aria-label="Ngày kết thúc" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="form-input" style={{ width: 142, padding: '6px 8px', fontSize: 12 }} />
        </div>}
        {loading && <RefreshCw size={15} className="spin" color="var(--primary)" />}
      </div>

      {error && <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileWarning size={16} /> Không tải được báo cáo: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: 14 }}>
        <KpiCard label="Doanh thu ghi nhận" value={formatMoney(summary.revenue)} note={`Thuê xe ${formatMoney(summary.rental_revenue)} · Dịch vụ ${formatMoney(summary.service_revenue)}`} color="#047857" icon={<CircleDollarSign size={19} />} />
        <KpiCard label="Tổng chi phí phát sinh" value={formatMoney(summary.total_costs)} note={`Vận hành ${formatMoney(summary.operating_expenses)} · Chủ xe ${formatMoney(summary.owner_commissions)} · Tài xế ${formatMoney(summary.driver_commissions)}`} color="#ea580c" icon={<ArrowUpRight size={19} />} />
        <KpiCard label="Lợi nhuận của cửa hàng" value={formatMoney(summary.profit)} note={`Doanh thu − toàn bộ chi phí · Biên ${summary.profit_margin.toFixed(1)}%`} color={summary.profit < 0 ? '#dc2626' : '#059669'} background={summary.profit < 0 ? '#fff1f2' : '#dcfce7'} icon={<Activity size={19} />} />
        <KpiCard label="Phải trả đối tác" value={formatMoney(summary.partner_payables)} note={`Chủ xe ${formatMoney(summary.owner_payables)} · Tài xế ${formatMoney(summary.driver_payables)}`} color="#7c3aed" icon={<Users size={19} />} />
        <KpiCard label="Tiền cọc đang giữ" value={formatMoney(summary.deposits_held)} note={`Nhận kỳ này ${formatMoney(summary.deposit_received)} · ${summary.motorcycle_collateral_held} xe máy đang giữ`} color="#6d28d9" icon={<WalletCards size={19} />} />
        <KpiCard label="Giá trị đơn trong kỳ" value={formatMoney(summary.booked_value)} note={`${summary.rental_orders_completed + summary.service_orders_completed} đơn hoàn thành · ${summary.rental_orders_open + summary.service_orders_open} đơn đang mở`} color="#0369a1" icon={<BarChart3 size={19} />} />
        <KpiCard label="Đã thu cho đơn trong kỳ" value={formatMoney(summary.collected_revenue)} note="Tiền đã áp vào hóa đơn; cọc chưa khấu trừ không tính doanh thu" color="#0f766e" icon={<ArrowDownRight size={19} />} />
      </div>

      <div className="card" style={{ border: '1px solid #bae6fd', background: '#f0f9ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <div><h2 style={{ margin: 0, fontSize: 17, color: '#0c4a6e' }}>Dòng tiền thực tế trong kỳ</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12 }}>Tách riêng tiền khách nộp, hoàn tiền và các khoản đã chi khỏi lợi nhuận phát sinh.</p></div>
          <strong style={{ color: summary.net_cash_flow < 0 ? '#dc2626' : '#047857', fontSize: 20 }}>Ròng: {formatMoney(summary.net_cash_flow)}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 13 }}><span style={{ color: '#64748b', fontSize: 11 }}>TIỀN KHÁCH NỘP</span><strong style={{ display: 'block', marginTop: 6, color: '#047857' }}>{formatMoney(summary.cash_received)}</strong><small style={{ color: '#94a3b8' }}>Có gồm tiền cọc nhận vào</small></div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 13 }}><span style={{ color: '#64748b', fontSize: 11 }}>HOÀN KHÁCH / HOÀN CỌC</span><strong style={{ display: 'block', marginTop: 6, color: '#b91c1c' }}>{formatMoney(refundCashOut)}</strong><small style={{ color: '#94a3b8' }}>Doanh thu {formatMoney(summary.customer_refunds)} · Cọc {formatMoney(summary.deposit_refunded)}</small></div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 13 }}><span style={{ color: '#64748b', fontSize: 11 }}>CHI PHÍ / PAYOUT ĐÃ CHI</span><strong style={{ display: 'block', marginTop: 6, color: '#c2410c' }}>{formatMoney(businessCashOut)}</strong><small style={{ color: '#94a3b8' }}>Sổ chi {formatMoney(summary.expense_cash_out)} · Payout {formatMoney(summary.owner_payouts_confirmed)}</small></div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 13 }}><span style={{ color: '#64748b', fontSize: 11 }}>TỔNG TIỀN RA</span><strong style={{ display: 'block', marginTop: 6, color: '#7f1d1d' }}>{formatMoney(summary.cash_out)}</strong><small style={{ color: '#94a3b8' }}>Hoàn khách + hoàn cọc + chi phí + payout</small></div>
        </div>
      </div>

      <div className="grid grid-auto-lg gap-lg">
        <div className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 17, color: '#0f172a' }}>Công thức doanh thu</h2>
          <FormulaLine label="Tiền thuê xe" amount={summary.rental_fee_revenue} operator="+" tone="#047857" />
          <FormulaLine label="Phí giao xe" amount={summary.delivery_fee_revenue} operator="+" />
          <FormulaLine label="Phụ phí đơn thuê" amount={summary.rental_extra_revenue} operator="+" />
          <FormulaLine label="Phạt / chi phí phát sinh thu khách" amount={summary.violation_revenue} operator="+" />
          <FormulaLine label="Giảm giá" amount={summary.discount_amount} operator="−" tone="#dc2626" />
          <FormulaLine label="Doanh thu dịch vụ theo km" amount={summary.service_base_revenue} operator="+" />
          <FormulaLine label="Phụ phí dịch vụ" amount={summary.service_extra_revenue} operator="+" />
          <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: 7, paddingTop: 5 }}><FormulaLine label="Doanh thu ghi nhận" amount={summary.revenue} operator="=" tone="#047857" /></div>
        </div>
        <div className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 17, color: '#0f172a' }}>Công thức lợi nhuận</h2>
          <FormulaLine label="Doanh thu ghi nhận" amount={summary.revenue} operator="+" tone="#047857" />
          <FormulaLine label="Chi phí vận hành" amount={summary.operating_expenses} operator="−" tone="#c2410c" />
          <FormulaLine label="Chiết khấu chủ xe phải trả" amount={summary.owner_commissions} operator="−" tone="#7c3aed" />
          <FormulaLine label="Hoa hồng tài xế phải trả" amount={summary.driver_commissions} operator="−" tone="#2563eb" />
          <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: 7, paddingTop: 5 }}><FormulaLine label="Lợi nhuận của cửa hàng" amount={summary.profit} operator="=" tone={summary.profit < 0 ? '#dc2626' : '#047857'} /></div>
          <div style={{ marginTop: 12, borderRadius: 9, background: '#f8fafc', padding: 11, color: '#64748b', fontSize: 11.5, lineHeight: 1.55 }}>
            Payout đã chi không bị trừ lần hai trong lợi nhuận vì đó là thanh toán khoản chiết khấu đã phát sinh. Payout chỉ đi vào dòng tiền thực tế.
          </div>
        </div>
      </div>

      <div className="grid grid-auto-lg gap-lg">
        <div className="card" style={{ minHeight: 340 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={19} color="#047857" /> Doanh thu – Chi phí – Lợi nhuận</h2>
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: 12 }}>Theo {groupBy === 'day' ? 'ngày' : groupBy === 'week' ? 'tuần' : 'tháng'}, có điền cả mốc bằng 0.</p>
          <TrendChart series={report.series} datasets={[{ key: 'revenue', label: 'Doanh thu', color: '#047857' }, { key: 'total_costs', label: 'Chi phí phát sinh', color: '#ea580c' }, { key: 'profit', label: 'Lợi nhuận', color: '#2563eb' }]} />
        </div>
        <div className="card" style={{ minHeight: 340 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={19} color="#0369a1" /> Tiền vào – Tiền ra – Dòng tiền ròng</h2>
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: 12 }}>Theo thời điểm giao dịch hoặc ngày dữ liệu cũ được ghi nhận.</p>
          <TrendChart series={report.series} datasets={[{ key: 'cash_received', label: 'Tiền vào', color: '#0891b2' }, { key: 'cash_out', label: 'Tiền ra', color: '#dc2626' }, { key: 'net_cash_flow', label: 'Dòng tiền ròng', color: '#16a34a' }]} />
        </div>
      </div>

      <div className="grid grid-auto-lg gap-lg">
        <div className="card">
          <h2 style={{ margin: '0 0 4px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><PieChart size={19} color="#ea580c" /> Cơ cấu chi phí phát sinh</h2>
          <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 12 }}>Dùng để tính lợi nhuận, gồm vận hành và hoa hồng phải trả.</p>
          <BreakdownBars rows={report.expense_breakdown} total={summary.total_costs} />
        </div>
        <div className="card">
          <h2 style={{ margin: '0 0 4px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><WalletCards size={19} color="#b91c1c" /> Cơ cấu tiền đã ra</h2>
          <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 12 }}>Dùng để tính dòng tiền, không dùng để trừ lại vào lợi nhuận.</p>
          <BreakdownBars rows={report.cash_out_breakdown} total={summary.cash_out} palette="#dc2626" />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}><h2 style={{ margin: 0, fontSize: 17 }}>Chiết khấu & công nợ chủ xe</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12 }}>“Phát sinh” lấy từ hợp đồng hoàn thành; “đã trả” lấy payout xác nhận và phiếu chi cũ; “còn phải trả” tính đến cuối kỳ.</p></div>
        <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ minWidth: 860 }}>
          <thead><tr><th>Chủ xe</th><th>Xe</th><th>Đơn kỳ này</th><th>Phát sinh kỳ này</th><th>Đã trả kỳ này</th><th>Payout nháp</th><th>Còn phải trả</th></tr></thead>
          <tbody>{report.owners.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 26, color: '#94a3b8' }}>Chưa có chiết khấu chủ xe.</td></tr> : report.owners.map((owner) => <tr key={owner.id}><td><strong>{owner.name}</strong></td><td>{owner.vehicle_count}</td><td>{owner.rental_count}</td><td style={{ color: '#7c3aed', fontWeight: 700 }}>{formatMoney(owner.accrued)}</td><td style={{ color: '#047857' }}>{formatMoney(owner.paid)}</td><td style={{ color: '#b45309' }}>{formatMoney(owner.draft)}</td><td style={{ color: owner.outstanding > 0 ? '#b91c1c' : '#047857', fontWeight: 800 }}>{formatMoney(owner.outstanding)}</td></tr>)}</tbody>
        </table></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}><h2 style={{ margin: 0, fontSize: 17 }}>Hoa hồng & công nợ tài xế dịch vụ</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12 }}>Hoa hồng tính khi đơn dịch vụ hoàn thành. Hiện tiền đã trả tài xế chỉ nhận diện từ phiếu chi có danh mục/tên tài xế.</p></div>
        <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ minWidth: 720 }}>
          <thead><tr><th>Tài xế</th><th>Chuyến kỳ này</th><th>Hoa hồng phát sinh</th><th>Đã ghi phiếu chi</th><th>Còn phải trả</th></tr></thead>
          <tbody>{report.drivers.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 26, color: '#94a3b8' }}>Chưa có hoa hồng tài xế.</td></tr> : report.drivers.map((driver) => <tr key={driver.id}><td><strong>{driver.name}</strong></td><td>{driver.service_count}</td><td style={{ color: '#2563eb', fontWeight: 700 }}>{formatMoney(driver.accrued)}</td><td style={{ color: '#047857' }}>{formatMoney(driver.paid)}</td><td style={{ color: driver.outstanding > 0 ? '#b91c1c' : '#047857', fontWeight: 800 }}>{formatMoney(driver.outstanding)}</td></tr>)}</tbody>
        </table></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Car size={19} color="var(--primary)" /> Hiệu quả theo xe</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12 }}>Chi phí theo xe gồm vận hành, chiết khấu chủ xe và hoa hồng tài xế phát sinh.</p></div><span style={{ color: '#64748b', fontSize: 12 }}>{report.vehicles.length} xe</span></div>
        <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ minWidth: 960 }}>
          <thead><tr><th>Xe</th><th>Số đơn</th><th>Doanh thu</th><th>Vận hành</th><th>Chủ xe</th><th>Tài xế</th><th>Lợi nhuận</th><th>Khai thác</th></tr></thead>
          <tbody>{report.vehicles.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 26, color: '#94a3b8' }}>Chưa có dữ liệu xe.</td></tr> : paginatedVehicles.map((vehicle) => <tr key={vehicle.id}><td><strong>{vehicle.id}</strong><div style={{ color: '#64748b', fontSize: 11 }}>{vehicle.name}</div></td><td>{vehicle.rental_count + vehicle.service_count}</td><td style={{ fontWeight: 700 }}>{formatMoney(vehicle.revenue)}</td><td>{formatMoney(vehicle.operating_expenses)}</td><td>{formatMoney(vehicle.owner_commissions)}</td><td>{formatMoney(vehicle.driver_commissions)}</td><td style={{ fontWeight: 800, color: vehicle.profit < 0 ? '#dc2626' : '#047857' }}>{formatMoney(vehicle.profit)}</td><td><div style={{ minWidth: 110 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span>{vehicle.utilization_rate.toFixed(1)}%</span><span style={{ color: '#64748b' }}>{vehicle.utilized_hours.toFixed(1)}h</span></div><div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, vehicle.utilization_rate)}%`, background: 'var(--primary)', borderRadius: 99 }} /></div></div></td></tr>)}</tbody>
        </table></div>
        <Pagination
          currentPage={currentVehiclePage}
          totalPages={vehicleTotalPages}
          totalItems={report.vehicles.length}
          itemsPerPage={VEHICLES_PER_PAGE}
          onPageChange={setVehiclePage}
          unitName="xe"
        />
      </div>

      <div className="grid grid-auto-lg gap-lg">
        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Car size={19} color="var(--primary)" /> Tình trạng đội xe</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 142, height: 142, borderRadius: '50%', background: `conic-gradient(#16a34a 0 ${(fleet.available / fleetTotal) * 100}%, #f59e0b ${(fleet.available / fleetTotal) * 100}% ${((fleet.available + fleet.reserved) / fleetTotal) * 100}%, #2563eb ${((fleet.available + fleet.reserved) / fleetTotal) * 100}% ${((fleet.available + fleet.reserved + fleet.rented) / fleetTotal) * 100}%, #94a3b8 ${((fleet.available + fleet.reserved + fleet.rented) / fleetTotal) * 100}% 100%)`, display: 'grid', placeItems: 'center' }}><div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}><strong style={{ fontSize: 25 }}>{fleet.total}</strong><span style={{ fontSize: 11, color: '#64748b' }}>tổng xe</span></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(105px, 1fr))', gap: 10, flex: 1 }}>
              {[['Sẵn sàng', fleet.available, '#16a34a'], ['Đã đặt', fleet.reserved, '#f59e0b'], ['Đang thuê', fleet.rented, '#2563eb'], ['Bảo dưỡng', fleet.maintenance, '#64748b'], ['Tạm ngưng', fleet.suspended, '#dc2626'], ['Khai thác TB', `${averageUtilization.toFixed(1)}%`, '#7c3aed']].map(([label, value, color]) => <div key={String(label)} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 9, borderLeft: `3px solid ${color}` }}><div style={{ color: '#64748b', fontSize: 11 }}>{label}</div><strong style={{ display: 'block', marginTop: 4, fontSize: 17 }}>{value}</strong></div>)}
            </div>
          </div>
        </div>
        <div className="card">
          <h2 style={{ margin: '0 0 16px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={19} color="var(--primary)" /> Khách hàng nổi bật</h2>
          {report.customers.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Chưa có đơn hoàn thành trong kỳ.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{report.customers.map((customer, index) => <div key={`${customer.phone}-${customer.name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 9 }}><div><strong style={{ fontSize: 13 }}>{index + 1}. {customer.name}</strong><div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{customer.orders} đơn {customer.phone && `· ${customer.phone}`}</div></div><strong style={{ color: '#047857', fontSize: 13 }}>{formatMoney(customer.revenue)}</strong></div>)}</div>}
        </div>
      </div>

      {qualityWarnings > 0 && <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><FileWarning size={18} color="#b45309" /><div><strong style={{ color: '#92400e', fontSize: 13 }}>Dữ liệu cần đối soát</strong><div style={{ color: '#78350f', fontSize: 12, lineHeight: 1.7, marginTop: 5 }}>
          {report.data_quality.legacy_rentals_without_ledger > 0 && <div>• {report.data_quality.legacy_rentals_without_ledger} đơn thuê cũ chưa có sổ thanh toán: báo cáo đọc bù từ trạng thái đơn và tiền cọc cũ.</div>}
          {report.data_quality.legacy_services_without_ledger > 0 && <div>• {report.data_quality.legacy_services_without_ledger} đơn dịch vụ cũ chưa có sổ thanh toán.</div>}
          {report.data_quality.missing_owner_commissions > 0 && <div>• {report.data_quality.missing_owner_commissions} hợp đồng trong kỳ có tỷ lệ chủ xe nhưng số chiết khấu bằng 0.</div>}
          {report.data_quality.missing_driver_commissions > 0 && <div>• {report.data_quality.missing_driver_commissions} đơn dịch vụ trong kỳ có tỷ lệ tài xế nhưng hoa hồng bằng 0.</div>}
          {report.data_quality.draft_owner_payouts > 0 && <div>• {report.data_quality.draft_owner_payouts} payout chủ xe đang ở trạng thái nháp, chưa tính là tiền đã chi.</div>}
          {report.data_quality.manual_partner_payouts > 0 && <div>• {report.data_quality.manual_partner_payouts} phiếu chi đối tác được tạo theo luồng cũ; nếu đồng thời xác nhận payout mới cần kiểm tra trùng.</div>}
          {report.data_quality.report_query_failures.length > 0 && <div>• Một số bảng chi tiết chưa tải được ({report.data_quality.report_query_failures.join(', ')}); các số tổng chính vẫn được giữ và lỗi chi tiết đã ghi vào log máy chủ.</div>}
        </div></div>
      </div></div>}

      <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}><FileWarning size={18} color="#64748b" /><div><strong style={{ fontSize: 13 }}>Quy ước báo cáo</strong><div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.7, marginTop: 4 }}>Doanh thu và chi phí hoa hồng ghi nhận khi đơn hoàn thành. Cọc là tiền giữ hộ nên không tính vào doanh thu/lợi nhuận. Lợi nhuận dùng chi phí phát sinh; dòng tiền dùng giao dịch thực tế. Báo cáo chỉ đọc dữ liệu, không xóa hoặc ghi đè bản ghi cũ.</div></div></div>
      </div>
    </div>
  );
};

export default Reports;
