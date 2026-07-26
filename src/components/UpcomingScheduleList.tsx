import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';

export interface ScheduleItem {
  id: string;
  type: 'pickup' | 'return'; // pickup = Giao xe cho khách (Out), return = Nhận xe trả về (In)
  plate: string;
  customerName: string;
  customerPhone: string;
  time: string;
  carName: string;
}

interface UpcomingScheduleListProps {
  schedules: ScheduleItem[];
  onSelectSchedule?: (item: ScheduleItem) => void;
}

export const UpcomingScheduleList: React.FC<UpcomingScheduleListProps> = ({ schedules, onSelectSchedule }) => {
  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '15px', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
            Lịch Nhận / Trả Xe Sắp Tới
          </h3>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {schedules.length} lịch trong ngày
        </span>
      </div>

      {/* List Content */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {schedules.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Không có lịch giao/nhận xe sắp tới.
          </div>
        ) : (
          schedules.map((item) => {
            const isPickup = item.type === 'pickup';
            return (
              <div 
                key={item.id}
                onClick={() => onSelectSchedule && onSelectSchedule(item)}
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Arrow Icon Indicator */}
                  <div 
                    style={{ 
                      width: '34px', 
                      height: '34px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: isPickup ? 'var(--status-available-bg)' : 'var(--status-rented-bg)',
                      color: isPickup ? 'var(--status-available-text)' : 'var(--status-rented-text)'
                    }}
                    title={isPickup ? 'Giao xe cho khách' : 'Nhận xe khách trả'}
                  >
                    {isPickup ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="license-plate font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>{item.plate}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.customerName}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {item.carName} • SĐT: <span className="font-mono">{item.customerPhone}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      background: isPickup ? 'var(--status-available-bg)' : 'var(--status-rented-bg)',
                      color: isPickup ? 'var(--status-available-text)' : 'var(--status-rented-text)'
                    }}
                  >
                    {isPickup ? 'Giao xe' : 'Nhận xe'}
                  </span>
                  <div className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {item.time}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
