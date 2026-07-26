import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncRoute, badRequest, unauthorized, HttpError } from '../lib/http.js';
import { randomId } from '../lib/ids.js';
import {
  requireAuth,
  signSession,
  setSessionCookie,
  clearSessionCookie,
} from '../middleware/auth.js';
import { securityLogFromRow } from '../lib/mappers.js';

const router = express.Router();

const clientIp = (req) => (req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64);

async function logSecurity(type, message, username, ip) {
  await query(
    `INSERT INTO security_logs (id, type, message, username, ip) VALUES ($1,$2,$3,$4,$5)`,
    [randomId(), type, message, username || 'khách', ip]
  );
  // Chỉ giữ 200 dòng gần nhất để bảng không phình vô hạn
  await query(
    `DELETE FROM security_logs WHERE id IN (
       SELECT id FROM security_logs ORDER BY created_at DESC OFFSET 200
     )`
  );
}

/** Lấy trạng thái brute-force của 1 IP. */
async function getAttempt(ip) {
  const { rows } = await query(`SELECT * FROM login_attempts WHERE ip = $1`, [ip]);
  return rows[0] || { ip, failed_count: 0, lockout_until: null };
}

// Chặn spam ở tầng HTTP trước cả khi truy vấn DB
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau ít phút.' },
});

/** GET /api/auth/status — cho frontend biết còn bị khoá bao lâu, cần CAPTCHA chưa. */
router.get('/status', asyncRoute(async (req, res) => {
  const attempt = await getAttempt(clientIp(req));
  const lockedUntil = attempt.lockout_until ? new Date(attempt.lockout_until).getTime() : 0;
  const remainingSec = lockedUntil > Date.now() ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;
  res.json({
    failedCount: attempt.failed_count,
    lockoutRemaining: remainingSec,
    captchaRequired: attempt.failed_count >= 3 && remainingSec === 0,
  });
}));

/** POST /api/auth/login */
router.post('/login', loginLimiter, asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  const ip = clientIp(req);

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    throw badRequest('Vui lòng nhập tên đăng nhập và mật khẩu.');
  }

  const attempt = await getAttempt(ip);
  const lockedUntil = attempt.lockout_until ? new Date(attempt.lockout_until).getTime() : 0;
  if (lockedUntil > Date.now()) {
    const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
    throw new HttpError(429, `Hệ thống đang khoá đăng nhập. Vui lòng chờ ${remaining} giây.`, {
      lockoutRemaining: remaining,
    });
  }

  const { rows } = await query(
    `SELECT * FROM users WHERE username = $1 AND is_active = TRUE`,
    [username]
  );
  const user = rows[0];

  // So sánh hash ngay cả khi không có user, để thời gian phản hồi không tiết lộ
  // tên đăng nhập nào tồn tại (chống user enumeration qua timing).
  const dummyHash = '$2b$12$eImiTXuWVxfM37uY4JANjQ.jNCe9Fx3TSlrZjJl5oPGDlF3nBBEre';
  const ok = await bcrypt.compare(password, user?.password_hash || dummyHash);

  if (!user || !ok) {
    const failed = attempt.failed_count + 1;
    const shouldLock = failed >= config.maxFailedLogins;
    const until = shouldLock ? new Date(Date.now() + config.lockoutSeconds * 1000) : null;

    await query(
      `INSERT INTO login_attempts (ip, failed_count, lockout_until, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (ip) DO UPDATE
         SET failed_count = $2, lockout_until = $3, updated_at = NOW()`,
      [ip, shouldLock ? 0 : failed, until]
    );

    if (shouldLock) {
      await logSecurity(
        'LOCKOUT',
        `Khoá đăng nhập ${config.lockoutSeconds}s do sai mật khẩu ${config.maxFailedLogins} lần liên tiếp (IP ${ip}).`,
        username, ip
      );
      throw new HttpError(429, `Tài khoản tạm bị khoá ${config.lockoutSeconds} giây do đăng nhập sai ${config.maxFailedLogins} lần liên tiếp.`, {
        lockoutRemaining: config.lockoutSeconds,
      });
    }

    await logSecurity('LOGIN_FAILED', `Đăng nhập thất bại cho '${username}' (lần sai: ${failed}).`, username, ip);
    throw new HttpError(401, `Tên đăng nhập hoặc mật khẩu không đúng (sai ${failed}/${config.maxFailedLogins} lần).`, {
      failedCount: failed,
      captchaRequired: failed >= 3,
    });
  }

  // Đăng nhập thành công -> xoá bộ đếm
  await query(`DELETE FROM login_attempts WHERE ip = $1`, [ip]);
  await logSecurity('LOGIN_SUCCESS', `Đăng nhập thành công từ tài khoản '${user.username}'.`, user.username, ip);

  setSessionCookie(res, signSession(user));
  res.json({
    user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role, avatar: user.avatar },
  });
}));

/** GET /api/auth/me — frontend gọi khi khởi động để biết còn phiên hay không. */
router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const { rows } = await query(
    `SELECT id, username, full_name, role, avatar FROM users WHERE id = $1 AND is_active = TRUE`,
    [req.user.sub]
  );
  if (!rows[0]) throw unauthorized();
  const u = rows[0];
  res.json({ user: { id: u.id, username: u.username, fullName: u.full_name, role: u.role, avatar: u.avatar } });
}));

/** POST /api/auth/logout */
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** PATCH /api/auth/account — đổi username / mật khẩu / avatar */
router.patch('/account', requireAuth, asyncRoute(async (req, res) => {
  const { username, password, currentPassword, avatar } = req.body || {};

  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [req.user.sub]);
  const user = rows[0];
  if (!user) throw unauthorized();

  // Đổi mật khẩu hoặc tên đăng nhập đều phải xác thực lại mật khẩu hiện tại
  const wantsSensitiveChange = (password && password.length > 0) || (username && username !== user.username);
  if (wantsSensitiveChange) {
    if (typeof currentPassword !== 'string' || !currentPassword) {
      throw badRequest('Vui lòng nhập mật khẩu hiện tại để xác nhận thay đổi.');
    }
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw badRequest('Mật khẩu hiện tại không đúng.');
  }

  if (password && password.length > 0 && password.length < 8) {
    throw badRequest('Mật khẩu mới phải có ít nhất 8 ký tự.');
  }

  const nextUsername = typeof username === 'string' && username.trim() ? username.trim() : user.username;
  const nextHash = password ? await bcrypt.hash(password, 12) : user.password_hash;
  const nextAvatar = typeof avatar === 'string' ? avatar : user.avatar;

  const { rows: updated } = await query(
    `UPDATE users SET username = $1, password_hash = $2, avatar = $3 WHERE id = $4
     RETURNING id, username, full_name, role, avatar`,
    [nextUsername, nextHash, nextAvatar, user.id]
  );

  if (password) {
    await logSecurity('PASSWORD_CHANGE', `Tài khoản '${nextUsername}' đã đổi mật khẩu.`, nextUsername, clientIp(req));
  }

  // Cấp lại cookie vì username trong token đã thay đổi
  setSessionCookie(res, signSession(updated[0]));
  const u = updated[0];
  res.json({ user: { id: u.id, username: u.username, fullName: u.full_name, role: u.role, avatar: u.avatar } });
}));

/** GET /api/auth/security-logs */
router.get('/security-logs', requireAuth, asyncRoute(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 50`);
  res.json(rows.map(securityLogFromRow));
}));

/** DELETE /api/auth/security-logs */
router.delete('/security-logs', requireAuth, asyncRoute(async (_req, res) => {
  await query(`DELETE FROM security_logs`);
  res.json({ ok: true });
}));

export default router;
