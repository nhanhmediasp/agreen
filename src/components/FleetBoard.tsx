import React, { useState } from 'react';
import { Search, Filter, Layers, RefreshCw } from 'lucide-react';
import { FleetCard, type ExtendedCar } from './FleetCard';

interface FleetBoardProps {
  cars: ExtendedCar[];
  onSelectCar?: (car: ExtendedCar) => void;
}

export type FleetFilterTab = 'all' | 'ready' | 'rented' | 'maintenance' | 'overdue';

export const FleetBoard: React.FC<FleetBoardProps> = ({ cars, onSelectCar }) => {
  const [activeTab, setActiveTab] = useState<FleetFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for tabs
  const countAll = cars.length;
  const countReady = cars.filter(c => c.status === 'ready' && !c.isOverdue).length;
  const countRented = cars.filter(c => c.status === 'rented' && !c.isOverdue).length;
  const countMaintenance = cars.filter(c => c.status === 'maintenance').length;
  const countOverdue = cars.filter(c => c.isOverdue).length;

  // Filter cars based on tab & query
  const filteredCars = cars.filter(c => {
    // Search match
    const matchesSearch = 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customer && c.customer.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Tab match
    if (activeTab === 'all') return true;
    if (activeTab === 'overdue') return c.isOverdue;
    if (activeTab === 'ready') return c.status === 'ready' && !c.isOverdue;
    if (activeTab === 'rented') return c.status === 'rented' && !c.isOverdue;
    if (activeTab === 'maintenance') return c.status === 'maintenance';
    return true;
  });

  return (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Board Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={22} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>
            Bảng Điều Phối Đội Xe
          </h2>
          <span style={{ fontSize: '12px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
            {cars.length} xe trong bãi
          </span>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-page)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '280px' }}>
          <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Tìm biển số, tên xe, tên khách..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('all')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'all' ? 'var(--text-primary)' : 'transparent',
            color: activeTab === 'all' ? 'var(--bg-surface)' : 'var(--text-secondary)',
            border: 'none'
          }}
        >
          Tất cả ({countAll})
        </button>

        <button 
          onClick={() => setActiveTab('ready')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'ready' ? 'var(--status-available-bg)' : 'transparent',
            color: activeTab === 'ready' ? 'var(--status-available-text)' : 'var(--text-secondary)',
            border: activeTab === 'ready' ? '1px solid var(--status-available-border)' : '1px solid transparent'
          }}
        >
          🟢 Sẵn sàng ({countReady})
        </button>

        <button 
          onClick={() => setActiveTab('rented')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'rented' ? 'var(--status-rented-bg)' : 'transparent',
            color: activeTab === 'rented' ? 'var(--status-rented-text)' : 'var(--text-secondary)',
            border: activeTab === 'rented' ? '1px solid var(--status-rented-border)' : '1px solid transparent'
          }}
        >
          🔵 Đang thuê ({countRented})
        </button>

        <button 
          onClick={() => setActiveTab('maintenance')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'maintenance' ? 'var(--status-maintenance-bg)' : 'transparent',
            color: activeTab === 'maintenance' ? 'var(--status-maintenance-text)' : 'var(--text-secondary)',
            border: activeTab === 'maintenance' ? '1px solid var(--status-maintenance-border)' : '1px solid transparent'
          }}
        >
          🟠 Bảo trì ({countMaintenance})
        </button>

        {countOverdue > 0 && (
          <button 
            onClick={() => setActiveTab('overdue')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 700,
              background: activeTab === 'overdue' ? 'var(--status-overdue-bg)' : 'transparent',
              color: activeTab === 'overdue' ? 'var(--status-overdue-text)' : 'var(--status-overdue-text)',
              border: '1px solid var(--status-overdue-border)'
            }}
          >
            🔴 Quá hạn ({countOverdue})
          </button>
        )}
      </div>

      {/* Dispatch Board Grid */}
      {filteredCars.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Filter size={36} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
            Chưa có xe nào ở trạng thái này
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '360px' }}>
            Không tìm thấy xe phù hợp với bộ lọc hiện tại. Thử đổi bộ lọc hoặc xóa từ khóa tìm kiếm.
          </p>
          <button 
            onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: '8px'
            }}
          >
            <RefreshCw size={14} /> Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
            gap: '16px' 
          }}
        >
          {filteredCars.map(car => (
            <FleetCard key={car.id} car={car} onSelectCar={onSelectCar} />
          ))}
        </div>
      )}
    </div>
  );
};
