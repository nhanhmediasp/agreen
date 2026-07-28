import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, type Rental } from '../context/AppContext';
import { KpiCard } from '../components/KpiCard';
import { FleetBoard } from '../components/FleetBoard';
import type { ExtendedCar } from '../components/FleetCard';
import { UpcomingScheduleList, type ScheduleItem } from '../components/UpcomingScheduleList';
import { RecentBookingsTable } from '../components/RecentBookingsTable';
import { Car as CarIcon, CheckCircle2, AlertCircle, X, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { cars, rentals, showToast } = useApp();
  const navigate = useNavigate();
  const [selectedCarDetail, setSelectedCarDetail] = useState<ExtendedCar | null>(null);

  const totalCarsCount = cars.length;
  const rentedCount = cars.filter(c => c.status === 'rented').length;
  const readyCount = cars.filter(c => c.status === 'ready').length;
  const todayInVietnam = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const todayRevenue = rentals
    .filter((rental) => (
      rental.status === 'completed'
      && new Date(rental.returnedAt ?? rental.endDate)
        .toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) === todayInVietnam
    ))
    .reduce((sum, rental) => sum + rental.totalAmount, 0);

  const extendedCars: ExtendedCar[] = cars.map(car => {
    const activeRental = rentals.find(r => r.carId === car.id && r.status === 'active');
    const isOverdueCar = Boolean(activeRental && new Date(activeRental.endDate).getTime() < Date.now());
    const overdueHours = activeRental
      ? Math.max(0, Math.floor((Date.now() - new Date(activeRental.endDate).getTime()) / 3_600_000))
      : 0;
    return {
      ...car,
      isOverdue: isOverdueCar,
      overdueText: isOverdueCar ? `Quá hạn ${overdueHours} giờ - Cần liên hệ khách!` : undefined,
      expectedReturn: activeRental
        ? new Date(activeRental.endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay'
        : car.timeRemaining,
      customer: activeRental ? activeRental.customerName : car.customer
    };
  });

  const schedules: ScheduleItem[] = rentals
    .filter((rental) => rental.status === 'pending' || rental.status === 'active')
    .map((rental) => {
      const eventAt = rental.status === 'pending' ? rental.startDate : rental.endDate;
      const car = cars.find((item) => item.id === rental.carId);
      return {
        id: rental.id,
        type: rental.status === 'pending' ? 'pickup' as const : 'return' as const,
        plate: rental.carId,
        customerName: rental.customerName,
        customerPhone: rental.customerPhone,
        time: new Date(eventAt).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        }),
        carName: car?.name ?? rental.carId,
        eventAt,
      };
    })
    .sort((first, second) => Date.parse(first.eventAt) - Date.parse(second.eventAt))
    .slice(0, 10)
    .map(({ eventAt: _eventAt, ...schedule }) => schedule);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Tổng quan Vận hành
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
              Tổng quan
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Hệ thống giám sát đội xe, lịch trình bàn giao, trả xe và doanh thu thời gian thực
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4 gap-md">
        <KpiCard
          label="Tổng đội xe"
          value={totalCarsCount}
          icon={<CarIcon size={20} color="#006837" />}
          iconBg="#ECFDF5"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Đang cho thuê"
          value={rentedCount}
          icon={<CarIcon size={20} color="#1D4ED8" />}
          iconBg="#EFF6FF"
          statusBorderColor="var(--status-rented-border)"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Xe sẵn sàng"
          value={readyCount}
          icon={<CheckCircle2 size={20} color="#047857" />}
          iconBg="#ECFDF5"
          statusBorderColor="var(--status-available-border)"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Doanh thu hôm nay"
          value={`${(todayRevenue / 1000000).toFixed(1)}M ₫`}
          isMono={true}
          icon={<TrendingUp size={20} color="#B45309" />}
          iconBg="#FFFBEB"
          statusBorderColor="var(--accent)"
        />
      </div>

      {/* Fleet Board */}
      <FleetBoard cars={extendedCars} onSelectCar={setSelectedCarDetail} />

      {/* Bottom 2 columns */}
      <div className="grid grid-auto-lg gap-lg">
        <UpcomingScheduleList
          schedules={schedules}
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
                  <div>Giá thuê/ngày: <strong style={{ color: 'var(--primary)' }}>{selectedCarDetail.pricePerDay.toLocaleString()} ₫</strong></div>
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
