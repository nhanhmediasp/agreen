import React from 'react';
import { Clock, AlertTriangle, User, Wrench } from 'lucide-react';
import { type Car } from '../context/AppContext';

export interface ExtendedCar extends Car {
  isOverdue?: boolean;
  overdueText?: string;
  expectedReturn?: string;
}

interface FleetCardProps {
  car: ExtendedCar;
  onSelectCar?: (car: ExtendedCar) => void;
}

export const FleetCard: React.FC<FleetCardProps> = ({ car, onSelectCar }) => {
  // Determine badge style & label based on status and overdue flag
  const getStatusBadge = () => {
    if (car.isOverdue) {
      return {
        className: 'badge-overdue',
        label: '🔴 Quá hạn trả'
      };
    }
    switch (car.status) {
      case 'ready':
        return { className: 'badge-available', label: '🟢 Sẵn sàng' };
      case 'rented':
        return { className: 'badge-rented', label: '🔵 Đang thuê' };
      case 'maintenance':
        return { className: 'badge-maintenance', label: '🟠 Bảo trì' };
      case 'suspended':
      default:
        return { className: 'badge-inactive', label: '⚪ Tạm ngưng' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div 
      className="card"
      onClick={() => onSelectCar && onSelectCar(car)}
      style={{
        padding: '16px',
        cursor: 'pointer',
        border: car.isOverdue 
          ? '2px solid var(--status-overdue-border)' 
          : '1px solid var(--border)',
        backgroundColor: car.isOverdue 
          ? 'var(--status-overdue-bg)' 
          : 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        transition: 'transform 0.15s ease, border-color 0.15s ease'
      }}
    >
      {/* Top Header: Plate & Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="license-plate">{car.id}</span>
        <span 
          style={{ 
            padding: '3px 10px', 
            borderRadius: '100px', 
            fontSize: '12px', 
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }} 
          className={badge.className}
        >
          {badge.label}
        </span>
      </div>

      {/* Car Info */}
      <div>
        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
          {car.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px' }}>
          <span>{car.brand}</span>
          <span>•</span>
          <span>{car.seats} chỗ</span>
          <span>•</span>
          <span>{car.color}</span>
          <span>•</span>
          <span className="font-mono">{car.km.toLocaleString()} km</span>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2px 0' }} />

      {/* Sub Context Info depending on status */}
      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {car.isOverdue ? (
          <div style={{ color: 'var(--status-overdue-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            <span>{car.overdueText || 'Đã quá thời hạn trả xe!'}</span>
          </div>
        ) : car.status === 'rented' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <User size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontWeight: 500 }}>Khách: <strong>{car.customer || 'Khách thuê'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <Clock size={14} />
              <span>Trả xe: <strong className="font-mono">{car.expectedReturn || car.timeRemaining || 'Hôm nay'}</strong></span>
            </div>
          </>
        ) : car.status === 'maintenance' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-maintenance-text)', fontWeight: 500 }}>
            <Wrench size={14} />
            <span>Bảo dưỡng định kỳ / Thay nhớt</span>
          </div>
        ) : car.status === 'ready' ? (
          <div style={{ color: 'var(--status-available-text)', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
            <span>Đã kiểm tra kỹ thuật</span>
            <span className="font-mono" style={{ fontWeight: 600 }}>{car.pricePerDay.toLocaleString()}đ/ngày</span>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>Tạm ngưng cho thuê</div>
        )}
      </div>
    </div>
  );
};
