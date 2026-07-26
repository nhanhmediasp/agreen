import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, type Rental } from '../context/AppContext';
import { KpiCard } from '../components/KpiCard';
import { FleetBoard } from '../components/FleetBoard';
import type { ExtendedCar } from '../components/FleetCard';
import { UpcomingScheduleList, type ScheduleItem } from '../components/UpcomingScheduleList';
import { RecentBookingsTable } from '../components/RecentBookingsTable';
import { Car as CarIcon, CheckCircle2, AlertCircle, X, TrendingUp } from 'lucide-react';

/** Số ngày lệch giữa 2 mốc, tính theo ngày lịch (bỏ qua giờ). */
const dayDiff = (a: Date, b: Date) => {
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((d1.getTime() - d2.getTime()) / 86_400_000);
};

const timeLabel = (date: Date, today: Date) => {
  const diff = dayDiff(date, today);
  const hhmm = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `${hhmm} Hôm nay`;
  if (diff === 1) return `${hhmm} Ngày mai`;
  if (diff === -1) return `${hhmm} Hôm qua`;
  return `${hhmm} ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
};

/** Định dạng khoảng thời gian quá hạn thành "2 giờ 45 phút". */
const overdueLabel = (ms: number) => {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
};

const Dashboard: React.FC = () => {
  const { cars, rentals, serviceOrders, showToast } = useApp();
  const navigate = useNavigate();
  const [selectedCarDetail, setSelectedCarDetail] = useState<ExtendedCar | null>(null);

  const totalCarsCount = cars.length;
  const rentedCount = cars.filter(c => c.status === 'rented').length;
  const readyCount = cars.filter(c => c.status === 'ready').length;

  const now = new Date();
  // `today` phải ổn định giữa các lần render, nếu không mọi useMemo bên dưới
  // đều tính lại vô ích. Khoá theo mốc ngày (đổi khi sang ngày mới).
  const todayStamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today = useMemo(() => new Date(todayStamp), [todayStamp]);

  /**
   * Doanh thu hôm nay — tính THẬT từ dữ liệu, thay cho hằng số 24.500.000 ₫ cắm cứng.
   * Gồm: đơn thuê bàn giao hôm nay + chuyến dịch vụ chạy hôm nay.
   */
  const { todayRevenue, yesterdayRevenue } = useMemo(() => {
    const revenueOn = (offsetDays: number) => {
      const target = new Date(today);
      target.setDate(today.getDate() + offsetDays);

      const rentalRevenue = rentals
        .filter(r => r.status !== 'cancelled')
        .filter(r => {
          const stamp = r.deliveredAt || r.startDate;
          return stamp ? dayDiff(new Date(stamp), target) === 0 : false;
        })
        .reduce((sum, r) => sum + r.totalAmount, 0);

      const serviceRevenue = serviceOrders
        .filter(o => o.status !== 'cancelled')
        .filter(o => o.serviceDate && dayDiff(new Date(o.serviceDate), target) === 0)
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return rentalRevenue + serviceRevenue;
    };
    return { todayRevenue: revenueOn(0), yesterdayRevenue: revenueOn(-1) };
  }, [rentals, serviceOrders, today]);

  /** % thay đổi so với hôm qua. null = không có mốc so sánh (tránh hiện số bịa). */
  const revenueChangePercent = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : null;

  const extendedCars: ExtendedCar[] = cars.map(car => {
    const activeRental = rentals.find(r => r.carId === car.id && r.status === 'active');
    // Trễ hạn = có hợp đồng đang chạy mà đã qua giờ trả, tính từ dữ liệu thật
    // (bản cũ so biển số cứng '51F-999.88' và ghi cứng "quá hạn 02 giờ 45 phút").
    const overdueMs = activeRental ? now.getTime() - new Date(activeRental.endDate).getTime() : 0;
    const isOverdueCar = overdueMs > 0;

    return {
      ...car,
      isOverdue: isOverdueCar,
      overdueText: isOverdueCar
        ? `Quá hạn ${overdueLabel(overdueMs)} - Cần gọi khách!`
        : undefined,
      expectedReturn: activeRental
        ? timeLabel(new Date(activeRental.endDate), today)
        : car.timeRemaining,
      customer: activeRental ? activeRental.customerName : car.customer
    };
  });

  /**
   * Lịch nhận/trả xe trong hôm nay & ngày mai — lấy từ bảng rentals.
   * Bản cũ hiển thị 4 dòng mockSchedules bịa sẵn, không liên quan dữ liệu thật.
   */
  const upcomingSchedules: ScheduleItem[] = useMemo(() => {
    const items: (ScheduleItem & { sortKey: number })[] = [];

    for (const rental of rentals) {
      if (rental.status === 'cancelled' || rental.status === 'completed') continue;
      const car = cars.find(c => c.id === rental.carId);

      const pickup = new Date(rental.startDate);
      if (rental.status === 'pending' && [0, 1].includes(dayDiff(pickup, today))) {
        items.push({
          id: `pickup-${rental.id}`,
          type: 'pickup',
          plate: rental.carId,
          customerName: rental.customerName,
          customerPhone: rental.customerPhone,
          time: timeLabel(pickup, today),
          carName: car?.name || '',
          sortKey: pickup.getTime(),
        });
      }

      const dropoff = new Date(rental.endDate);
      // Gồm cả xe đã quá hạn trả (dayDiff < 0) để nhân viên thấy mà xử lý
      if (rental.status === 'active' && dayDiff(dropoff, today) <= 1) {
        items.push({
          id: `return-${rental.id}`,
          type: 'return',
          plate: rental.carId,
          customerName: rental.customerName,
          customerPhone: rental.customerPhone,
          time: timeLabel(dropoff, today),
          carName: car?.name || '',
          sortKey: dropoff.getTime(),
        });
      }
    }

    return items
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(0, 8)
      .map(({ sortKey: _sortKey, ...item }) => item);
  }, [rentals, cars, today]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* KPI Cards */}
      {/*
        Các KPI đều là số đếm thật. Những thẻ không có mốc so sánh đáng tin
        thì KHÔNG hiển thị % — trước đây gắn cứng 4.8% / 12.5% / -2.1% / 8.4%.
      */}
      <div className="grid grid-4 gap-md">
        <KpiCard
          label="Tổng đội xe"
          value={totalCarsCount}
          changeLabel={`${rentedCount} đang chạy · ${readyCount} sẵn sàng`}
          icon={<CarIcon size={20} color="#006837" />}
          iconBg="#ECFDF5"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Đang cho thuê"
          value={rentedCount}
          changeLabel={totalCarsCount > 0 ? `${Math.round((rentedCount / totalCarsCount) * 100)}% đội xe` : 'Chưa có xe'}
          icon={<CarIcon size={20} color="#1D4ED8" />}
          iconBg="#EFF6FF"
          statusBorderColor="var(--status-rented-border)"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Xe sẵn sàng"
          value={readyCount}
          changeLabel={totalCarsCount > 0 ? `${Math.round((readyCount / totalCarsCount) * 100)}% đội xe` : 'Chưa có xe'}
          icon={<CheckCircle2 size={20} color="#047857" />}
          iconBg="#ECFDF5"
          statusBorderColor="var(--status-available-border)"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Doanh thu hôm nay"
          value={`${(todayRevenue / 1_000_000).toFixed(1)}M ₫`}
          changePercent={revenueChangePercent ?? undefined}
          changeLabel={revenueChangePercent !== null ? 'vs hôm qua' : 'Hôm qua chưa có doanh thu'}
          isMono={true}
          icon={<TrendingUp size={20} color="#B45309" />}
          iconBg="#FFFBEB"
          statusBorderColor="var(--accent)"
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Fleet Board */}
      <FleetBoard cars={extendedCars} onSelectCar={setSelectedCarDetail} />

      {/* Bottom 2 columns */}
      <div className="grid grid-auto-lg gap-lg">
        <UpcomingScheduleList
          schedules={upcomingSchedules}
          onSelectSchedule={(item) => showToast(`Chi tiết lịch: ${item.customerName} - ${item.plate}`, 'info')}
        />
        <RecentBookingsTable
          rentals={rentals}
          onViewAll={() => navigate('/contracts')}
          onSelectRental={(rental: Rental) => navigate(`/contracts?id=${rental.id}`)}
        />
      </div>

      {/* Car Detail Modal */}
      {selectedCarDetail && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="license-plate">{selectedCarDetail.id}</span>
                <h2 style={{ fontSize: '16px', margin: 0 }}>{selectedCarDetail.name}</h2>
              </div>
              <button onClick={() => setSelectedCarDetail(null)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>

            <div className="modal-body">
              {/* Car image + info */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <img
                  src={selectedCarDetail.image}
                  alt={selectedCarDetail.name}
                  style={{ width: '130px', height: '90px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  <div>Hãng xe: <strong>{selectedCarDetail.brand} ({selectedCarDetail.seats} chỗ)</strong></div>
                  <div>Màu sắc: <strong>{selectedCarDetail.color}</strong></div>
                  <div>Số KM: <strong className="font-mono">{selectedCarDetail.km.toLocaleString()} km</strong></div>
                  <div>Giá thuê/ngày: <strong className="font-mono" style={{ color: 'var(--primary)' }}>{selectedCarDetail.pricePerDay.toLocaleString()} ₫</strong></div>
                  <div>SĐT chủ xe: <strong className="font-mono">{selectedCarDetail.ownerPhone}</strong></div>
                </div>
              </div>

              {/* Status Banner */}
              {selectedCarDetail.isOverdue ? (
                <div className="alert alert-danger">
                  <AlertCircle size={16} />
                  <span><strong>CẢNH BÁO:</strong> Xe quá hạn trả! Liên hệ ngay: <strong>{selectedCarDetail.customer}</strong></span>
                </div>
              ) : selectedCarDetail.status === 'rented' ? (
                <div className="alert alert-info" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>Đang thuê bởi: <strong>{selectedCarDetail.customer}</strong></div>
                    <div style={{ fontSize: '11.5px', marginTop: '2px', opacity: 0.8 }}>Dự kiến trả: <span className="font-mono">{selectedCarDetail.expectedReturn}</span></div>
                  </div>
                  <button onClick={() => { setSelectedCarDetail(null); navigate('/contracts'); }} className="btn-primary btn-sm">Xem HĐ</button>
                </div>
              ) : selectedCarDetail.status === 'maintenance' ? (
                <div className="alert alert-warning">
                  🛠️ Xe đang bảo trì định kỳ. Dự kiến hoàn tất vào ngày mai.
                </div>
              ) : (
                <div className="alert alert-success" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🟢 Xe sẵn sàng bàn giao cho khách thuê mới.</span>
                  <button onClick={() => { setSelectedCarDetail(null); navigate('/rental/new'); }} className="btn-primary btn-sm">Tạo đơn</button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedCarDetail(null)} className="btn btn-secondary">Đóng</button>
              <button onClick={() => { setSelectedCarDetail(null); navigate(`/fleet?id=${selectedCarDetail.id}`); }} className="btn-primary">
                Quản lý chi tiết xe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
