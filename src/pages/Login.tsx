import { useState, useEffect } from 'react';
import { Eye, EyeOff, Car, Lock, User, ShieldAlert, Clock } from 'lucide-react';

const FAILED_LOGINS_KEY = 'agreen_failed_logins';
const LOCKOUT_UNTIL_KEY = 'agreen_lockout_until';
const SECURITY_LOGS_KEY = 'agreen_security_logs';

export interface SecurityLog {
  id: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOCKOUT' | 'PASSWORD_CHANGE';
  message: string;
  timestamp: string;
  username: string;
}

export function logSecurityEvent(type: SecurityLog['type'], message: string, username: string) {
  try {
    const existing: SecurityLog[] = JSON.parse(localStorage.getItem(SECURITY_LOGS_KEY) || '[]');
    const newLog: SecurityLog = {
      id: `SEC-${Date.now()}`,
      type,
      message,
      timestamp: new Date().toLocaleString('vi-VN'),
      username: username || 'khách'
    };
    // Keep last 50 logs
    const updated = [newLog, ...existing].slice(0, 50);
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to log security event', err);
  }
}

export function getSecurityLogs(): SecurityLog[] {
  try {
    return JSON.parse(localStorage.getItem(SECURITY_LOGS_KEY) || '[]');
  } catch (_err) {
    return [];
  }
}

export function clearSecurityLogs() {
  localStorage.removeItem(SECURITY_LOGS_KEY);
}

export function checkLogin(): boolean {
  return localStorage.getItem('agreen_auth') === 'true';
}

export function doLogout() {
  localStorage.removeItem('agreen_auth');
  localStorage.removeItem('agreen_admin_username');
}

export async function updateAdminCredentials(username: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, oldPassword, newPassword })
    });
    const data = await res.json();
    if (data.success) {
      logSecurityEvent('PASSWORD_CHANGE', `Tài khoản '${username}' đã đổi mật khẩu thành công.`, username);
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Đổi mật khẩu thất bại' };
    }
  } catch (err) {
    console.error('Failed to sync credentials to server', err);
    return { success: false, error: 'Lỗi kết nối máy chủ' };
  }
}

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Security State (Brute-force lockout & CAPTCHA)
  const [failedCount, setFailedCount] = useState<number>(() => {
    return Number(localStorage.getItem(FAILED_LOGINS_KEY)) || 0;
  });
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  
  // Math CAPTCHA state
  const [captchaNum1, setCaptchaNum1] = useState(7);
  const [captchaNum2, setCaptchaNum2] = useState(5);
  const [userCaptcha, setUserCaptcha] = useState('');

  // Generate new math CAPTCHA
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setUserCaptcha('');
  };

  // Check Lockout on mount & Countdown timer
  useEffect(() => {
    const lockoutUntil = Number(localStorage.getItem(LOCKOUT_UNTIL_KEY)) || 0;
    const now = Date.now();
    
    if (lockoutUntil > now) {
      setLockoutRemaining(Math.ceil((lockoutUntil - now) / 1000));
    }

    const interval = setInterval(() => {
      const currentLockout = Number(localStorage.getItem(LOCKOUT_UNTIL_KEY)) || 0;
      const currentNow = Date.now();
      if (currentLockout > currentNow) {
        setLockoutRemaining(Math.ceil((currentLockout - currentNow) / 1000));
      } else {
        setLockoutRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync credentials check removed as it's now PostgreSQL

  // Generate CAPTCHA when failed attempts reach 3
  useEffect(() => {
    if (failedCount >= 3) {
      generateCaptcha();
    }
  }, [failedCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check Lockout
    if (lockoutRemaining > 0) {
      setError(`🔒 Hệ thống đang KHÓA đăng nhập. Vui lòng chờ ${lockoutRemaining} giây nữa.`);
      return;
    }

    // Verify Math CAPTCHA if failed >= 3
    if (failedCount >= 3) {
      if (parseInt(userCaptcha.trim()) !== (captchaNum1 + captchaNum2)) {
        setError(`Mã xác thực CAPTCHA không chính xác (${captchaNum1} + ${captchaNum2} = ?). Vui lòng thử lại!`);
        generateCaptcha();
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        // SUCCESSFUL LOGIN
        localStorage.setItem('agreen_auth', 'true');
        localStorage.setItem('agreen_auth_time', Date.now().toString());
        localStorage.setItem('agreen_admin_username', data.data.username);
        localStorage.removeItem(FAILED_LOGINS_KEY);
        localStorage.removeItem(LOCKOUT_UNTIL_KEY);
        logSecurityEvent('LOGIN_SUCCESS', `Đăng nhập thành công từ tài khoản '${username}'`, username);
        onLogin();
      } else {
        // FAILED LOGIN ATTEMPT
        const newFailed = failedCount + 1;
        setFailedCount(newFailed);
        localStorage.setItem(FAILED_LOGINS_KEY, newFailed.toString());

        logSecurityEvent('LOGIN_FAILED', `Thử đăng nhập thất bại cho user '${username}' (Lần sai: ${newFailed})`, username);

        if (newFailed >= 5) {
          // LOCKOUT FOR 60 SECONDS
          const lockoutUntilTime = Date.now() + 60000;
          localStorage.setItem(LOCKOUT_UNTIL_KEY, lockoutUntilTime.toString());
          setLockoutRemaining(60);
          logSecurityEvent('LOCKOUT', `KÍCH HOẠT KHÓA ĐĂNG NHẬP 60s do nhập sai mật khẩu 5 lần liên tiếp!`, username);
          setError(`🔒 Tài khoản tạm bị KHÓA 60 giây do đăng nhập sai 5 lần liên tiếp để phòng chống Brute-force spam phá hoại.`);
        } else if (newFailed >= 3) {
          setError(data.error + ` (Sai ${newFailed}/5 lần). Kích hoạt mã xác thực CAPTCHA.`);
          generateCaptcha();
        } else {
          setError(data.error + ` (Sai ${newFailed}/5 lần). Vui lòng thử lại.`);
        }
      }
    } catch (err) {
      setError('Lỗi kết nối đến máy chủ xác thực.');
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
            Agreen
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: 500 }}>
            Dịch Vụ Cho Thuê Xe Điện Tự Lái • 0386619758
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
              Đã nhập sai mật khẩu 5 lần liên tiếp. Hệ thống kích hoạt chế độ chống dò quét mật khẩu Brute-force.
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
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Bảo mật lớp cao chống tấn công Brute-force & Spam</p>
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
                style={{ width: '100%', padding: '12px 44px 12px 44px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', background: isLocked ? '#F3F4F6' : '#FFF' }}
                onFocus={e => (e.target.style.borderColor = '#006837')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Math CAPTCHA Protection Triggered after 3 failed logins */}
          {failedCount >= 3 && !isLocked && (
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
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
