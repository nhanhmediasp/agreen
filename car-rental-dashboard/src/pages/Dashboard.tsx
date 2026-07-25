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
  const todayRevenue = 24500000;

  const extendedCars: ExtendedCar[] = cars.map(car => {
    const isOverdueCar = car.id === '51F-999.88' || (car.status === 'rented' && car.timeRemaining?.includes('Trễ'));
    const activeRental = rentals.find(r => r.carId === car.id && r.status === 'active');
    return {
      ...car,
      isOverdue: isOverdueCar,
      overdueText: isOverdueCar ? 'Quá hạn 02 giờ 45 phút - Cần gọi khách!' : undefined,
      expectedReturn: activeRental
        ? new Date(activeRental.endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay'
        : car.timeRemaining,
      customer: activeRental ? activeRental.customerName : car.customer
    };
  });

  const mockSchedules: ScheduleItem[] = [
    { id: 'sch-1', type: 'return', plate: '51F-123.45', customerName: 'Nguyễn Văn A', customerPhone: '0901234567', time: '14:30 Hôm nay', carName: 'Mazda 3 2022' },
    { id: 'sch-2', type: 'pickup', plate: '51H-777.89', customerName: 'Trần Thị B', customerPhone: '0988776655', time: '16:00 Hôm nay', carName: 'Kia Carnival 2023' },
    { id: 'sch-3', type: 'return', plate: '51K-456.78', customerName: 'Lê Hoàng C', customerPhone: '0912345678', time: '17:30 Hôm nay', carName: 'Toyota Camry 2021' },
    { id: 'sch-4', type: 'pickup', plate: '51G-555.12', customerName: 'Phạm Minh D', customerPhone: '0933445566', time: '08:00 Ngày mai', carName: 'Honda CR-V 2022' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* KPI Cards */}
      <div className="grid grid-4 gap-md">
        <KpiCard
          label="Tổng đội xe"
          value={totalCarsCount}
          changePercent={4.8}
          changeLabel="vs tháng trước"
          icon={<CarIcon size={20} color="#006837" />}
          iconBg="#ECFDF5"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Đang cho thuê"
          value={rentedCount}
          changePercent={12.5}
          changeLabel="vs hôm qua"
          icon={<CarIcon size={20} color="#1D4ED8" />}
          iconBg="#EFF6FF"
          statusBorderColor="var(--status-rented-border)"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Xe sẵn sàng"
          value={readyCount}
          changePercent={-2.1}
          changeLabel="vs hôm qua"
          icon={<CheckCircle2 size={20} color="#047857" />}
          iconBg="#ECFDF5"
          statusBorderColor="var(--status-available-border)"
          onClick={() => navigate('/fleet')}
        />
        <KpiCard
          label="Doanh thu hôm nay"
          value={`${(todayRevenue / 1000000).toFixed(1)}M ₫`}
          changePercent={8.4}
          changeLabel="vs hôm qua"
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
          schedules={mockSchedules}
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
