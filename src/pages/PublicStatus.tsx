import { useState } from 'react';
import { MapPin, Calendar, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../api/client';

/**
 * Cổng tra cứu công khai cho chủ xe ký gửi.
 *
 * Khác bản cũ:
 *  - Trang này giờ nằm NGOÀI hàng rào đăng nhập (trước đây bị <Login/> chặn hết).
 *  - Bắt buộc nhập CẢ biển số VÀ số điện thoại, khớp chính xác ở server.
 *    Bản cũ dùng `includes` nên gõ "5" là ra toàn bộ đội xe.
 *  - Không còn đọc AppContext (toàn bộ dữ liệu công ty); chỉ nhận đúng các
 *    trường server trả về cho riêng chiếc xe đó.
 */

interface PublicCar {
  id: string;
  name: string;
  brand: string;
  color: string;
  seats: number;
  km: number;
  status: 'ready' | 'rented' | 'maintenance' | 'suspended';
  image: string;
  expiryRegistration: string;
  expiryInsurance: string;
  expiryLicense: string;
  expectedReturn: string | null;
}

const formatDate = (value: string) => {
  if (!value) return 'Chưa cập nhật';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Chưa cập nhật' : d.toLocaleDateString('vi-VN');
};

const formatDateTime = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const daysLeft = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const STATUS_VIEW = {
  ready:       { icon: '🟢', text: 'Xe đang trống (Sẵn sàng cho thuê)', bg: 'var(--status-ready-bg)', color: 'var(--status-ready-text)' },
  rented:      { icon: '🔵', text: 'Xe đang được thuê (Đang chạy ngoài bãi)', bg: 'var(--status-rented-bg)', color: 'var(--status-rented-text)' },
  maintenance: { icon: '🛠️', text: 'Xe đang bảo trì / sửa chữa', bg: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)' },
  suspended:   { icon: '⚠️', text: 'Xe đang tạm ngưng hoạt động', bg: 'var(--status-suspended-bg)', color: 'var(--status-suspended-text)' },
} as const;

const PublicStatus = () => {
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [matchedCar, setMatchedCar] = useState<PublicCar | null>(null);
  const [matchedCarList, setMatchedCarList] = useState<PublicCar[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!plate.trim() || !phone.trim()) {
      setError('Vui lòng nhập ĐỦ cả biển số xe và số điện thoại chủ xe để tra cứu.');
      return;
    }

    setLoading(true);
    try {
      const cars = await api.post<PublicCar[]>('/public/car-status', { plate, phone }, { silent401: true });
      setMatchedCarList(cars);
      setMatchedCar(cars[0] ?? null);
      setShowResults(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tra cứu được, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setMatchedCar(null);
    setMatchedCarList([]);
    setPlate('');
    setPhone('');
    setError(null);
  };

  const returnText = formatDateTime(matchedCar?.expectedReturn ?? null);
  const returnDays = daysLeft(matchedCar?.expectedReturn ?? null);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '450px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '24px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary)', borderRadius: '12px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>A</span>
          </div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Hệ thống Tra cứu Đối tác</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Dành cho chủ xe/đối tác góp xe</p>
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
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Biển số xe <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="VD: 51F-123.45"
                value={plate}
                onChange={e => setPlate(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Số điện thoại đối tác <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="tel"
                placeholder="VD: 0901234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
              <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                Vì lý do bảo mật thông tin đội xe, bạn cần nhập <strong>đúng cả biển số và số điện thoại</strong> đã đăng ký.
                Hệ thống giới hạn số lần tra cứu để chống dò quét dữ liệu.
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Đang tra cứu...' : 'Tra cứu ngay'}
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

            {matchedCarList.length > 1 && (
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Có {matchedCarList.length} xe khớp thông tin:
                </div>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {matchedCarList.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setMatchedCar(c)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: matchedCar?.id === c.id ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                        background: matchedCar?.id === c.id ? 'var(--status-ready-bg)' : 'white',
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

            {matchedCar && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  {matchedCar.image && (
                    <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '8px' }}>
                      <img src={matchedCar.image} alt={matchedCar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <span className="license-plate" style={{ fontSize: '24px', padding: '8px 16px' }}>{matchedCar.id}</span>
                  <div style={{ fontWeight: 700, fontSize: '18px' }}>{matchedCar.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {matchedCar.brand} · {matchedCar.seats} chỗ · Màu {matchedCar.color}
                  </div>

                  {(() => {
                    const view = STATUS_VIEW[matchedCar.status] ?? STATUS_VIEW.suspended;
                    return (
                      <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '100px', background: view.bg, color: view.color, fontSize: '15px', fontWeight: 600 }}>
                        {view.icon} {view.text}
                      </span>
                    );
                  })()}
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {matchedCar.status === 'rented' && returnText && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <Clock color="var(--accent)" size={20} style={{ marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Thời gian dự kiến trả xe</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {returnText}
                          {returnDays !== null && (
                            <span style={{ fontSize: '13px', fontWeight: 500, color: returnDays < 0 ? '#dc2626' : 'var(--text-secondary)', marginLeft: '6px' }}>
                              {returnDays < 0
                                ? `(đã quá hạn ${Math.abs(returnDays)} ngày)`
                                : returnDays === 0 ? '(hôm nay)' : `(còn ${returnDays} ngày)`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <MapPin color="var(--primary)" size={20} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Số KM hiện tại</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{matchedCar.km.toLocaleString('vi-VN')} km</div>
                    </div>
                  </div>

                  {([
                    ['Hạn đăng kiểm', matchedCar.expiryRegistration],
                    ['Hạn bảo hiểm TNDS', matchedCar.expiryInsurance],
                    ['Hạn phù hiệu xe', matchedCar.expiryLicense],
                  ] as const).map(([label, value]) => {
                    const left = daysLeft(value || null);
                    return (
                      <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Calendar color="var(--primary)" size={20} style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {formatDate(value)}
                            {left !== null && left <= 30 && (
                              <span style={{ fontSize: '12px', fontWeight: 700, color: left <= 0 ? '#dc2626' : '#b45309', marginLeft: '8px' }}>
                                {left <= 0 ? 'ĐÃ HẾT HẠN' : `Còn ${left} ngày`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
