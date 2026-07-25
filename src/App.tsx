import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Car, 
  FileText, 
  Users, 
  DollarSign, 
  Settings, 
  BarChart,
  UserCheck,
  LogOut,
  User,
  Lock,
  Image as ImageIcon,
  X,
  Check,
  Menu,
  Search,
  Plus,
  Compass
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import PublicStatus from './pages/PublicStatus';
import SettingsPage from './pages/Settings';
import FleetManagement from './pages/FleetManagement';
import CreateRental from './pages/CreateRental';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Contracts from './pages/Contracts';
import Owners from './pages/Owners';
import ServiceOrders from './pages/ServiceOrders';
import Login, { checkLogin, doLogout, getAdminCredentials, updateAdminCredentials } from './pages/Login';
import { ImageGallery } from './components/ImageGallery';

const isImageUrl = (url: string) => {
  if (!url || url === 'Auto') return false;
  return url.startsWith('http') || 
         url.startsWith('data:') || 
         url.startsWith('/uploads') || 
         url.startsWith('/') || 
         /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url);
};

const PAGE_TITLES: Record<string, string> = {
  '/':           'Tổng quan Vận hành',
  '/fleet':      'Quản lý Đội xe',
  '/contracts':  'Quản lý Đơn thuê',
  '/services':   'Quản lý Đơn Dịch vụ & Tài xế',
  '/customers':  'Khách hàng',
  '/owners':     'Chủ xe / Đối tác',
  '/expenses':   'Sổ Thu chi & Chi phí',
  '/reports':    'Báo cáo & Thống kê',
  '/settings':   'Cài đặt Hệ thống',
  '/rental/new': 'Tạo đơn thuê mới',
};

function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const location = useLocation();
  const { settings } = useApp();
  const isActive = (path: string) => location.pathname === path ? ' active' : '';

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
            {isImageUrl(settings.logo) ? (
              <img src={settings.logo} alt="Logo" style={{ width: '34px', height: '34px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div className="sidebar-logo-icon">{settings.logo.slice(0, 1).toUpperCase()}</div>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-brand-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isImageUrl(settings.logo) ? 'AGREEN' : settings.logo}
              </div>
              <div style={{ fontSize: '10.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', display: 'inline-block', flexShrink: 0 }}></span>
                Hệ thống vận hành
              </div>
            </div>
          </Link>

          {onClose && (
            <button onClick={onClose} className="sidebar-close-btn" style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', flexShrink: 0, alignItems: 'center' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">Vận hành</div>

          <Link to="/" onClick={onClose} className={`nav-item${isActive('/')}`}>
            <LayoutDashboard size={17} />
            <span>Tổng quan</span>
          </Link>
          <Link to="/fleet" onClick={onClose} className={`nav-item${isActive('/fleet')}`}>
            <Car size={17} />
            <span>Quản lý Đội xe</span>
          </Link>
          <Link to="/contracts" onClick={onClose} className={`nav-item${isActive('/contracts')}`}>
            <FileText size={17} />
            <span>Đơn thuê (HĐ)</span>
          </Link>
          <Link to="/services" onClick={onClose} className={`nav-item${isActive('/services')}`}>
            <Compass size={17} />
            <span>Đơn dịch vụ (Tài xế)</span>
          </Link>

          <div className="nav-section-title" style={{ marginTop: '6px' }}>Đối tác & Tài chính</div>

          <Link to="/customers" onClick={onClose} className={`nav-item${isActive('/customers')}`}>
            <Users size={17} />
            <span>Khách hàng</span>
          </Link>
          <Link to="/owners" onClick={onClose} className={`nav-item${isActive('/owners')}`}>
            <UserCheck size={17} />
            <span>Chủ xe / Đối tác</span>
          </Link>
          <Link to="/expenses" onClick={onClose} className={`nav-item${isActive('/expenses')}`}>
            <DollarSign size={17} />
            <span>Sổ Thu chi</span>
          </Link>
          <Link to="/reports" onClick={onClose} className={`nav-item${isActive('/reports')}`}>
            <BarChart size={17} />
            <span>Báo cáo & Thống kê</span>
          </Link>

          <div className="nav-section-title" style={{ marginTop: '6px' }}>Hệ thống</div>
          <Link to="/settings" onClick={onClose} className={`nav-item${isActive('/settings')}`}>
            <Settings size={17} />
            <span>Cài đặt</span>
          </Link>
        </nav>

        {/* Footer logout */}
        <div className="sidebar-footer">
          <button
            onClick={() => { doLogout(); window.location.reload(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
              padding: '10px 13px', borderRadius: '9px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#94A3B8', cursor: 'pointer', fontWeight: 500, fontSize: '13px',
              fontFamily: 'inherit', transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.14)';
              e.currentTarget.style.color = '#FCA5A5';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <LogOut size={15} />
            <span style={{ flex: 1 }}>Đăng xuất</span>
            <span style={{ fontSize: '10px', opacity: 0.5 }}>v2.5</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function AccountDropdown() {
  const [open, setOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const creds = getAdminCredentials();
  const [editUsername, setEditUsername] = useState(creds.username);
  const [editPassword, setEditPassword] = useState('');
  const [editAvatar, setEditAvatar] = useState<string>(() => localStorage.getItem('agreen_admin_avatar') || '');
  const [saveMsg, setSaveMsg] = useState('');

  const avatar = localStorage.getItem('agreen_admin_avatar') || '';
  const initials = (getAdminCredentials().username || 'A').slice(0, 1).toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openEdit = () => {
    const c = getAdminCredentials();
    setEditUsername(c.username);
    setEditPassword('');
    setEditAvatar(localStorage.getItem('agreen_admin_avatar') || '');
    setSaveMsg('');
    setOpen(false);
    setShowEditModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) return;
    const newPass = editPassword.trim() || getAdminCredentials().password;
    updateAdminCredentials(editUsername.trim(), newPass);
    localStorage.setItem('agreen_admin_avatar', editAvatar);
    setSaveMsg('Đã lưu thay đổi!');
    setTimeout(() => { setShowEditModal(false); window.location.reload(); }, 900);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '2px solid var(--primary)', overflow: 'hidden',
          cursor: 'pointer', padding: 0, background: 'none', flexShrink: 0,
          transition: 'box-shadow 0.15s',
        }}
      >
        {avatar ? (
          <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%', backgroundColor: 'var(--primary)',
            color: 'white', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, fontSize: '14px',
          }}>
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '44px', right: 0, background: 'white',
          borderRadius: '12px', boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
          border: '1px solid var(--border)', minWidth: '192px', zIndex: 500, padding: '6px',
        }}>
          <div style={{ padding: '10px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>{getAdminCredentials().username}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Quản trị viên</div>
          </div>
          <button onClick={openEdit} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 12px', borderRadius: '7px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '13.5px', color: 'var(--text-primary)', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <User size={15} color="var(--text-muted)" /> Chỉnh sửa tài khoản
          </button>
          <button onClick={() => { setOpen(false); doLogout(); window.location.reload(); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 12px', borderRadius: '7px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '13.5px', color: '#dc2626', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <form onSubmit={handleSave} className="modal-box" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Chỉnh sửa tài khoản</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="btn-ghost btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '76px', height: '76px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)', flexShrink: 0 }}>
                  {editAvatar ? (
                    <img src={editAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '28px' }}>
                      {editUsername.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setShowGallery(true)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={13} /> Đổi ảnh đại diện
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Tên đăng nhập</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#9ca3af" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} required
                    className="form-input" style={{ paddingLeft: '34px' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(để trống = giữ nguyên)</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#9ca3af" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Nhập mật khẩu mới..."
                    className="form-input" style={{ paddingLeft: '34px' }} />
                </div>
              </div>

              {saveMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#16a34a', fontWeight: 600, fontSize: '13px' }}>
                  <Check size={15} /> {saveMsg}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Hủy</button>
              <button type="submit" className="btn-primary">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}

      {showGallery && (
        <ImageGallery
          onClose={() => setShowGallery(false)}
          onSelect={(url) => {
            const finalUrl = Array.isArray(url) ? url[0] : url;
            setEditAvatar(finalUrl);
            setShowGallery(false);
          }}
        />
      )}
    </div>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

  // Close sidebar on route change (mobile)
  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  return (
    <div className="app-container">
      <Sidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>
            <span className="page-title">{pageTitle}</span>
            <div className="search-bar">
              <Search size={15} color="var(--text-muted)" />
              <input type="text" placeholder="Tìm kiếm..." />
            </div>
          </div>

          <div className="topbar-right">
            <Link to="/rental/new">
              <button className="btn-primary" style={{ gap: '6px' }}>
                <Plus size={15} />
                <span>Tạo đơn</span>
              </button>
            </Link>
            <AccountDropdown />
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} className="toast" style={{
          borderLeft: `4px solid ${t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#2563eb'}`,
        }}>
          {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(checkLogin);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/thong-tin-xe" element={<PublicStatus />} />
          <Route path="/public" element={<PublicStatus />} />
          <Route path="/" element={<AdminLayout><Dashboard /></AdminLayout>} />
          <Route path="/fleet" element={<AdminLayout><FleetManagement /></AdminLayout>} />
          <Route path="/rental/new" element={<AdminLayout><CreateRental /></AdminLayout>} />
          <Route path="/contracts" element={<AdminLayout><Contracts /></AdminLayout>} />
          <Route path="/services" element={<AdminLayout><ServiceOrders /></AdminLayout>} />
          <Route path="/customers" element={<AdminLayout><Customers /></AdminLayout>} />
          <Route path="/owners" element={<AdminLayout><Owners /></AdminLayout>} />
          <Route path="/expenses" element={<AdminLayout><Expenses /></AdminLayout>} />
          <Route path="/reports" element={<AdminLayout><Reports /></AdminLayout>} />
          <Route path="/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
        </Routes>
        <ToastContainer />
      </Router>
    </AppProvider>
  );
}

export default App;
