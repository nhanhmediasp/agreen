import { useState } from 'react';
import { MapPin, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useApp, type Car } from '../context/AppContext';

const PublicStatus = () => {
  const { cars } = useApp();
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Search result states
  const [matchedCar, setMatchedCar] = useState<Car | null>(null);
  const [matchedCarList, setMatchedCarList] = useState<Car[]>([]);
  const [showResults, setShowResults] = useState(false);

  const cleanString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMatchedCar(null);
    setMatchedCarList([]);

    if (!plate.trim() && !phone.trim()) {
      setError('Vui lòng nhập Biển số xe HOẶC Số điện thoại để tra cứu xe.');
      return;
    }

    const cleanPlate = cleanString(plate);
    const cleanPhone = cleanString(phone);

    let matchingCars: Car[] = [];

    if (cleanPlate && cleanPhone) {
      matchingCars = cars.filter(c => cleanString(c.id).includes(cleanPlate) && cleanString(c.ownerPhone).includes(cleanPhone));
    } else if (cleanPlate) {
      matchingCars = cars.filter(c => cleanString(c.id).includes(cleanPlate));
    } else if (cleanPhone) {
      matchingCars = cars.filter(c => cleanString(c.ownerPhone).includes(cleanPhone));
    }

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
    setPhone('');
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
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Biển số xe (Tùy chọn)</label>
              <input 
                type="text" 
                placeholder="VD: 51F-123.45" 
                value={plate}
                onChange={e => setPlate(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '16px', fontFamily: 'inherit' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Số điện thoại đối tác (Tùy chọn)</label>
              <input 
                type="tel" 
                placeholder="VD: 0901234567" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '16px', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              💡 <strong>Tra cứu nhanh:</strong> Chỉ cần nhập <strong>Biển số xe</strong> hoặc <strong>Số điện thoại</strong> để xem tình trạng xe hoạt động.
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
                  ) : (
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: 'var(--status-suspended-bg)', color: 'var(--status-suspended-text)', fontSize: '15px', fontWeight: 600 }}>
                      ⚠️ Xe đang tạm ngưng hoạt động
                    </span>
                  )}
                </div>
                
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {matchedCar.status === 'rented' && matchedCar.timeRemaining && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <Clock color="var(--accent)" size={20} style={{ marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Thời gian dự kiến trả xe</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{matchedCar.timeRemaining} (khoảng {Math.ceil(parseInt(matchedCar.timeRemaining.split(':')[0]) / 24)} ngày)</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <MapPin color="var(--primary)" size={20} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Số KM hiện tại</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{matchedCar.km.toLocaleString()} km</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <Calendar color="var(--primary)" size={20} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Hạn đăng kiểm</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {new Date(matchedCar.expiryRegistration).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
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
