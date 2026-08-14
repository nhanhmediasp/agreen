import { lazy, Suspense, useState, useRef, useEffect } from 'react';
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
  Image as ImageIcon,
  X,
  Check,
  Menu,
  Search,
  Plus,
  Compass,
  AlertCircle,
  WalletCards,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import { checkLogin, doLogout, updateAdminCredentials, type AuthUser } from './auth/clientAuth';
import { ImageGallery } from './components/ImageGallery';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const PublicStatus = lazy(() => import('./pages/PublicStatus'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const FleetManagement = lazy(() => import('./pages/FleetManagement'));
const CreateRental = lazy(() => import('./pages/CreateRental'));
const Customers = lazy(() => import('./pages/Customers'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Owners = lazy(() => import('./pages/Owners'));
const ServiceOrders = lazy(() => import('./pages/ServiceOrders'));
const Deposits = lazy(() => import('./pages/Deposits'));

const RouteFallback = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Đang tải…</div>
);

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
  '/drivers':    'Quản lý Đơn Dịch vụ & Tài xế',
  '/tai-xe':     'Quản lý Đơn Dịch vụ & Tài xế',
  '/customers':  'Khách hàng',
  '/owners':     'Chủ xe / Đối tác',
  '/deposits':   'Quản lý Tiền cọc',
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
              <img src={settings.logo} alt="Logo" style={{ width: '34px', height: '34px', borderRadius: '9px', objectFit: 'contain', flexShrink: 0 }} />
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
          <Link to="/deposits" onClick={onClose} className={`nav-item${isActive('/deposits')}`}>
            <WalletCards size={17} />
            <span>Tiền cọc</span>
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
          <Link to="/thong-tin-xe" onClick={onClose} target="_blank" className="nav-item">
            <Search size={17} />
            <span>Tra cứu xe</span>
          </Link>
          <Link to="/settings" onClick={onClose} className={`nav-item${isActive('/settings')}`}>
            <Settings size={17} />
            <span>Cài đặt</span>
          </Link>
        </nav>

        {/* Footer logout */}
        <div className="sidebar-footer">
          <button
            onClick={() => { void doLogout().finally(() => window.location.reload()); }}
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

  const currentUsername = localStorage.getItem('agreen_admin_username') || 'admin';
  const [editUsername, setEditUsername] = useState(currentUsername);
  const [editPassword, setEditPassword] = useState('');
  const [editOldPassword, setEditOldPassword] = useState('');
  const [editAvatar, setEditAvatar] = useState<string>(() => localStorage.getItem('agreen_admin_avatar') || '');
  const [saveMsg, setSaveMsg] = useState('');

  const avatar = localStorage.getItem('agreen_admin_avatar') || '';
  const initials = (localStorage.getItem('agreen_admin_username') || 'A').slice(0, 1).toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openEdit = () => {
    setEditUsername(localStorage.getItem('agreen_admin_username') || 'admin');
    setEditPassword('');
    setEditOldPassword('');
    setEditAvatar(localStorage.getItem('agreen_admin_avatar') || '');
    setSaveMsg('');
    setOpen(false);
    setShowEditModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) return;
    
    // Only attempt to change password if they enter a new one
    if (editPassword.trim()) {
      if (!editOldPassword.trim()) {
        setSaveMsg('Vui lòng nhập mật khẩu cũ để đổi mật khẩu!');
        return;
      }
      const res = await updateAdminCredentials(editUsername.trim(), editOldPassword.trim(), editPassword.trim());
      if (!res.success) {
        setSaveMsg(res.error || 'Đổi mật khẩu thất bại!');
        return;
      }
    }
    
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
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>{localStorage.getItem('agreen_admin_username') || 'admin'}</div>
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
          <button onClick={() => { setOpen(false); void doLogout().finally(() => window.location.reload()); }} style={{
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Tên hiển thị</label>
                  <input type="text" className="form-input" value={editUsername} onChange={e => setEditUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu cũ (bắt buộc khi đổi mk)</label>
                  <input type="password" className="form-input" placeholder="Nhập mật khẩu hiện tại..." value={editOldPassword} onChange={e => setEditOldPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu mới</label>
                  <input type="password" className="form-input" placeholder="Bỏ trống nếu không đổi..." value={editPassword} onChange={e => setEditPassword(e.target.value)} />
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

function VNDatetimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateStr = now.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      padding: '5px 12px',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
      border: '1px solid #bbf7d0',
      borderRadius: '10px',
      lineHeight: 1.3,
      userSelect: 'none',
    }}>
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '16px',
        fontWeight: 700,
        color: '#006837',
        letterSpacing: '0.04em',
      }}>
        {timeStr}
      </span>
      <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 500 }}>
        {dateStr} • GMT+7
      </span>
    </div>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isLoading, loadError } = useApp();
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
            <VNDatetimeClock />
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
          {loadError && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{loadError}</span>
            </div>
          )}
          {isLoading ? (
            <div style={{ minHeight: '240px', display: 'grid', placeItems: 'center' }}>
              Đang tải dữ liệu vận hành…
            </div>
          ) : children}
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
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const isPublicPath = ['/thong-tin-xe', '/public'].includes(window.location.pathname);

  useEffect(() => {
    if (isPublicPath) {
      setCheckingAuth(false);
      return;
    }
    void checkLogin().then((user) => {
      setAuthUser(user);
      if (user) localStorage.setItem('agreen_admin_username', user.username);
      setCheckingAuth(false);
    });
  }, [isPublicPath]);

  useEffect(() => {
    const handleUnauthorized = () => setAuthUser(null);
    window.addEventListener('agreen:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('agreen:unauthorized', handleUnauthorized);
  }, []);

  if (isPublicPath) {
    return (
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/thong-tin-xe" element={<PublicStatus />} />
            <Route path="/public" element={<PublicStatus />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  if (checkingAuth) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Đang kiểm tra phiên đăng nhập…</div>;
  }

  if (!authUser) {
    return <Login onLogin={() => {
      setCheckingAuth(true);
      void checkLogin().then((user) => {
        setAuthUser(user);
        setCheckingAuth(false);
      });
    }} />;
  }

  return (
    <AppProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/fleet" element={<AdminLayout><FleetManagement /></AdminLayout>} />
            <Route path="/rental/new" element={<AdminLayout><CreateRental /></AdminLayout>} />
            <Route path="/contracts" element={<AdminLayout><Contracts /></AdminLayout>} />
            <Route path="/services" element={<AdminLayout><ServiceOrders /></AdminLayout>} />
            <Route path="/drivers" element={<AdminLayout><ServiceOrders /></AdminLayout>} />
            <Route path="/drivers/:id" element={<AdminLayout><ServiceOrders /></AdminLayout>} />
            <Route path="/tai-xe" element={<AdminLayout><ServiceOrders /></AdminLayout>} />
            <Route path="/tai-xe/:id" element={<AdminLayout><ServiceOrders /></AdminLayout>} />
            <Route path="/customers" element={<AdminLayout><Customers /></AdminLayout>} />
            <Route path="/owners" element={<AdminLayout><Owners /></AdminLayout>} />
            <Route path="/deposits" element={<AdminLayout><Deposits /></AdminLayout>} />
            <Route path="/expenses" element={<AdminLayout><Expenses /></AdminLayout>} />
            <Route path="/reports" element={<AdminLayout><Reports /></AdminLayout>} />
            <Route path="/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
          </Routes>
        </Suspense>
        <ToastContainer />
      </Router>
    </AppProvider>
  );
}

export default App;
