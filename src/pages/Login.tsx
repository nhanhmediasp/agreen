import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Car, Lock, User, ShieldAlert, Clock } from 'lucide-react';
import { api, ApiError } from '../api/client';

export interface SecurityLog {
  id: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOCKOUT' | 'PASSWORD_CHANGE';
  message: string;
  timestamp: string;
  username: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  avatar: string;
}

/**
 * Toàn bộ xác thực giờ nằm ở server:
 *  - Mật khẩu được hash bcrypt trong PostgreSQL (không còn plaintext trong localStorage).
 *  - Phiên là cookie httpOnly có hạn -> JS không đọc được, tự hết hạn.
 *  - Đếm sai mật khẩu / khoá / CAPTCHA do server quyết định, xoá localStorage không bypass được.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await api.get<{ user: AuthUser }>('/auth/me', { silent401: true });
    return data.user;
  } catch {
    return null;
  }
}

export async function doLogout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Kể cả khi gọi thất bại vẫn cho người dùng thoát khỏi UI
  }
}

export async function updateAdminCredentials(payload: {
  username?: string;
  password?: string;
  currentPassword?: string;
  avatar?: string;
}): Promise<AuthUser> {
  const data = await api.patch<{ user: AuthUser }>('/auth/account', payload);
  return data.user;
}

export async function getSecurityLogs(): Promise<SecurityLog[]> {
  return api.get<SecurityLog[]>('/auth/security-logs');
}

export async function clearSecurityLogs(): Promise<void> {
  await api.delete('/auth/security-logs');
}

type LoginStatus = { failedCount: number; lockoutRemaining: number; captchaRequired: boolean };

export default function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [failedCount, setFailedCount] = useState(0);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // CAPTCHA cộng đơn giản — chỉ là rào chắn bot, lớp chống brute-force thật nằm ở server
  const [captchaNum1, setCaptchaNum1] = useState(7);
  const [captchaNum2, setCaptchaNum2] = useState(5);
  const [userCaptcha, setUserCaptcha] = useState('');

  const generateCaptcha = useCallback(() => {
    setCaptchaNum1(Math.floor(Math.random() * 9) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 9) + 1);
    setUserCaptcha('');
  }, []);

  // Lấy trạng thái khoá từ server khi mở trang
  useEffect(() => {
    let cancelled = false;
    api.get<LoginStatus>('/auth/status', { silent401: true })
      .then((status) => {
        if (cancelled) return;
        setFailedCount(status.failedCount);
        setLockoutRemaining(status.lockoutRemaining);
        setCaptchaRequired(status.captchaRequired);
        if (status.captchaRequired) generateCaptcha();
      })
      .catch(() => { /* server chưa sẵn sàng — vẫn cho nhập, lỗi sẽ hiện khi submit */ });
    return () => { cancelled = true; };
  }, [generateCaptcha]);

  // Đồng hồ đếm ngược thời gian khoá
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutRemaining > 0) {
      setError(`🔒 Hệ thống đang KHÓA đăng nhập. Vui lòng chờ ${lockoutRemaining} giây nữa.`);
      return;
    }

    if (captchaRequired && parseInt(userCaptcha.trim(), 10) !== captchaNum1 + captchaNum2) {
      setError(`Mã xác thực CAPTCHA không chính xác (${captchaNum1} + ${captchaNum2} = ?). Vui lòng thử lại!`);
      generateCaptcha();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post<{ user: AuthUser }>('/auth/login', { username, password }, { silent401: true });
      setFailedCount(0);
      setCaptchaRequired(false);
      onLogin(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = (err.details ?? {}) as Partial<LoginStatus>;
        if (typeof details.failedCount === 'number') setFailedCount(details.failedCount);
        if (details.captchaRequired) {
          setCaptchaRequired(true);
          generateCaptcha();
        }
        if (typeof details.lockoutRemaining === 'number' && details.lockoutRemaining > 0) {
          setLockoutRemaining(details.lockoutRemaining);
        }
        setError(err.message);
      } else {
        setError('Không kết nối được tới server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #003d20 0%, #006837 50%, #00a84b 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'inherit',
      padding: '24px'
    }}>
      {/* Background decorative blobs */}
      <div style={{ position: 'absolute', top: '-120px', left: '-120px', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

      {/* Center Card */}
      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '68px', height: '68px',
            background: 'linear-gradient(135deg, #006837, #00a84b)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 20px rgba(0,104,55,0.35)'
          }}>
            <Car size={34} color="white" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a', letterSpacing: '-0.5px' }}>
            AutoManage
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Hệ thống quản lý cho thuê xe &amp; Đội xe
          </p>
        </div>

        {/* Lockout Warning Banner */}
        {isLocked && (
          <div style={{
            background: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 800, fontSize: '15px', color: '#DC2626' }}>
              <ShieldAlert size={20} /> TÀI KHOẢN TẠM KHÓA
            </div>
            <p style={{ margin: '6px 0 10px', fontSize: '12.5px', color: '#7F1D1D' }}>
              Đã nhập sai mật khẩu quá số lần cho phép. Server đã kích hoạt chế độ chống dò quét mật khẩu.
            </p>
            <div style={{ background: '#DC2626', color: '#FFF', padding: '6px 12px', borderRadius: '20px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <Clock size={16} /> Thử lại sau: {lockoutRemaining} giây
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: '1px', background: '#f1f5f9', marginBottom: '24px' }} />

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>Đăng nhập Quản trị</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Xác thực phía server, mật khẩu mã hoá bcrypt</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Tên đăng nhập
            </label>
            <div style={{ position: 'relative' }}>
              <User size={17} color="#9ca3af" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                disabled={isLocked}
                autoFocus
                autoComplete="username"
                style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', background: isLocked ? '#F3F4F6' : '#FFF' }}
                onFocus={e => (e.target.style.borderColor = '#006837')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="#9ca3af" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLocked}
                autoComplete="current-password"
                style={{ width: '100%', padding: '12px 44px 12px 44px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', background: isLocked ? '#F3F4F6' : '#FFF' }}
                onFocus={e => (e.target.style.borderColor = '#006837')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* CAPTCHA khi server báo đã sai nhiều lần */}
          {captchaRequired && !isLocked && (
            <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={15} /> XÁC THỰC AN TOÀN CHỐNG SPAM (CAPTCHA)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#DBEAFE', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '16px', color: '#1E3A8A', letterSpacing: '0.05em' }}>
                  {captchaNum1} + {captchaNum2} = ?
                </div>
                <input
                  type="number"
                  placeholder="Nhập kết quả"
                  required
                  value={userCaptcha}
                  onChange={e => setUserCaptcha(e.target.value)}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #93C5FD', fontSize: '14px', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {error && !isLocked && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ {error}
            </div>
          )}

          {failedCount > 0 && !error && !isLocked && (
            <div style={{ fontSize: '12px', color: '#b45309' }}>
              Đã có {failedCount} lần đăng nhập sai từ thiết bị này.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            style={{
              width: '100%', padding: '13px',
              background: isLocked ? '#94A3B8' : 'linear-gradient(135deg, #006837, #00a84b)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontWeight: 700, fontSize: '15px',
              cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: (loading || isLocked) ? 0.75 : 1,
              marginTop: '4px'
            }}
          >
            {loading ? (
              <>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Đang xác thực bảo mật...
              </>
            ) : isLocked ? `Tạm khóa (${lockoutRemaining}s)` : 'Đăng nhập an toàn'}
          </button>
        </form>

        {/*
          Không in mật khẩu mặc định ra UI nữa. Mật khẩu admin được sinh ngẫu nhiên
          và chỉ hiện MỘT LẦN trong terminal khi chạy `npm run db:seed`.
        */}
        <div style={{ marginTop: '24px', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 600 }}>🔐 Quên mật khẩu?</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.5 }}>
            Đăng nhập SSH vào server và chạy <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>npm run db:seed</code>{' '}
            để tạo lại tài khoản, hoặc đặt lại mật khẩu trực tiếp trong PostgreSQL.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
