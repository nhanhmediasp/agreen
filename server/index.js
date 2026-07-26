import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';

import { config } from './config.js';
import { assertConnection } from './db.js';
import { errorHandler, notFound } from './lib/http.js';
import { requireAuth } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import carsRoutes from './routes/cars.js';
import ownersRoutes from './routes/owners.js';
import customersRoutes from './routes/customers.js';
import rentalsRoutes from './routes/rentals.js';
import driversRoutes from './routes/drivers.js';
import serviceOrdersRoutes from './routes/serviceOrders.js';
import expensesRoutes from './routes/expenses.js';
import imagesRoutes from './routes/images.js';
import settingsRoutes from './routes/settings.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Sau nginx nên cần trust proxy để req.ip là IP thật của client (dùng cho rate limit)
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({
  // Trang tĩnh do nginx phục vụ; ở đây chỉ có API + /uploads nên không cần CSP của helmet
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: mặc định TẮT (same-origin qua nginx). Chỉ bật khi khai báo CORS_ORIGIN.
if (config.corsOrigin) {
  const allowList = config.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: allowList, credentials: true }));
}

app.use(cookieParser());
// Tệp backup của hệ thống 500+ đơn có thể vài MB, nên endpoint restore cần
// hạn mức riêng, rộng hơn hạn mức chung của API.
app.use('/api/admin/restore', express.json({ limit: '64mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// Giới hạn chung cho toàn bộ API
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít giây.' },
}));

// Tệp đã upload (ảnh xe, PDF hợp đồng)
fs.mkdirSync(config.uploadDir, { recursive: true });
app.use('/uploads', express.static(config.uploadDir, {
  maxAge: '30d',
  immutable: true,
  index: false,
  dotfiles: 'deny',
  setHeaders: (res) => {
    // Không cho trình duyệt tự chạy nội dung tệp người dùng tải lên (chống XSS qua SVG/HTML)
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.get('/api/health', async (_req, res) => {
  try {
    const info = await assertConnection();
    res.json({ ok: true, database: info.db, time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// --- Public (không cần đăng nhập)
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

// --- Từ đây trở xuống bắt buộc phải đăng nhập
app.use('/api', requireAuth);
app.use('/api/cars', carsRoutes);
app.use('/api/owners', ownersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/service-orders', serviceOrdersRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, _res, next) => next(notFound('Endpoint không tồn tại.')));
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[server] API đang chạy tại http://127.0.0.1:${config.port} (${config.isProd ? 'production' : 'development'})`);
  assertConnection()
    .then((info) => console.log(`[db] Đã kết nối PostgreSQL: ${info.db}`))
    .catch((err) => console.error(`[db] ❌ Không kết nối được: ${err.message}`));
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[server] Nhận ${signal}, đang tắt...`);
    server.close(() => process.exit(0));
  });
}

export default app;
