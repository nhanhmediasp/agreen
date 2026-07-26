import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { unauthorized } from '../lib/http.js';

export const AUTH_COOKIE = 'agreen_session';

export function signSession(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function setSessionCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,               // JS phía client không đọc được -> XSS không lấy được token
    sameSite: 'strict',           // chặn CSRF cho request cross-site
    secure: config.isProd,        // chỉ gửi qua HTTPS khi production
    maxAge: config.sessionMaxAgeMs,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(AUTH_COOKIE, { path: '/', sameSite: 'strict', secure: config.isProd });
}

/** Bắt buộc đăng nhập. Token nằm trong cookie httpOnly. */
export function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(unauthorized());
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return next(unauthorized('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'));
  }
}
