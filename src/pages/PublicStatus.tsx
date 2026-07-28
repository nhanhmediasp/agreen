import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface PublicCar {
  id: string;
  name: string;
  status: 'ready' | 'reserved' | 'rented' | 'maintenance' | 'suspended';
  image: string;
}

interface PublicVehicleRow {
  plate_number: string;
  brand: string;
  model: string;
  status: string;
  image_url?: string;
}

const PublicStatus = () => {
  const [plate, setPlate] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Search result states
  const [matchedCar, setMatchedCar] = useState<PublicCar | null>(null);
  const [matchedCarList, setMatchedCarList] = useState<PublicCar[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMatchedCar(null);
    setMatchedCarList([]);

    if (!plate.trim()) {
      setError('Vui lòng nhập đầy đủ biển số xe để tra cứu.');
      return;
    }

    let response: Response;
    try {
      response = await fetch('/api/public/vehicles/search', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate }),
      });
    } catch {
      setError('Không thể kết nối máy chủ tra cứu. Vui lòng thử lại.');
      return;
    }

    const result: { success: boolean; data?: PublicVehicleRow[]; error?: string } = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error || 'Không thể tra cứu thông tin xe.');
      return;
    }

    const matchingCars: PublicCar[] = (result.data || []).map((row) => ({
      id: row.plate_number,
      name: `${row.brand || ''} ${row.model || ''}`.trim(),
      status: row.status === 'Rented'
        ? 'rented'
        : row.status === 'Maintenance'
          ? 'maintenance'
          : row.status === 'Reserved'
            ? 'reserved'
            : row.status === 'Suspended'
              ? 'suspended'
              : 'ready',
      image: row.image_url || '/favicon.svg',
    }));

    if (matchingCars.length === 0) {
      setError('Không tìm thấy thông tin xe nào phù hợp với dữ liệu nhập của bạn.');
      return;
    }

    setMatchedCarList(matchingCars);
    setMatchedCar(matchingCars[0]);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setMatchedCar(null);
    setMatchedCarList([]);
    setPlate('');
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '450px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '24px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary)', borderRadius: '12px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>A</span>
          </div>
          <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 700 }}>Agreen - Tra cứu Trạng Thái Xe</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Dịch Vụ Cho Thuê Xe Điện Tự Lái • Hotline: 0386619758</p>
        </div>

        {!showResults ? (
          <form className="card" onSubmit={handleSearch} style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {error && (
              <div style={{ padding: '12px', background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Biển số xe đầy đủ</label>
              <input 
                type="text" 
                placeholder="VD: 51F-123.45" 
                value={plate}
                onChange={e => setPlate(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '16px', fontFamily: 'inherit' }}
              />
            </div>
            
            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              💡 Tra cứu công khai chỉ hỗ trợ <strong>biển số chính xác</strong> để bảo vệ dữ liệu đối tác.
            </div>

            <button 
              type="submit"
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px', marginTop: '8px' }}
            >
              Tra cứu ngay
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              onClick={handleReset}
              style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Quay lại tra cứu
            </button>
            
            {/* Multiple Cars Selector */}
            {matchedCarList.length > 1 && (
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Đối tác sở hữu {matchedCarList.length} xe trên hệ thống:
                </div>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {matchedCarList.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => setMatchedCar(c)}
                      style={{ 
                        padding: '8px 12px', 
                        borderRadius: 'var(--radius-md)', 
                        border: matchedCar === c ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        background: matchedCar === c ? 'var(--status-ready-bg)' : 'white',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                    >
                      {c.id}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Result Card */}
            {matchedCar && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '8px' }}>
                    <img src={matchedCar.image} alt={matchedCar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span className="license-plate" style={{ fontSize: '24px', padding: '8px 16px' }}>{matchedCar.id}</span>
                  <div style={{ fontWeight: 700, fontSize: '18px' }}>{matchedCar.name}</div>
                  
                  {matchedCar.status === 'ready' ? (
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'var(--status-ready-bg)', color: 'var(--status-ready-text)', fontSize: '15px', fontWeight: 600 }}>
                      🔴 Xe đang trống (Sẵn sàng cho thuê)
                    </span>
                  ) : matchedCar.status === 'rented' ? (
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'var(--status-rented-bg)', color: 'var(--status-rented-text)', fontSize: '15px', fontWeight: 600 }}>
                      🔵 Xe đang được thuê (Đang chạy ngoài bãi)
                    </span>
                  ) : matchedCar.status === 'maintenance' ? (
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', fontSize: '15px', fontWeight: 600 }}>
                      🛠️ Xe đang bảo trì/sửa chữa
                    </span>
                  ) : matchedCar.status === 'reserved' ? (
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'var(--status-suspended-bg)', color: 'var(--status-suspended-text)', fontSize: '15px', fontWeight: 600 }}>
                      Xe đã có lịch đặt trước
                    </span>
                  ) : (
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'var(--status-suspended-bg)', color: 'var(--status-suspended-text)', fontSize: '15px', fontWeight: 600 }}>
                      Xe đang tạm ngưng khai thác
                    </span>
                  )}
                </div>
                
              </div>
            )}


          </div>
        )}
      </div>
    </div>
  );
};

export default PublicStatus;
