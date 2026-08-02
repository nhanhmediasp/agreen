import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { type Rental } from '../context/AppContext';

interface RecentBookingsTableProps {
  rentals: Rental[];
  onViewAll?: () => void;
  onSelectRental?: (rental: Rental) => void;
}

export const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ rentals, onViewAll, onSelectRental }) => {
  return (
    <div className="card recent-bookings-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '15px', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
            Đơn Thuê Gần Đây & Cần Xử Lý
          </h3>
        </div>
        {onViewAll && (
          <button 
            onClick={onViewAll} 
            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            Tất cả đơn thuê <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="responsive-desktop-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Mã đơn</th>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Biển số</th>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Khách hàng</th>
              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Tổng tiền</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rentals.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Chưa có đơn thuê nào.
                </td>
              </tr>
            ) : (
              rentals.slice(0, 5).map((rental) => (
                <tr key={rental.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }} className="font-mono">
                    #{rental.id}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="license-plate font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>
                      {rental.carId}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rental.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }} className="font-mono">{rental.customerPhone}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }} className="font-mono">
                    {rental.totalAmount.toLocaleString()}₫
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      onClick={() => onSelectRental && onSelectRental(rental)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="responsive-mobile-list entity-mobile-list entity-mobile-list-in-card">
        {rentals.length === 0 ? (
          <div className="entity-mobile-empty">Chưa có đơn thuê nào.</div>
        ) : (
          rentals.slice(0, 5).map(rental => (
            <article className="entity-mobile-card" key={rental.id}>
              <div className="entity-mobile-head">
                <div><strong>#{rental.id}</strong><span>{rental.carId}</span></div>
              </div>
              <div className="entity-mobile-fields">
                <div><span>Khách hàng</span><strong>{rental.customerName}</strong></div>
                <div><span>Điện thoại</span><strong>{rental.customerPhone}</strong></div>
                <div><span>Tổng tiền</span><strong className="entity-mobile-amount">{rental.totalAmount.toLocaleString()} ₫</strong></div>
              </div>
              {onSelectRental && (
                <div className="entity-mobile-actions">
                  <button type="button" onClick={() => onSelectRental(rental)}>Xem chi tiết</button>
                </div>
              )}
            </article>
          ))
        )}
      </div>

    </div>
  );
};
