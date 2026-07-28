import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const COOKIE_NAME = 'agreen_session';
const CSRF_COOKIE_NAME = 'agreen_csrf';
const TOKEN_TTL_SECONDS = Number.parseInt(process.env.AUTH_TOKEN_TTL_SECONDS || '28800', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const configuredSecret = process.env.JWT_SECRET?.trim();
if (IS_PRODUCTION && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production');
}

const jwtSecret = configuredSecret || crypto.randomBytes(48).toString('base64url');
if (!configuredSecret) {
  console.warn('[Auth] JWT_SECRET is not configured; using an ephemeral development secret');
}

const encode = (value) => Buffer.from(value).toString('base64url');

const signToken = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encode(JSON.stringify({
    sub: String(user.id),
    username: user.username,
    role: user.role,
    ver: new Date(user.updated_at).getTime(),
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
};

const verifyToken = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signature] = parts;
  const unsigned = `${headerPart}.${payloadPart}`;
  const expected = crypto.createHmac('sha256', jwtSecret).update(unsigned).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

const parseCookies = (cookieHeader = '') => Object.fromEntries(
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [part, ''];
      return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    }),
);

const sessionCookie = (token, maxAge = TOKEN_TTL_SECONDS) => {
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (IS_PRODUCTION) attributes.push('Secure');
  return attributes.join('; ');
};

export const clearSessionCookie = () => sessionCookie('', 0);

const csrfCookie = (token, maxAge = TOKEN_TTL_SECONDS) => {
  const attributes = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (IS_PRODUCTION) attributes.push('Secure');
  return attributes.join('; ');
};

const clearCsrfCookie = () => csrfCookie('', 0);

const setAuthCookies = (res, token, csrfToken) => {
  res.setHeader('Set-Cookie', [
    sessionCookie(token),
    csrfCookie(csrfToken),
  ]);
};

const clearAuthCookies = (res) => {
  res.setHeader('Set-Cookie', [
    clearSessionCookie(),
    clearCsrfCookie(),
  ]);
};

const ensureCsrfToken = (req, res) => {
  const existing = parseCookies(req.headers.cookie)[CSRF_COOKIE_NAME];
  if (typeof existing === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(existing)) {
    return existing;
  }
  const token = crypto.randomBytes(32).toString('base64url');
  res.append('Set-Cookie', csrfCookie(token));
  return token;
};

const safeEqualText = (first, second) => {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length
    && crypto.timingSafeEqual(firstBuffer, secondBuffer);
};

export const createCsrfProtection = ({ isAllowedOrigin }) => (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.get('origin');
  if (!origin || !isAllowedOrigin(req, origin)) {
    return res.status(403).json({
      success: false,
      error: 'Request origin is not allowed',
      code: 'CSRF_ORIGIN_REJECTED',
    });
  }

  const cookies = parseCookies(req.headers.cookie);
  const headerToken = req.get('x-csrf-token');
  if (!safeEqualText(cookies[CSRF_COOKIE_NAME], headerToken)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID',
    });
  }
  return next();
};

const requestQuery = (req) => req.app?.locals?.dbQuery || query;

const legacySha256 = (password) => crypto.createHash('sha256').update(password).digest('hex');

const verifyPassword = async (password, passwordHash) => {
  if (typeof passwordHash !== 'string') return { valid: false, legacy: false };
  if (/^[a-f0-9]{64}$/i.test(passwordHash)) {
    const candidate = Buffer.from(legacySha256(password), 'hex');
    const stored = Buffer.from(passwordHash, 'hex');
    return {
      valid: candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored),
      legacy: true,
    };
  }
  return { valid: await bcrypt.compare(password, passwordHash), legacy: false };
};

export const passwordValidationError = (password) => {
  if (typeof password !== 'string' || password.length < 12) return 'Mật khẩu mới phải có ít nhất 12 ký tự';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Mật khẩu mới phải có chữ hoa, chữ thường, số và ký tự đặc biệt';
  }
  return null;
};

export const requireAuth = async (req, res, next) => {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const result = await requestQuery(req)(
      'SELECT id, username, role, is_active, updated_at FROM users WHERE id::text = $1',
      [payload.sub],
    );
    const user = result.rows[0];
    if (!user?.is_active || new Date(user.updated_at).getTime() !== payload.ver) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, error: 'Session is no longer valid' });
    }
    req.user = {
      id: String(user.id),
      username: user.username,
      role: user.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
  return next();
};

export const registerAuthRoutes = (app, {
  loginLimiter,
  sensitiveLimiter,
  csrfProtection,
}) => {
  app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password || username.length > 100 || password.length > 1024) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    try {
      const result = await requestQuery(req)(
        'SELECT id, username, password_hash, role, is_active, updated_at FROM users WHERE username = $1',
        [username],
      );
      const user = result.rows[0];
      const passwordResult = user?.is_active
        ? await verifyPassword(password, user.password_hash)
        : { valid: false, legacy: false };

      if (!user?.is_active || !passwordResult.valid) {
        return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không đúng' });
      }

      let authenticatedUser = user;
      if (passwordResult.legacy) {
        const passwordHash = await bcrypt.hash(password, 12);
        const upgraded = await requestQuery(req)(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role, updated_at',
          [passwordHash, user.id],
        );
        authenticatedUser = upgraded.rows[0];
      }

      const csrfToken = crypto.randomBytes(32).toString('base64url');
      setAuthCookies(res, signToken(authenticatedUser), csrfToken);
      return res.json({
        success: true,
        data: {
          id: String(authenticatedUser.id),
          username: authenticatedUser.username,
          role: authenticatedUser.role,
          csrfToken,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/logout', csrfProtection, (_req, res) => {
    clearAuthCookies(res);
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const csrfToken = ensureCsrfToken(req, res);
    res.json({ success: true, data: { ...req.user, csrfToken } });
  });

  app.post(
    '/api/auth/change-password',
    sensitiveLimiter,
    requireAuth,
    csrfProtection,
    requireRole('admin'),
    async (req, res, next) => {
      const oldPassword = typeof req.body?.oldPassword === 'string' ? req.body.oldPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const targetUsername = typeof req.body?.username === 'string' && req.body.username.trim()
        ? req.body.username.trim()
        : req.user.username;

      if (!oldPassword) {
        return res.status(400).json({ success: false, error: 'Mật khẩu hiện tại là bắt buộc' });
      }
      const validationError = passwordValidationError(newPassword);
      if (validationError) return res.status(400).json({ success: false, error: validationError });

      try {
        const actorResult = await requestQuery(req)(
          'SELECT id, password_hash FROM users WHERE id::text = $1 AND is_active = TRUE',
          [req.user.id],
        );
        const actor = actorResult.rows[0];
        if (!actor) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản hiện tại' });

        const oldPasswordResult = await verifyPassword(oldPassword, actor.password_hash);
        if (!oldPasswordResult.valid) {
          return res.status(403).json({ success: false, error: 'Mật khẩu hiện tại không đúng' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        const updateResult = await requestQuery(req)(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2 RETURNING id',
          [passwordHash, targetUsername],
        );
        if (updateResult.rowCount === 0) {
          return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản cần đổi mật khẩu' });
        }

        clearAuthCookies(res);
        return res.json({ success: true, requiresLogin: true });
      } catch (error) {
        return next(error);
      }
    },
  );
};

export const bootstrapAdmin = async () => {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password) return;

  const validationError = passwordValidationError(password);
  if (validationError) throw new Error(`BOOTSTRAP_ADMIN_PASSWORD is invalid: ${validationError}`);

  const existing = await query('SELECT COUNT(*)::int AS count FROM users');
  if (existing.rows[0].count > 0) return;

  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim() || 'admin';
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || 'admin@example.invalid';
  const fullName = process.env.BOOTSTRAP_ADMIN_FULL_NAME?.trim() || 'Administrator';
  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO users (username, email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, 'admin')`,
    [username, email, passwordHash, fullName],
  );
  console.log(`[Auth] Bootstrapped initial admin account "${username}"`);
};

export const authTestHelpers = {
  signToken,
  verifyToken,
  verifyPassword,
};
