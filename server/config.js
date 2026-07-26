import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';

/**
 * JWT_SECRET là bắt buộc khi chạy production — không có giá trị mặc định,
 * vì secret mặc định đồng nghĩa ai cũng ký được token admin.
 */
function requiredSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'super_secret_jwt_key_change_me_in_production') {
    if (isProd) {
      throw new Error(
        'JWT_SECRET chưa được đặt (hoặc còn là giá trị mẫu). Hãy sinh một secret ngẫu nhiên:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
        'rồi ghi vào file .env trước khi chạy production.'
      );
    }
    console.warn('[config] ⚠  JWT_SECRET chưa đặt — đang dùng secret tạm cho môi trường dev.');
    return 'dev-only-insecure-secret';
  }
  return secret;
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 5000),
  jwtSecret: requiredSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  sessionMaxAgeMs: Number(process.env.SESSION_MAX_AGE_MS || 8 * 60 * 60 * 1000),
  corsOrigin: process.env.CORS_ORIGIN || '',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 8),
  // Brute-force
  maxFailedLogins: Number(process.env.MAX_FAILED_LOGINS || 5),
  lockoutSeconds: Number(process.env.LOCKOUT_SECONDS || 300),
  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  rootDir: path.resolve(__dirname, '..'),
};
