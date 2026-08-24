import { ArrowLeft, Home, MapPinOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: 'calc(100vh - 118px)', display: 'grid', placeItems: 'center', padding: '24px 0' }}>
      <div className="card" style={{ width: 'min(680px, 100%)', padding: 'clamp(28px, 6vw, 54px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', width: 230, height: 230, borderRadius: '50%', background: '#dcfce7', top: -130, right: -95 }} />
        <div aria-hidden="true" style={{ position: 'absolute', width: 145, height: 145, borderRadius: '50%', background: '#f0fdf4', bottom: -85, left: -55 }} />

        <div style={{ position: 'relative' }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, background: '#ecfdf5', color: 'var(--primary)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', border: '1px solid #bbf7d0' }}>
            <MapPinOff size={32} strokeWidth={1.8} />
          </div>

          <div style={{ color: 'var(--primary)', fontSize: 'clamp(64px, 13vw, 104px)', lineHeight: 0.95, fontWeight: 900, letterSpacing: '-0.07em' }}>404</div>
          <h1 style={{ margin: '20px 0 8px', color: '#0f172a', fontSize: 'clamp(22px, 4vw, 30px)', letterSpacing: '-0.025em' }}>Không tìm thấy trang</h1>
          <p style={{ margin: '0 auto', maxWidth: 470, color: '#64748b', fontSize: 14, lineHeight: 1.65 }}>
            Đường dẫn bạn vừa mở không tồn tại, đã được đổi tên hoặc bạn không còn quyền truy cập.
          </p>
          <div style={{ display: 'inline-flex', maxWidth: '100%', marginTop: 14, padding: '7px 11px', borderRadius: 8, background: '#f8fafc', color: '#64748b', fontSize: 12, border: '1px solid #e2e8f0', overflowWrap: 'anywhere' }}>
            {location.pathname}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} style={{ gap: 7 }}>
              <ArrowLeft size={16} /> Quay lại
            </button>
            <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
              <Home size={16} /> Về Tổng quan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
