const SECURITY_LOGS_KEY = 'agreen_security_logs';
const CSRF_COOKIE_NAME = 'agreen_csrf';

export function csrfHeaders(): Record<string, string> {
  const csrfToken = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.slice(CSRF_COOKIE_NAME.length + 1);
  return csrfToken ? { 'X-CSRF-Token': decodeURIComponent(csrfToken) } : {};
}

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
  role: string;
}

export function logSecurityEvent(type: SecurityLog['type'], message: string, username: string): void {
  try {
    const existing: SecurityLog[] = JSON.parse(localStorage.getItem(SECURITY_LOGS_KEY) || '[]');
    const newLog: SecurityLog = {
      id: `SEC-${Date.now()}`,
      type,
      message,
      timestamp: new Date().toLocaleString('vi-VN'),
      username: username || 'khách',
    };
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify([newLog, ...existing].slice(0, 50)));
  } catch (error) {
    console.error('Failed to log security event', error);
  }
}

export function getSecurityLogs(): SecurityLog[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SECURITY_LOGS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as SecurityLog[] : [];
  } catch (error) {
    console.error('Failed to read local security logs', error);
    return [];
  }
}

export function clearSecurityLogs(): void {
  localStorage.removeItem(SECURITY_LOGS_KEY);
}

export async function checkLogin(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) return null;
    const result: { success: boolean; data?: AuthUser } = await response.json();
    return result.success && result.data ? result.data : null;
  } catch (error) {
    console.error('Failed to verify the server session', error);
    return null;
  }
}

export async function doLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    });
  } finally {
    localStorage.removeItem('agreen_admin_username');
  }
}

export async function updateAdminCredentials(
  username: string,
  oldPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
      body: JSON.stringify({ username, oldPassword, newPassword }),
    });
    const data: { success?: boolean; error?: string } = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Đổi mật khẩu thất bại' };
    }
    logSecurityEvent(
      'PASSWORD_CHANGE',
      `Tài khoản '${username}' đã đổi mật khẩu thành công.`,
      username,
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to sync credentials to server', error);
    return { success: false, error: 'Lỗi kết nối máy chủ' };
  }
}
