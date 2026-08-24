import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { getClient as poolGetClient, query as poolQuery } from './db.js';
import {
  bootstrapAdmin,
  createCsrfProtection,
  registerAuthRoutes,
  requireAuth,
  requireRole,
} from './auth.js';

const app = express();
app.locals.dbQuery = poolQuery;
app.locals.getDbClient = poolGetClient;
const query = (...args) => app.locals.dbQuery(...args);
const getClient = () => app.locals.getDbClient();
const PORT = Number.parseInt(process.env.PORT || '5000', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const RENTAL_OPEN_STATUSES = new Set(['pending', 'active']);
const RENTAL_STATUSES = new Set(['pending', 'active', 'completed', 'cancelled']);
const PAYMENT_STATUSES = new Set(['deposit', 'paid', 'debt']);
const SERVICE_STATUSES = new Set(['scheduled', 'ongoing', 'completed', 'cancelled']);
const SERVICE_PAYMENT_STATUSES = new Set(['paid', 'unpaid']);
const VEHICLE_STATUSES = new Set(['Available', 'Reserved', 'Rented', 'Maintenance', 'Suspended']);
const VEHICLE_OPERATIONAL_STATUSES = new Set(['Available', 'Maintenance', 'Suspended']);
const PAYMENT_TYPES = new Set([
  'deposit',
  'deposit_application',
  'balance',
  'deposit_refund',
  'surcharge',
  'refund',
]);
const PAYMENT_RECORD_STATUSES = new Set(['pending', 'completed', 'void']);
const DEPOSIT_TYPES = new Set(['cash', 'motorbike']);
const DEPOSIT_STATUSES = new Set(['pending', 'received']);
const DEPOSIT_LIFECYCLE_STATES = new Set(['pending', 'received', 'returned']);

const effectiveVehicleStatusSql = (vehicleAlias = 'v') => `CASE
  WHEN EXISTS (
    SELECT 1 FROM rentals active_rental
    WHERE active_rental.car_id=${vehicleAlias}.plate_number
      AND active_rental.status='active'
  ) THEN 'Rented'
  WHEN EXISTS (
    SELECT 1 FROM rentals pending_rental
    WHERE pending_rental.car_id=${vehicleAlias}.plate_number
      AND pending_rental.status='pending'
  ) THEN 'Reserved'
  ELSE ${vehicleAlias}.operational_status
END`;
const RENTAL_SAFE_DOCUMENT_FIELDS = new Set([
  'condition_images',
  'file_url',
  'file_name',
  'source',
  'notes',
]);
const RENTAL_EDITABLE_FINANCIAL_FIELDS = new Set([
  'rental_fee',
  'delivery_fee',
  'discount_amount',
  'extra_fee',
  'violations',
]);
const RENTAL_EDITABLE_DEPOSIT_FIELDS = new Set(['deposit_status']);

class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const requireObjectBody = (req) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new ApiError(400, 'A JSON object body is required');
  }
  return req.body;
};

const firstDefined = (body, names) => {
  for (const name of names) {
    if (body[name] !== undefined) return body[name];
  }
  return undefined;
};

const optionalString = (body, names, { max = 10_000, nullable = false } = {}) => {
  const value = firstDefined(body, names);
  if (value === undefined) return undefined;
  if (nullable && value === null) return null;
  if (typeof value !== 'string') throw new ApiError(400, `${names[0]} must be a string`);
  if (value.length > max) throw new ApiError(400, `${names[0]} is too long`);
  return value;
};

const requiredString = (body, names, options) => {
  const value = optionalString(body, names, options);
  if (!value?.trim()) throw new ApiError(400, `${names[0]} is required`);
  return value.trim();
};

const optionalNumber = (body, names, { min, max, integer = false, nullable = false } = {}) => {
  const value = firstDefined(body, names);
  if (value === undefined) return undefined;
  if (nullable && (value === null || value === '')) return null;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number))) {
    throw new ApiError(400, `${names[0]} must be a valid number`);
  }
  if (min !== undefined && number < min) throw new ApiError(400, `${names[0]} is below the minimum`);
  if (max !== undefined && number > max) throw new ApiError(400, `${names[0]} exceeds the maximum`);
  return number;
};

const optionalBoolean = (body, names) => {
  const value = firstDefined(body, names);
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError(400, `${names[0]} must be a boolean`);
};

const optionalDate = (body, names, { nullable = false } = {}) => {
  const value = firstDefined(body, names);
  if (value === undefined) return undefined;
  if (nullable && (value === null || value === '')) return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new ApiError(400, `${names[0]} must be a valid date`);
  }
  return value;
};

const optionalArray = (body, names) => {
  const value = firstDefined(body, names);
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ApiError(400, `${names[0]} must be an array`);
  return value;
};

const ensureEnum = (value, allowed, field) => {
  if (value !== undefined && !allowed.has(value)) {
    throw new ApiError(400, `${field} has an invalid value`);
  }
  return value;
};

const executeQuery = (db, text, params) => (
  typeof db === 'function' ? db(text, params) : db.query(text, params)
);

const updateByFields = async (db, table, idColumn, id, fields) => {
  const keys = Object.keys(fields).filter((key) => fields[key] !== undefined);
  if (keys.length === 0) throw new ApiError(400, 'No supported fields were provided');
  const values = keys.map((key) => fields[key]);
  const assignments = keys.map((key, index) => `"${key}"=$${index + 1}`).join(', ');
  values.push(id);
  return executeQuery(
    db,
    `UPDATE ${table} SET ${assignments}, updated_at=NOW()
     WHERE ${idColumn}=$${values.length}
     RETURNING *`,
    values,
  );
};

const withTransaction = async (work) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const parsePagination = (req, values) => {
  if (req.query.page === undefined && req.query.limit === undefined) return { sql: '', meta: null };
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
  values.push(limit, (page - 1) * limit);
  return {
    sql: ` LIMIT $${values.length - 1} OFFSET $${values.length}`,
    meta: { page, limit },
  };
};

const createRateLimiter = ({ windowMs, max, keyPrefix }) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip}`;
    const current = hits.get(key);
    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ success: false, error: 'Too many requests, please try again later' });
    }
    return next();
  };
};

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin)
  .filter(Boolean);
app.locals.allowedOrigins = allowedOrigins;

const requestOrigin = (req) => normalizeOrigin(`${req.protocol}://${req.get('host')}`);
const isAllowedRequestOrigin = (req, origin) => {
  const normalized = normalizeOrigin(origin);
  return normalized !== null
    && (
      normalized === requestOrigin(req)
      || app.locals.allowedOrigins.includes(normalized)
    );
};
const csrfProtection = createCsrfProtection({
  isAllowedOrigin: isAllowedRequestOrigin,
});

app.set('trust proxy', Number.parseInt(process.env.TRUST_PROXY_HOPS || '0', 10));
app.use(cors((req, callback) => {
  const origin = req.get('origin');
  if (!origin || isAllowedRequestOrigin(req, origin)) {
    return callback(null, { credentials: true, origin: true });
  }
  return callback(new ApiError(403, 'Origin is not allowed by CORS'));
}));
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

const apiLimiter = createRateLimiter({ windowMs: 60_000, max: 300, keyPrefix: 'api' });
const loginLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'login' });
const sensitiveLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 30, keyPrefix: 'sensitive' });
const publicLookupLimiter = createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'public-lookup' });
app.use('/api', apiLimiter);
registerAuthRoutes(app, { loginLimiter, sensitiveLimiter, csrfProtection });

const publicApiPaths = new Set([
  '/health',
  '/auth/login',
  '/auth/logout',
  '/auth/me',
  '/public/vehicles/search',
]);
app.use('/api', (req, res, next) => {
  if (publicApiPaths.has(req.path)) return next();
  return requireAuth(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (publicApiPaths.has(req.path)) return next();
  return csrfProtection(req, res, next);
});

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=3600');
  },
}));

const allowedUploadTypes = new Map([
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])],
  ['image/gif', new Set(['.gif'])],
  ['application/pdf', new Set(['.pdf'])],
]);

const uploadExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const hasValidFileSignature = (mimeType, bytes) => {
  if (!Buffer.isBuffer(bytes)) return false;
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3
      && bytes[0] === 0xff
      && bytes[1] === 0xd8
      && bytes[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return bytes.length >= 8
      && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/webp') {
    return bytes.length >= 12
      && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mimeType === 'image/gif') {
    const signature = bytes.subarray(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a';
  }
  if (mimeType === 'application/pdf') {
    return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  return false;
};

const validateUploadedFileSignature = async (file) => {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const bytes = Buffer.alloc(16);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    return hasValidFileSignature(file.mimetype, bytes.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
};

const removeRejectedUpload = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error('[Upload] Failed to remove rejected file', error);
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${uploadExtensions[file.mimetype]}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedUploadTypes.get(file.mimetype)?.has(extension)) {
      return callback(new ApiError(400, 'Only JPG, PNG, WEBP, GIF and PDF files are allowed', 'INVALID_FILE_TYPE'));
    }
    return callback(null, true);
  },
});

app.post('/api/upload', sensitiveLimiter, requireRole('admin', 'operations', 'accounting', 'staff'), upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  let signatureIsValid = false;
  try {
    signatureIsValid = await validateUploadedFileSignature(req.file);
  } catch (error) {
    await removeRejectedUpload(req.file.path);
    throw error;
  }
  if (!signatureIsValid) {
    await removeRejectedUpload(req.file.path);
    throw new ApiError(
      400,
      'File content does not match its declared type',
      'INVALID_FILE_SIGNATURE',
    );
  }
  res.status(201).json({
    success: true,
    data: {
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
}));

app.get('/api/uploads', asyncRoute(async (_req, res) => {
  const files = await fs.promises.readdir(UPLOAD_DIR);
  const data = files
    .filter((file) => ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf'].includes(path.extname(file).toLowerCase()))
    .map((file) => ({ id: file, url: `/uploads/${file}`, name: file, usedIn: null }));
  res.json({ success: true, data });
}));

app.delete('/api/uploads/:filename', sensitiveLimiter, requireRole('admin'), asyncRoute(async (req, res) => {
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const extension = path.extname(safeFilename).toLowerCase();
  if (
    filename !== safeFilename
    || !/^[A-Za-z0-9._-]+$/.test(safeFilename)
    || !['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf'].includes(extension)
  ) {
    throw new ApiError(400, 'Invalid filename');
  }
  try {
    await fs.promises.unlink(path.join(UPLOAD_DIR, safeFilename));
  } catch (error) {
    if (error.code === 'ENOENT') throw new ApiError(404, 'File not found');
    throw error;
  }
  res.json({ success: true });
}));

app.get('/api/health', asyncRoute(async (_req, res) => {
  const result = await query('SELECT NOW()');
  res.json({
    status: 'ok',
    timestamp: result.rows[0].now,
    database: 'connected',
    environment: process.env.NODE_ENV || 'development',
  });
}));

app.post('/api/public/vehicles/search', publicLookupLimiter, asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const plate = optionalString(body, ['plate'], { max: 30 })?.trim() || '';
  if (!plate) throw new ApiError(400, 'A complete plate number is required');
  const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (
    normalizedPlate
    && (
      normalizedPlate.length < 6
      || normalizedPlate.length > 12
      || !/[A-Z]/.test(normalizedPlate)
      || !/\d/.test(normalizedPlate)
    )
  ) {
    throw new ApiError(400, 'A complete plate number is required');
  }
  const effectiveStatus = effectiveVehicleStatusSql('v');
  const result = await query(
    `SELECT v.plate_number, v.brand, v.model, v.year, v.color, v.seats,
            ${effectiveStatus} AS status, v.image_url
     FROM vehicles v
     WHERE regexp_replace(upper(v.plate_number), '[^A-Z0-9]', '', 'g') = $1
     ORDER BY v.plate_number
     LIMIT 1`,
    [normalizedPlate],
  );
  res.json({ success: true, data: result.rows });
}));

app.get('/api/stats', asyncRoute(async (_req, res) => {
  const effectiveStatus = effectiveVehicleStatusSql('v');
  const [vehicles, customers, activeRentals, monthlyFinance, schedule] = await Promise.all([
    query(`WITH vehicle_statuses AS (
             SELECT ${effectiveStatus} AS status
             FROM vehicles v
           )
           SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE status='Available') AS available,
                  COUNT(*) FILTER (WHERE status='Rented') AS rented
           FROM vehicle_statuses`),
    query('SELECT COUNT(*) AS total FROM customers'),
    query("SELECT COUNT(*) AS total FROM rentals WHERE status IN ('active','pending')"),
    query(
      `WITH bounds AS (
         SELECT
           date_trunc('month', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
             AT TIME ZONE 'Asia/Ho_Chi_Minh' AS start_at,
           (date_trunc('month', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') + INTERVAL '1 month')
             AT TIME ZONE 'Asia/Ho_Chi_Minh' AS end_at
       )
       SELECT
         COALESCE((
           SELECT SUM(total_amount) FROM rentals, bounds
           WHERE status='completed'
             AND returned_at >= bounds.start_at
             AND returned_at < bounds.end_at
         ),0) AS completed_revenue,
         COALESCE((
           SELECT SUM(CASE
             WHEN payment_type IN ('deposit','balance','surcharge') THEN amount
             WHEN payment_type IN ('deposit_refund','refund') THEN -amount
             ELSE 0
           END)
           FROM rental_payments, bounds
           WHERE status='completed'
             AND paid_at >= bounds.start_at
             AND paid_at < bounds.end_at
         ),0) AS cash_collected,
         COALESCE((
           SELECT SUM(amount)
           FROM rental_payments, bounds
           WHERE status='completed'
             AND payment_type='deposit_refund'
             AND paid_at >= bounds.start_at
             AND paid_at < bounds.end_at
         ),0) AS deposit_refunded,
         COALESCE((
           SELECT SUM(CASE
             WHEN payment_type='deposit' THEN amount
             WHEN payment_type IN ('deposit_refund','deposit_application') THEN -amount
             ELSE 0
           END)
           FROM rental_payments
           WHERE status='completed'
         ),0) AS deposits_held,
         (SELECT COUNT(*)
          FROM rentals
          WHERE deposit_type='motorbike'
            AND status <> 'cancelled'
            AND deposit_returned_at IS NULL) AS motorcycle_collateral_held`,
    ),
    query(
      `SELECT id, car_id, customer_name, customer_phone, status, start_date, end_date,
              CASE
                WHEN status='pending' THEN 'handover'
                WHEN status='active' THEN 'return'
              END AS event_type,
              CASE
                WHEN status='pending' THEN start_date
                WHEN status='active' THEN end_date
              END AS event_at,
              CASE
                WHEN status='pending' THEN start_date < NOW()
                WHEN status='active' THEN end_date < NOW()
              END AS overdue
       FROM rentals
       WHERE status IN ('pending','active')
       ORDER BY event_at
       LIMIT 20`,
    ),
  ]);
  res.json({
    success: true,
    data: {
      vehicles: vehicles.rows[0],
      customers: customers.rows[0],
      activeRentals: activeRentals.rows[0].total,
      monthlyRevenue: monthlyFinance.rows[0].completed_revenue,
      monthlyCashCollected: monthlyFinance.rows[0].cash_collected,
      monthlyDepositRefunded: monthlyFinance.rows[0].deposit_refunded,
      depositsHeld: monthlyFinance.rows[0].deposits_held,
      motorcycleCollateralHeld: monthlyFinance.rows[0].motorcycle_collateral_held,
      schedule: schedule.rows,
    },
  });
}));

const vehicleFields = (body) => ({
  plate_number: optionalString(body, ['plate_number', 'plateNumber'], { max: 20 }),
  brand: optionalString(body, ['brand'], { max: 50 }),
  model: optionalString(body, ['model'], { max: 50 }),
  year: optionalNumber(body, ['year'], { integer: true, min: 1900, max: 2200 }),
  color: optionalString(body, ['color'], { max: 30 }),
  seats: optionalNumber(body, ['seats'], { integer: true, min: 1, max: 100 }),
  transmission: optionalString(body, ['transmission'], { max: 20 }),
  fuel_type: optionalString(body, ['fuel_type', 'fuelType'], { max: 20 }),
  daily_rate: optionalNumber(body, ['daily_rate', 'dailyRate'], { min: 0 }),
  hourly_rate: optionalNumber(body, ['hourly_rate', 'hourlyRate'], { min: 0 }),
  weekly_rate: optionalNumber(body, ['weekly_rate', 'weeklyRate'], { min: 0 }),
  owner_id: optionalString(body, ['owner_id', 'ownerId'], { max: 50, nullable: true }),
  status: ensureEnum(
    optionalString(body, ['status'], { max: 30 }),
    VEHICLE_STATUSES,
    'status',
  ),
  current_mileage: optionalNumber(body, ['current_mileage', 'currentMileage'], { integer: true, min: 0 }),
  registration_expiry: optionalDate(body, ['registration_expiry', 'registrationExpiry'], { nullable: true }),
  insurance_expiry: optionalDate(body, ['insurance_expiry', 'insuranceExpiry'], { nullable: true }),
  license_expiry: optionalDate(body, ['license_expiry', 'licenseExpiry'], { nullable: true }),
  image_url: optionalString(body, ['image_url', 'imageUrl'], { max: 2048 }),
  gallery_urls: (() => {
    const value = firstDefined(body, ['gallery_urls', 'galleryUrls']);
    if (value === undefined) return undefined;
    return Array.isArray(value) ? JSON.stringify(value) : optionalString(body, ['gallery_urls', 'galleryUrls']);
  })(),
  notes: optionalString(body, ['notes']),
});

app.get('/api/vehicles', asyncRoute(async (_req, res) => {
  const effectiveStatus = effectiveVehicleStatusSql('v');
  const result = await query(
    `SELECT v.id, v.plate_number, v.brand, v.model, v.year, v.color, v.seats,
            v.transmission, v.fuel_type, v.daily_rate, v.hourly_rate, v.weekly_rate,
            v.owner_id, ${effectiveStatus} AS status, v.operational_status,
            v.current_mileage, v.registration_expiry, v.insurance_expiry,
            v.license_expiry, v.image_url, v.gallery_urls, v.notes,
            v.created_at, v.updated_at,
            o.name AS owner_name, o.phone AS owner_phone,
            active_rental.id AS active_rental_id,
            active_rental.customer_name AS active_customer_name,
            active_rental.customer_phone AS active_customer_phone
     FROM vehicles v
     LEFT JOIN owners o ON v.owner_id=o.id
     LEFT JOIN LATERAL (
       SELECT r.id, r.customer_name, r.customer_phone
       FROM rentals r
       WHERE r.car_id=v.plate_number AND r.status='active'
       ORDER BY r.start_date, r.created_at
       LIMIT 1
     ) active_rental ON TRUE
     ORDER BY v.created_at DESC`,
  );
  res.json({ success: true, data: result.rows });
}));

app.post('/api/vehicles', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const plate = requiredString(body, ['plate_number', 'plateNumber'], { max: 20 });
  const fields = vehicleFields(body);
  const brand = requiredString(body, ['brand'], { max: 50 });
  const model = requiredString(body, ['model'], { max: 50 });
  if (!fields.owner_id) throw new ApiError(400, 'ownerId is required');
  const requestedStatus = fields.status ?? 'Available';
  if (!VEHICLE_OPERATIONAL_STATUSES.has(requestedStatus)) {
    throw new ApiError(400, 'Reserved and Rented are controlled by rental workflow');
  }
  const result = await query(
    `INSERT INTO vehicles
       (plate_number, brand, model, year, color, seats, transmission, fuel_type,
        daily_rate, hourly_rate, weekly_rate, owner_id, status, operational_status, current_mileage,
        registration_expiry, insurance_expiry, license_expiry, image_url, gallery_urls, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [
      plate, brand, model, fields.year ?? 2024, fields.color ?? 'Trắng', fields.seats ?? 4,
      fields.transmission ?? 'Automatic', fields.fuel_type ?? 'Gasoline',
      fields.daily_rate ?? 0, fields.hourly_rate ?? 0, fields.weekly_rate ?? 0,
      fields.owner_id, requestedStatus, fields.current_mileage ?? 0,
      fields.registration_expiry ?? null, fields.insurance_expiry ?? null,
      fields.license_expiry ?? null, fields.image_url ?? '', fields.gallery_urls ?? '[]',
      fields.notes ?? '',
    ],
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

const rentalDerivedVehicleStatus = (openRentals) => {
  if (openRentals.some((rental) => rental.status === 'active')) return 'Rented';
  if (openRentals.some((rental) => rental.status === 'pending')) return 'Reserved';
  return 'Available';
};

app.put('/api/vehicles/:id', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const fields = vehicleFields(requireObjectBody(req));
  const vehicle = await withTransaction(async (client) => {
    const currentResult = await client.query(
      `SELECT id, plate_number, status, operational_status, current_mileage
       FROM vehicles
       WHERE plate_number=$1 OR id::text=$1
       FOR UPDATE`,
      [req.params.id],
    );
    if (currentResult.rowCount === 0) throw new ApiError(404, 'Vehicle not found');
    const current = currentResult.rows[0];

    if (fields.plate_number !== undefined) {
      fields.plate_number = fields.plate_number.trim().toUpperCase();
      if (!fields.plate_number) throw new ApiError(400, 'plateNumber is required');
    }

    const openRentals = await client.query(
      `SELECT status FROM rentals
       WHERE car_id=$1 AND status IN ('pending','active')`,
      [current.plate_number],
    );
    const derivedStatus = rentalDerivedVehicleStatus(openRentals.rows);

    if (fields.status !== undefined) {
      if (!VEHICLE_OPERATIONAL_STATUSES.has(fields.status)) {
        throw new ApiError(
          409,
          'Reserved and Rented are controlled by rental workflow',
          'VEHICLE_STATUS_CONFLICT',
        );
      }
      if (openRentals.rowCount > 0 && fields.status !== 'Available') {
        throw new ApiError(
          409,
          'Cancel or complete open rentals before changing operational status',
          'VEHICLE_HAS_OPEN_RENTAL',
        );
      }
      fields.operational_status = fields.status;
      fields.status = derivedStatus === 'Available' ? fields.operational_status : derivedStatus;
    }
    if (
      fields.current_mileage !== undefined
      && fields.current_mileage < Number(current.current_mileage)
    ) {
      throw new ApiError(
        409,
        'Vehicle mileage cannot decrease',
        'VEHICLE_MILEAGE_DECREASE',
      );
    }

    const keys = Object.keys(fields).filter((key) => fields[key] !== undefined);
    if (keys.length === 0) throw new ApiError(400, 'No supported fields were provided');
    const values = keys.map((key) => fields[key]);
    const assignments = keys.map((key, index) => (
      key === 'current_mileage'
        ? `"current_mileage"=GREATEST("current_mileage",$${index + 1})`
        : `"${key}"=$${index + 1}`
    )).join(', ');
    values.push(req.params.id);
    const updateResult = await client.query(
      `UPDATE vehicles SET ${assignments}, updated_at=NOW()
       WHERE plate_number=$${values.length} OR id::text=$${values.length}
       RETURNING *`,
      values,
    );
    if (fields.plate_number !== undefined && fields.plate_number !== current.plate_number) {
      await client.query(
        `UPDATE expenses
         SET ref=$1, updated_at=NOW()
         WHERE vehicle_id=$2 AND ref=$3`,
        [fields.plate_number, current.id, current.plate_number],
      );
    }
    return updateResult.rows[0];
  });
  res.json({ success: true, data: vehicle });
}));

app.delete('/api/vehicles/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const result = await query('DELETE FROM vehicles WHERE plate_number=$1 OR id::text=$1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Vehicle not found');
  res.json({ success: true });
}));

const customerFields = (body) => ({
  full_name: optionalString(body, ['full_name', 'fullName', 'name'], { max: 100 }),
  phone: optionalString(body, ['phone'], { max: 20 }),
  email: optionalString(body, ['email'], { max: 255 }),
  id_card: optionalString(body, ['id_card', 'idCard', 'cccd'], { max: 20 }),
  driver_license: optionalString(body, ['driver_license', 'driverLicense', 'license'], { max: 30 }),
  address: optionalString(body, ['address']),
  city: optionalString(body, ['city'], { max: 50 }),
  classification: optionalString(body, ['classification'], { max: 20 }),
  status: optionalString(body, ['status'], { max: 20 }),
  notes: optionalString(body, ['notes']),
  image_url: optionalString(body, ['image_url', 'imageUrl', 'image'], { max: 2048 }),
});

app.get('/api/customers', asyncRoute(async (_req, res) => {
  const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

app.post('/api/customers', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const fields = customerFields(body);
  const fullName = requiredString(body, ['full_name', 'fullName', 'name'], { max: 100 });
  const phone = requiredString(body, ['phone'], { max: 20 });
  const result = await query(
    `INSERT INTO customers
       (full_name, phone, email, id_card, driver_license, address, city,
        classification, status, notes, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      fullName, phone, fields.email ?? '', fields.id_card ?? '', fields.driver_license ?? '',
      fields.address ?? '', fields.city ?? '', fields.classification ?? 'normal',
      fields.status ?? 'Active', fields.notes ?? '', fields.image_url ?? '',
    ],
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

app.put('/api/customers/:id', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const result = await updateByFields(query, 'customers', 'id::text', req.params.id, customerFields(requireObjectBody(req)));
  if (result.rowCount === 0) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, data: result.rows[0] });
}));

app.delete('/api/customers/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const result = await query('DELETE FROM customers WHERE id::text=$1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Customer not found');
  res.json({ success: true });
}));

const ownerFields = (body) => ({
  name: optionalString(body, ['name'], { max: 100 }),
  phone: optionalString(body, ['phone'], { max: 20 }),
  email: optionalString(body, ['email'], { max: 255 }),
  address: optionalString(body, ['address']),
  id_card: optionalString(body, ['id_card', 'idCard'], { max: 20 }),
  bank_account: optionalString(body, ['bank_account', 'bankAccount'], { max: 50 }),
  bank_name: optionalString(body, ['bank_name', 'bankName'], { max: 100 }),
  commission_rate: optionalNumber(body, ['commission_rate', 'commissionRate'], { min: 0, max: 100 }),
  notes: optionalString(body, ['notes']),
  image_url: optionalString(body, ['image_url', 'imageUrl', 'image'], { max: 2048 }),
});

app.get('/api/owners', asyncRoute(async (_req, res) => {
  const result = await query('SELECT * FROM owners ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

app.post('/api/owners', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const fields = ownerFields(body);
  const name = requiredString(body, ['name'], { max: 100 });
  const phone = requiredString(body, ['phone'], { max: 20 });
  const result = await query(
    `INSERT INTO owners
       (name, phone, email, address, id_card, bank_account, bank_name, commission_rate, notes, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      name, phone, fields.email ?? '', fields.address ?? '', fields.id_card ?? '',
      fields.bank_account ?? '', fields.bank_name ?? '', fields.commission_rate ?? 0,
      fields.notes ?? '', fields.image_url ?? '',
    ],
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

app.put('/api/owners/:id', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const result = await updateByFields(query, 'owners', 'id::text', req.params.id, ownerFields(requireObjectBody(req)));
  if (result.rowCount === 0) throw new ApiError(404, 'Owner not found');
  res.json({ success: true, data: result.rows[0] });
}));

app.delete('/api/owners/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const result = await query('DELETE FROM owners WHERE id::text=$1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Owner not found');
  res.json({ success: true });
}));

const rentalFields = (body, { requireCore = false } = {}) => {
  const depositVehicle = firstDefined(body, ['depositVehicle', 'deposit_vehicle']);
  if (
    depositVehicle !== undefined
    && (depositVehicle === null || typeof depositVehicle !== 'object' || Array.isArray(depositVehicle))
  ) {
    throw new ApiError(400, 'depositVehicle must be an object');
  }
  const nestedVehicleString = (property, names, max = 10_000) => {
    const flatValue = firstDefined(body, names);
    if (flatValue !== undefined) return optionalString(body, names, { max });
    if (depositVehicle === undefined) return undefined;
    const value = depositVehicle[property];
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw new ApiError(400, `${names[0]} must be a string`);
    if (value.length > max) throw new ApiError(400, `${names[0]} is too long`);
    return value;
  };
  const fields = {
    car_id: optionalString(body, ['carId', 'car_id'], { max: 20 }),
    customer_name: optionalString(body, ['customerName', 'customer_name'], { max: 100 }),
    customer_phone: optionalString(body, ['customerPhone', 'customer_phone'], { max: 20 }),
    start_date: optionalDate(body, ['startDate', 'start_date']),
    end_date: optionalDate(body, ['endDate', 'end_date']),
    rental_fee: optionalNumber(body, ['rentalFee', 'rental_fee'], { min: 0 }),
    delivery_fee: optionalNumber(body, ['deliveryFee', 'delivery_fee'], { min: 0 }),
    deposit: optionalNumber(body, ['deposit'], { min: 0 }),
    deposit_type: ensureEnum(
      optionalString(body, ['depositType', 'deposit_type'], { max: 20 }),
      DEPOSIT_TYPES,
      'depositType',
    ),
    deposit_status: ensureEnum(
      optionalString(body, ['depositStatus', 'deposit_status'], { max: 20 }),
      DEPOSIT_STATUSES,
      'depositStatus',
    ),
    deposit_vehicle_plate: nestedVehicleString('plate', ['depositVehiclePlate', 'deposit_vehicle_plate'], 20),
    deposit_vehicle_brand: nestedVehicleString('brand', ['depositVehicleBrand', 'deposit_vehicle_brand'], 50),
    deposit_vehicle_model: nestedVehicleString('model', ['depositVehicleModel', 'deposit_vehicle_model'], 50),
    deposit_vehicle_color: nestedVehicleString('color', ['depositVehicleColor', 'deposit_vehicle_color'], 30),
    deposit_vehicle_note: nestedVehicleString('note', ['depositVehicleNote', 'deposit_vehicle_note']),
    deposit_return_note: optionalString(body, ['depositReturnNote', 'deposit_return_note']),
    discount_amount: optionalNumber(body, ['discountAmount', 'discount_amount'], { min: 0 }),
    extra_fee: optionalNumber(body, ['extraFee', 'extra_fee'], { min: 0 }),
    total_amount: optionalNumber(body, ['totalAmount', 'total_amount'], { min: 0 }),
    payment_status: ensureEnum(optionalString(body, ['paymentStatus', 'payment_status'], { max: 30 }), PAYMENT_STATUSES, 'paymentStatus'),
    status: ensureEnum(optionalString(body, ['status'], { max: 30 }), RENTAL_STATUSES, 'status'),
    start_km: optionalNumber(body, ['startKm', 'start_km'], { integer: true, min: 0 }),
    end_km: optionalNumber(body, ['endKm', 'end_km'], { integer: true, min: 0, nullable: true }),
    start_fuel: optionalString(body, ['startFuel', 'start_fuel'], { max: 20 }),
    end_fuel: optionalString(body, ['endFuel', 'end_fuel'], { max: 20, nullable: true }),
    source: ensureEnum(optionalString(body, ['source'], { max: 20 }), new Set(['system', 'uploaded']), 'source'),
    file_url: optionalString(body, ['fileUrl', 'file_url'], { max: 2048 }),
    file_name: optionalString(body, ['fileName', 'file_name'], { max: 255 }),
    owner_commission_amount: optionalNumber(body, ['ownerCommissionAmount', 'owner_commission_amount'], { min: 0 }),
    condition_images: (() => {
      const images = optionalArray(body, ['conditionImages', 'condition_images']);
      return images === undefined ? undefined : JSON.stringify(images);
    })(),
    violations: (() => {
      const violations = optionalArray(body, ['violations']);
      return violations === undefined ? undefined : JSON.stringify(violations);
    })(),
    notes: optionalString(body, ['notes']),
    delivered_at: optionalDate(body, ['deliveredAt', 'delivered_at'], { nullable: true }),
    returned_at: optionalDate(body, ['returnedAt', 'returned_at'], { nullable: true }),
    cancellation_reason: optionalString(body, ['cancellationReason', 'cancellation_reason']),
    cancelled_at: optionalDate(body, ['cancelledAt', 'cancelled_at'], { nullable: true }),
  };

  if (requireCore) {
    for (const key of ['car_id', 'customer_name', 'customer_phone', 'start_date', 'end_date']) {
      if (!fields[key]) throw new ApiError(400, `${key} is required`);
    }
  }
  return fields;
};

const lockVehicle = async (client, carId) => {
  const result = await client.query(
    `SELECT v.id, v.plate_number, v.status, v.operational_status, v.current_mileage,
            v.daily_rate, v.owner_id, COALESCE(o.commission_rate, 0) AS owner_commission_rate
     FROM vehicles v
     LEFT JOIN owners o ON o.id=v.owner_id
     WHERE v.plate_number=$1
     FOR UPDATE OF v`,
    [carId],
  );
  if (result.rowCount === 0) throw new ApiError(400, 'Vehicle does not exist');
  return result.rows[0];
};

const lockCustomer = async (client, phone) => {
  const result = await client.query('SELECT id, phone FROM customers WHERE phone=$1 FOR UPDATE', [phone]);
  if (result.rowCount === 0) throw new ApiError(400, 'Customer does not exist');
};

const assertRentalDates = (startDate, endDate) => {
  if (!Number.isFinite(Date.parse(startDate)) || !Number.isFinite(Date.parse(endDate)) || Date.parse(endDate) <= Date.parse(startDate)) {
    throw new ApiError(400, 'Rental end date must be after start date');
  }
};

const rentalsOverlap = (firstStart, firstEnd, secondStart, secondEnd) => (
  Date.parse(firstStart) < Date.parse(secondEnd)
  && Date.parse(firstEnd) > Date.parse(secondStart)
);

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const violationTotal = (violations) => parseJsonArray(violations)
  .filter((violation) => violation?.status !== 'void')
  .reduce((sum, violation) => sum + (Number(violation?.amount) || 0), 0);

const calculatePricingDays = (startDate, endDate) => (
  Math.max(1, Math.ceil((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000))
);

const calculateRentalAmounts = ({
  startDate,
  endDate,
  dailyRate,
  deliveryFee = 0,
  discountAmount = 0,
  extraFee = 0,
  violations = [],
  rentalFeeOverride,
}) => {
  const pricingDays = calculatePricingDays(startDate, endDate);
  const rentalFee = rentalFeeOverride === undefined
    ? Math.round(pricingDays * Number(dailyRate))
    : Math.round(Number(rentalFeeOverride));
  const totalAmount = Math.max(
    0,
    rentalFee
      + Number(deliveryFee)
      + Number(extraFee)
      + violationTotal(violations)
      - Number(discountAmount),
  );
  return { pricingDays, rentalFee, totalAmount };
};

const assertNoRentalOverlap = async (client, { id, carId, startDate, endDate, status }) => {
  if (!RENTAL_OPEN_STATUSES.has(status)) return;
  const result = await client.query(
    `SELECT id FROM rentals
     WHERE car_id=$1
       AND id<>$2
       AND status IN ('pending','active')
       AND $3::timestamptz < end_date
       AND $4::timestamptz > start_date
     LIMIT 1`,
    [carId, id, startDate, endDate],
  );
  if (result.rowCount > 0) {
    throw new ApiError(409, 'Khoảng thời gian đã trùng với một đơn thuê khác', 'RENTAL_OVERLAP');
  }
};

const syncCustomerCounters = async (client, phone) => {
  if (!phone) return;
  await client.query(
    `UPDATE customers
     SET active_rentals=(
           SELECT COUNT(*)::int FROM rentals
           WHERE customer_phone=$1 AND status IN ('pending','active')
         ),
         total_rentals=(
           SELECT COUNT(*)::int FROM rentals
           WHERE customer_phone=$1 AND status<>'cancelled'
         ),
         updated_at=NOW()
     WHERE phone=$1`,
    [phone],
  );
};

const syncVehicleFromRentals = async (client, carId, endKm) => {
  if (!carId) return;
  const nextRental = await client.query(
    `SELECT status FROM rentals
     WHERE car_id=$1 AND status IN ('active','pending')
     ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, start_date
     LIMIT 1`,
    [carId],
  );
  const nextStatus = nextRental.rows[0]?.status;
  const vehicleStatus = nextStatus === 'active' ? 'Rented' : nextStatus === 'pending' ? 'Reserved' : null;
  await client.query(
    `UPDATE vehicles
     SET status=CASE
           WHEN $2::text IS NOT NULL THEN $2
           ELSE operational_status
         END,
         current_mileage=GREATEST(current_mileage, COALESCE($3::int, current_mileage)),
         updated_at=NOW()
     WHERE plate_number=$1`,
    [carId, vehicleStatus, endKm ?? null],
  );
};

const createRental = async (body, userId) => withTransaction(async (client) => {
  const fields = rentalFields(body, { requireCore: true });
  const requestedRentalFee = fields.rental_fee;
  const id = optionalString(body, ['id'], { max: 50 })?.trim() || `RNT-${crypto.randomUUID()}`;
  const hasDepositInput = firstDefined(body, [
    'deposit',
    'depositType',
    'deposit_type',
    'depositVehicle',
    'deposit_vehicle',
    'depositVehiclePlate',
    'deposit_vehicle_plate',
  ]) !== undefined;
  if (fields.status !== undefined && fields.status !== 'pending') {
    throw new ApiError(409, 'New rentals must start in pending status', 'INVALID_RENTAL_TRANSITION');
  }
  fields.status = 'pending';
  fields.deposit_type ??= 'cash';
  fields.deposit_status ??= 'received';
  fields.payment_status = fields.deposit && fields.deposit > 0 ? 'deposit' : 'debt';
  fields.delivery_fee ??= 0;
  fields.deposit ??= 0;
  fields.discount_amount ??= 0;
  fields.extra_fee ??= 0;
  fields.end_km = null;
  fields.end_fuel = null;
  fields.delivered_at = null;
  fields.returned_at = null;
  fields.cancelled_at = null;
  fields.cancellation_reason = null;
  fields.start_fuel ??= 'full';
  fields.source ??= 'system';
  fields.file_url ??= '';
  fields.file_name ??= '';
  fields.deposit_vehicle_plate ??= '';
  fields.deposit_vehicle_brand ??= '';
  fields.deposit_vehicle_model ??= '';
  fields.deposit_vehicle_color ??= '';
  fields.deposit_vehicle_note ??= '';
  fields.deposit_return_note ??= '';
  fields.owner_commission_amount ??= 0;
  fields.condition_images ??= '[]';
  fields.violations ??= '[]';
  fields.notes ??= '';

  assertRentalDates(fields.start_date, fields.end_date);
  const vehicle = await lockVehicle(client, fields.car_id);
  if (['Maintenance', 'Suspended'].includes(vehicle.operational_status)) {
    throw new ApiError(409, 'Vehicle is not operational', 'VEHICLE_NOT_OPERATIONAL');
  }
  fields.start_km = Number(vehicle.current_mileage);
  const pricing = calculateRentalAmounts({
    startDate: fields.start_date,
    endDate: fields.end_date,
    dailyRate: vehicle.daily_rate,
    deliveryFee: fields.delivery_fee,
    discountAmount: fields.discount_amount,
    rentalFeeOverride: requestedRentalFee,
  });
  fields.pricing_days = pricing.pricingDays;
  fields.rental_fee = pricing.rentalFee;
  fields.total_amount = pricing.totalAmount;
  fields.owner_commission_amount = Math.round(
    pricing.rentalFee * Number(vehicle.owner_commission_rate) / 100,
  );
  await lockCustomer(client, fields.customer_phone);
  await assertNoRentalOverlap(client, {
    id,
    carId: fields.car_id,
    startDate: fields.start_date,
    endDate: fields.end_date,
    status: fields.status,
  });
  if (hasDepositInput && fields.deposit_type === 'cash' && (!fields.deposit || fields.deposit <= 0)) {
    throw new ApiError(400, 'Cash deposit amount is required', 'DEPOSIT_REQUIRED');
  }
  if (hasDepositInput && fields.deposit_type === 'motorbike' && !fields.deposit_vehicle_plate?.trim()) {
    throw new ApiError(400, 'Motorcycle collateral plate is required', 'DEPOSIT_COLLATERAL_REQUIRED');
  }
  if (fields.deposit_type === 'motorbike' && (fields.deposit ?? 0) > 0) {
    throw new ApiError(400, 'Motorcycle collateral cannot include a cash deposit', 'DEPOSIT_TYPE_CONFLICT');
  }
  if (fields.deposit_type === 'motorbike') fields.deposit = 0;
  fields.payment_status = fields.deposit && fields.deposit > 0 ? 'deposit' : 'debt';

  const keys = Object.keys(fields);
  const values = keys.map((key) => fields[key]);
  const placeholders = keys.map((_, index) => `$${index + 2}`).join(',');
  const result = await client.query(
    `INSERT INTO rentals (id, ${keys.join(',')})
     VALUES ($1, ${placeholders})
     RETURNING *`,
    [id, ...values],
  );
  if (fields.deposit > 0) {
    await client.query(
      `INSERT INTO rental_payments
         (rental_id, payment_type, amount, status, note, idempotency_key, created_by)
       VALUES ($1, 'deposit', $2, 'completed', $3, $4, $5)`,
      [
        id,
        fields.deposit,
        'Initial deposit recorded with rental',
        `rental:${id}:initial-deposit`,
        userId ?? null,
      ],
    );
  }
  await syncVehicleFromRentals(
    client,
    fields.car_id,
    fields.status === 'completed' ? fields.end_km : null,
  );
  await syncCustomerCounters(client, fields.customer_phone);
  return result.rows[0];
});

const updateRental = async (id, body) => withTransaction(async (client) => {
  const currentResult = await client.query('SELECT * FROM rentals WHERE id=$1 FOR UPDATE', [id]);
  if (currentResult.rowCount === 0) throw new ApiError(404, 'Rental not found');
  const current = currentResult.rows[0];
  const fields = rentalFields(body);

  if (fields.status !== undefined) {
    throw new ApiError(
      409,
      'Rental status can only change through handover, return, or cancel endpoints',
      'INVALID_RENTAL_TRANSITION',
    );
  }
  const providedKeys = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  if (current.status !== 'pending') {
    const unsafeKey = providedKeys.find((key) => (
      !RENTAL_SAFE_DOCUMENT_FIELDS.has(key)
      && !RENTAL_EDITABLE_DEPOSIT_FIELDS.has(key)
      && !(
        ['active', 'completed'].includes(current.status)
        && RENTAL_EDITABLE_FINANCIAL_FIELDS.has(key)
      )
    ));
    if (unsafeKey) {
      throw new ApiError(
        409,
        `Field ${unsafeKey} is immutable after handover`,
        'RENTAL_FIELD_IMMUTABLE',
      );
    }
  } else {
    const pendingAllowed = new Set([
      'car_id',
      'customer_name',
      'customer_phone',
      'start_date',
      'end_date',
      'rental_fee',
      'delivery_fee',
      'discount_amount',
      'extra_fee',
      'violations',
      ...RENTAL_EDITABLE_DEPOSIT_FIELDS,
      ...RENTAL_SAFE_DOCUMENT_FIELDS,
    ]);
    const unsafeKey = providedKeys.find((key) => !pendingAllowed.has(key));
    if (unsafeKey) {
      throw new ApiError(
        409,
        `Field ${unsafeKey} is controlled by the server or payment ledger`,
        'RENTAL_FIELD_IMMUTABLE',
      );
    }
  }
  if (providedKeys.length === 0) {
    throw new ApiError(400, 'No supported fields were provided');
  }

  const merged = {
    carId: fields.car_id ?? current.car_id,
    customerPhone: fields.customer_phone ?? current.customer_phone,
    startDate: fields.start_date ?? current.start_date,
    endDate: fields.end_date ?? current.end_date,
    status: fields.status ?? current.status,
  };
  assertRentalDates(merged.startDate, merged.endDate);

  const carIds = [...new Set([current.car_id, merged.carId])].sort();
  let targetVehicle;
  for (const carId of carIds) {
    const vehicle = await lockVehicle(client, carId);
    if (carId === merged.carId) targetVehicle = vehicle;
  }
  if (
    current.status === 'pending'
    && ['Maintenance', 'Suspended'].includes(targetVehicle.operational_status)
  ) {
    throw new ApiError(409, 'Vehicle is not operational', 'VEHICLE_NOT_OPERATIONAL');
  }
  const phones = [...new Set([current.customer_phone, merged.customerPhone])].sort();
  for (const phone of phones) await lockCustomer(client, phone);
  await assertNoRentalOverlap(client, { id, ...merged });

  const hasFinancialUpdate = providedKeys.some((key) => RENTAL_EDITABLE_FINANCIAL_FIELDS.has(key));
  if (current.status === 'pending' || hasFinancialUpdate) {
    const pricing = calculateRentalAmounts({
      startDate: merged.startDate,
      endDate: merged.endDate,
      dailyRate: targetVehicle.daily_rate,
      deliveryFee: fields.delivery_fee ?? Number(current.delivery_fee),
      discountAmount: fields.discount_amount ?? Number(current.discount_amount),
      extraFee: fields.extra_fee ?? Number(current.extra_fee),
      violations: fields.violations ?? parseJsonArray(current.violations),
      rentalFeeOverride: fields.rental_fee ?? Number(current.rental_fee),
    });
    fields.pricing_days = pricing.pricingDays;
    fields.rental_fee = pricing.rentalFee;
    fields.total_amount = pricing.totalAmount;
    fields.owner_commission_amount = Math.round(
      pricing.rentalFee * Number(targetVehicle.owner_commission_rate) / 100,
    );
    if (fields.car_id !== undefined) fields.start_km = Number(targetVehicle.current_mileage);
  }
  const result = await updateByFields(client, 'rentals', 'id', id, fields);
  for (const carId of carIds) {
    await syncVehicleFromRentals(client, carId, null);
  }
  for (const phone of phones) await syncCustomerCounters(client, phone);
  return result.rows[0];
});

const handoverRental = async (id, body) => withTransaction(async (client) => {
  const currentResult = await client.query('SELECT * FROM rentals WHERE id=$1 FOR UPDATE', [id]);
  if (currentResult.rowCount === 0) throw new ApiError(404, 'Rental not found');
  const current = currentResult.rows[0];
  if (current.status !== 'pending') {
    throw new ApiError(409, 'Only pending rentals can be handed over', 'INVALID_RENTAL_TRANSITION');
  }
  const startKm = optionalNumber(body, ['startKm', 'start_km'], { integer: true, min: 0 });
  const startFuel = requiredString(body, ['startFuel', 'start_fuel'], { max: 20 });
  const deliveredAt = optionalDate(body, ['deliveredAt', 'delivered_at']) ?? new Date().toISOString();
  if (startKm === undefined) throw new ApiError(400, 'startKm is required');
  const vehicle = await lockVehicle(client, current.car_id);
  if (['Maintenance', 'Suspended'].includes(vehicle.operational_status)) {
    throw new ApiError(409, 'Vehicle is not operational', 'VEHICLE_NOT_OPERATIONAL');
  }
  if (startKm < Number(vehicle.current_mileage)) {
    throw new ApiError(409, 'Handover mileage cannot be lower than vehicle mileage', 'VEHICLE_MILEAGE_DECREASE');
  }
  await assertNoRentalOverlap(client, {
    id,
    carId: current.car_id,
    startDate: current.start_date,
    endDate: current.end_date,
    status: 'active',
  });
  const result = await client.query(
    `UPDATE rentals
     SET status='active', start_km=$2, start_fuel=$3, delivered_at=$4, updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [id, startKm, startFuel, deliveredAt],
  );
  await syncVehicleFromRentals(client, current.car_id, startKm);
  return result.rows[0];
});

const getHeldCashDeposit = async (client, rentalId) => {
  const result = await client.query(
    `SELECT r.deposit_type,
            COALESCE(SUM(CASE
              WHEN p.status='completed' AND p.payment_type='deposit' THEN p.amount
              WHEN p.status='completed' AND p.payment_type IN ('deposit_refund','deposit_application') THEN -p.amount
              ELSE 0
            END), 0) AS held_deposit
     FROM rentals r
     LEFT JOIN rental_payments p ON p.rental_id=r.id
     WHERE r.id=$1
     GROUP BY r.id, r.deposit_type`,
    [rentalId],
  );
  if (result.rowCount === 0) throw new ApiError(404, 'Rental not found');
  return {
    depositType: result.rows[0].deposit_type || 'cash',
    heldDeposit: Number(result.rows[0].held_deposit) || 0,
  };
};

const returnRental = async (id, body, userId = null) => withTransaction(async (client) => {
  const currentResult = await client.query('SELECT * FROM rentals WHERE id=$1 FOR UPDATE', [id]);
  if (currentResult.rowCount === 0) throw new ApiError(404, 'Rental not found');
  const current = currentResult.rows[0];
  if (current.status !== 'active') {
    throw new ApiError(409, 'Only active rentals can be returned', 'INVALID_RENTAL_TRANSITION');
  }
  const endKm = optionalNumber(body, ['endKm', 'end_km'], { integer: true, min: 0 });
  const endFuel = requiredString(body, ['endFuel', 'end_fuel'], { max: 20 });
  const returnedAt = optionalDate(body, ['returnedAt', 'returned_at']) ?? new Date().toISOString();
  const extraFee = optionalNumber(body, ['extraFee', 'extra_fee'], { min: 0 }) ?? Number(current.extra_fee);
  const violations = optionalArray(body, ['violations']) ?? parseJsonArray(current.violations);
  const returnDeposit = optionalBoolean(body, ['returnDeposit', 'return_deposit', 'depositReturned', 'deposit_returned']);
  const depositReturnNote = optionalString(body, ['depositReturnNote', 'deposit_return_note'])?.trim() || '';
  if (endKm === undefined) throw new ApiError(400, 'endKm is required');
  const vehicle = await lockVehicle(client, current.car_id);
  if (endKm < Number(vehicle.current_mileage) || endKm < Number(current.start_km)) {
    throw new ApiError(409, 'Return mileage cannot be lower than current mileage', 'VEHICLE_MILEAGE_DECREASE');
  }
  const pricing = calculateRentalAmounts({
    startDate: current.start_date,
    endDate: current.end_date,
    dailyRate: vehicle.daily_rate,
    deliveryFee: current.delivery_fee,
    discountAmount: current.discount_amount,
    extraFee,
    violations,
    rentalFeeOverride: Number(current.rental_fee),
  });
  let depositReturn;
  if (returnDeposit === true) {
    depositReturn = await getHeldCashDeposit(client, id);
    if (depositReturn.depositType === 'cash' && depositReturn.heldDeposit > 0) {
      await client.query(
        `INSERT INTO rental_payments
           (rental_id, payment_type, amount, status, paid_at, note, idempotency_key, created_by)
         VALUES ($1, 'deposit_refund', $2, 'completed', $3, $4, $5, $6)`,
        [
          id,
          depositReturn.heldDeposit,
          returnedAt,
          depositReturnNote || 'Hoàn cọc cùng lúc chốt hợp đồng',
          `rental:${id}:deposit-refund-on-return`,
          userId,
        ],
      );
      await syncLegacyPaymentStatus(client, id);
    }
  }
  const result = await client.query(
    `UPDATE rentals
     SET status='completed', end_km=$2, end_fuel=$3, returned_at=$4,
         extra_fee=$5, violations=$6::jsonb, pricing_days=$7, rental_fee=$8,
         total_amount=$9, owner_commission_amount=$10,
         deposit_returned_at=CASE WHEN $11::boolean THEN $4 ELSE deposit_returned_at END,
         deposit_return_note=CASE WHEN $11::boolean AND $12 <> '' THEN $12 ELSE deposit_return_note END,
         updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [
      id,
      endKm,
      endFuel,
      returnedAt,
      extraFee,
      JSON.stringify(violations),
      pricing.pricingDays,
      pricing.rentalFee,
      pricing.totalAmount,
      Math.round(pricing.rentalFee * Number(vehicle.owner_commission_rate) / 100),
      returnDeposit === true,
      depositReturnNote,
    ],
  );
  await syncVehicleFromRentals(client, current.car_id, endKm);
  await lockCustomer(client, current.customer_phone);
  await syncCustomerCounters(client, current.customer_phone);
  return result.rows[0];
});

const updateRentalDepositState = async (id, body, userId = null) => withTransaction(async (client) => {
  const currentResult = await client.query('SELECT * FROM rentals WHERE id=$1 FOR UPDATE', [id]);
  if (currentResult.rowCount === 0) throw new ApiError(404, 'Rental not found');
  const current = currentResult.rows[0];
  const depositState = ensureEnum(
    requiredString(body, ['depositState', 'deposit_state'], { max: 20 }),
    DEPOSIT_LIFECYCLE_STATES,
    'depositState',
  );

  if (current.deposit_returned_at) {
    if (depositState === 'returned') return current;
    throw new ApiError(
      409,
      'A returned deposit cannot be moved back to an earlier state',
      'DEPOSIT_ALREADY_RETURNED',
    );
  }

  if (depositState !== 'returned') {
    const result = await client.query(
      `UPDATE rentals
       SET deposit_status=$2, updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [id, depositState],
    );
    return result.rows[0];
  }

  const returnedAt = optionalDate(body, ['returnedAt', 'returned_at']) ?? new Date().toISOString();
  const returnNote = optionalString(body, ['note', 'depositReturnNote', 'deposit_return_note'])?.trim()
    || 'Hoàn cọc thủ công';

  if ((current.deposit_type || 'cash') === 'cash') {
    const { heldDeposit } = await getHeldCashDeposit(client, id);
    if (heldDeposit > 0) {
      await client.query(
        `INSERT INTO rental_payments
           (rental_id, payment_type, amount, status, paid_at, note, idempotency_key, created_by)
         VALUES ($1, 'deposit_refund', $2, 'completed', $3, $4, $5, $6)`,
        [
          id,
          heldDeposit,
          returnedAt,
          returnNote,
          `rental:${id}:manual-deposit-refund`,
          userId,
        ],
      );
      await syncLegacyPaymentStatus(client, id);
    }
  }

  const result = await client.query(
    `UPDATE rentals
     SET deposit_status='received', deposit_returned_at=$2,
         deposit_return_note=$3, updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [id, returnedAt, returnNote],
  );
  return result.rows[0];
});

const cancelRental = async (id, body) => withTransaction(async (client) => {
  const reason = requiredString(body, ['reason', 'cancellationReason', 'cancellation_reason'], { max: 2_000 });
  const currentResult = await client.query('SELECT * FROM rentals WHERE id=$1 FOR UPDATE', [id]);
  if (currentResult.rowCount === 0) throw new ApiError(404, 'Rental not found');
  const current = currentResult.rows[0];
  if (!RENTAL_OPEN_STATUSES.has(current.status)) {
    throw new ApiError(409, 'Only pending or active rentals can be cancelled', 'INVALID_RENTAL_TRANSITION');
  }
  await lockVehicle(client, current.car_id);
  await lockCustomer(client, current.customer_phone);
  const result = await client.query(
    `UPDATE rentals
     SET status='cancelled', cancellation_reason=$2, cancelled_at=NOW(), updated_at=NOW()
     WHERE id=$1
     RETURNING *`,
    [id, reason],
  );
  await syncVehicleFromRentals(client, current.car_id, null);
  await syncCustomerCounters(client, current.customer_phone);
  return result.rows[0];
});

app.get('/api/rentals', asyncRoute(async (req, res) => {
  const values = [];
  const conditions = [];
  const status = optionalString(req.query, ['status'], { max: 30 });
  const carId = optionalString(req.query, ['carId'], { max: 20 });
  if (status) {
    values.push(status);
    conditions.push(`status=$${values.length}`);
  }
  if (carId) {
    values.push(carId);
    conditions.push(`car_id=$${values.length}`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const pagination = parsePagination(req, values);
  const result = await query(
    `SELECT * FROM rentals${where} ORDER BY created_at DESC${pagination.sql}`,
    values,
  );
  res.json({ success: true, data: result.rows, ...(pagination.meta ? { meta: pagination.meta } : {}) });
}));

app.post('/api/rentals', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const rental = await createRental(requireObjectBody(req), req.user.id);
  res.status(201).json({ success: true, data: rental });
}));

app.put('/api/rentals/:id', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const rental = await updateRental(req.params.id, requireObjectBody(req));
  res.json({ success: true, data: rental });
}));

app.put('/api/rentals/:id/deposit-state', requireRole('admin', 'operations', 'accounting', 'staff'), asyncRoute(async (req, res) => {
  const rental = await updateRentalDepositState(req.params.id, requireObjectBody(req), req.user.id);
  res.json({ success: true, data: rental });
}));

app.post('/api/rentals/:id/handover', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const rental = await handoverRental(req.params.id, requireObjectBody(req));
  res.json({ success: true, data: rental });
}));

app.post('/api/rentals/:id/return', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const rental = await returnRental(req.params.id, requireObjectBody(req), req.user.id);
  res.json({ success: true, data: rental });
}));

app.post('/api/rentals/:id/cancel', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const rental = await cancelRental(req.params.id, requireObjectBody(req));
  res.json({ success: true, data: rental });
}));

app.post('/api/rentals/:id/complete', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const rental = await returnRental(req.params.id, requireObjectBody(req), req.user.id);
  res.json({ success: true, data: rental });
}));

app.delete('/api/rentals/:id', requireRole('admin'), asyncRoute(async (_req, _res) => {
  throw new ApiError(405, 'Rentals must be cancelled to preserve history', 'RENTAL_DELETE_DISABLED');
}));

const paymentFields = (body) => ({
  payment_type: ensureEnum(
    optionalString(body, ['paymentType', 'payment_type'], { max: 30 }),
    PAYMENT_TYPES,
    'paymentType',
  ),
  amount: optionalNumber(body, ['amount'], { min: 0.01 }),
  status: ensureEnum(
    optionalString(body, ['status'], { max: 20 }),
    PAYMENT_RECORD_STATUSES,
    'status',
  ),
  paid_at: optionalDate(body, ['paidAt', 'paid_at']),
  note: optionalString(body, ['note']),
  idempotency_key: optionalString(body, ['idempotencyKey', 'idempotency_key'], { max: 100, nullable: true }),
});

const syncLegacyPaymentStatus = async (client, rentalId) => {
  const result = await client.query(
    `SELECT r.total_amount,
            COALESCE(SUM(
              CASE
                WHEN p.status <> 'completed' THEN 0
                WHEN p.payment_type IN ('balance','surcharge','deposit_application') THEN p.amount
                WHEN p.payment_type = 'refund' THEN -p.amount
                ELSE 0
              END
            ), 0) AS applied,
            COALESCE(SUM(
              CASE
                WHEN p.status = 'completed' AND p.payment_type = 'deposit' THEN p.amount
                WHEN p.status = 'completed' AND p.payment_type IN ('deposit_refund','deposit_application') THEN -p.amount
                ELSE 0
              END
            ), 0) AS held_deposit
     FROM rentals r
     LEFT JOIN rental_payments p ON p.rental_id=r.id
     WHERE r.id=$1
     GROUP BY r.id`,
    [rentalId],
  );
  if (result.rowCount === 0) throw new ApiError(404, 'Rental not found');
  const row = result.rows[0];
  const paymentStatus = Number(row.applied) >= Number(row.total_amount)
    ? 'paid'
    : Number(row.held_deposit) > 0
      ? 'deposit'
      : 'debt';
  await client.query(
    'UPDATE rentals SET payment_status=$2, updated_at=NOW() WHERE id=$1',
    [rentalId, paymentStatus],
  );
};

app.get('/api/rentals/:id/payments', requireRole('admin', 'operations', 'accounting'), asyncRoute(async (req, res) => {
  const result = await query(
    `SELECT * FROM rental_payments
     WHERE rental_id=$1
     ORDER BY paid_at, created_at`,
    [req.params.id],
  );
  res.json({ success: true, data: result.rows });
}));

app.post('/api/rentals/:id/payments', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const fields = paymentFields(body);
  fields.payment_type ??= requiredString(body, ['paymentType', 'payment_type'], { max: 30 });
  ensureEnum(fields.payment_type, PAYMENT_TYPES, 'paymentType');
  if (fields.amount === undefined) throw new ApiError(400, 'amount is required');
  fields.status ??= 'completed';
  fields.paid_at ??= new Date().toISOString();
  fields.note ??= '';
  fields.idempotency_key ??= null;
  const payment = await withTransaction(async (client) => {
    const rental = await client.query(
      'SELECT id, deposit_type FROM rentals WHERE id=$1 FOR UPDATE',
      [req.params.id],
    );
    if (rental.rowCount === 0) throw new ApiError(404, 'Rental not found');
    const depositPaymentType = ['deposit', 'deposit_application', 'deposit_refund'].includes(fields.payment_type);
    let heldDeposit = null;
    if (depositPaymentType) {
      if (rental.rows[0].deposit_type === 'motorbike') {
        throw new ApiError(409, 'Motorcycle collateral is not a cash payment', 'DEPOSIT_TYPE_CONFLICT');
      }
      if (fields.status === 'completed') {
        heldDeposit = (await getHeldCashDeposit(client, req.params.id)).heldDeposit;
        if (['deposit_application', 'deposit_refund'].includes(fields.payment_type)
          && fields.amount > heldDeposit + 0.001) {
          throw new ApiError(409, 'Deposit transaction exceeds the cash deposit currently held', 'DEPOSIT_BALANCE_EXCEEDED');
        }
      }
    }
    const result = await client.query(
      `INSERT INTO rental_payments
         (rental_id, payment_type, amount, status, paid_at, note, idempotency_key, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.params.id,
        fields.payment_type,
        fields.amount,
        fields.status,
        fields.paid_at,
        fields.note,
        fields.idempotency_key,
        req.user.id,
      ],
    );
    await syncLegacyPaymentStatus(client, req.params.id);
    if (
      fields.payment_type === 'deposit_refund'
      && fields.status === 'completed'
      && heldDeposit !== null
      && fields.amount >= heldDeposit - 0.001
    ) {
      await client.query(
        `UPDATE rentals
         SET deposit_returned_at=COALESCE(deposit_returned_at,$2),
             deposit_return_note=CASE WHEN $3 <> '' THEN $3 ELSE deposit_return_note END,
             updated_at=NOW()
         WHERE id=$1`,
        [req.params.id, fields.paid_at, fields.note],
      );
    }
    return result.rows[0];
  });
  res.status(201).json({ success: true, data: payment });
}));

const reportExpenseKindSql = (alias) => `CASE
  WHEN lower(concat_ws(' ', ${alias}.category, ${alias}.title)) LIKE '%chủ xe%'
    OR lower(concat_ws(' ', ${alias}.category, ${alias}.title)) LIKE '%chu xe%'
    OR lower(concat_ws(' ', ${alias}.category, ${alias}.title)) LIKE '%chiết khấu chủ%'
    THEN 'owner_payout'
  WHEN lower(concat_ws(' ', ${alias}.category, ${alias}.title)) LIKE '%tài xế%'
    OR lower(concat_ws(' ', ${alias}.category, ${alias}.title)) LIKE '%tai xe%'
    OR lower(concat_ws(' ', ${alias}.category, ${alias}.title)) LIKE '%hoa hồng tài%'
    THEN 'driver_payout'
  ELSE 'operating'
END`;

const reportOwnerCommissionSql = (rentalAlias, ownerAlias) => `CASE
  WHEN COALESCE(${rentalAlias}.owner_commission_amount,0) > 0
    THEN ${rentalAlias}.owner_commission_amount
  WHEN ${ownerAlias}.id IS NOT NULL AND COALESCE(${ownerAlias}.commission_rate,0) > 0
    THEN ROUND(${rentalAlias}.rental_fee * ${ownerAlias}.commission_rate / 100)
  ELSE 0
END`;

const reportDriverCommissionSql = (serviceAlias) => `CASE
  WHEN COALESCE(${serviceAlias}.driver_commission_amount,0) > 0
    THEN ${serviceAlias}.driver_commission_amount
  WHEN COALESCE(${serviceAlias}.driver_commission_rate,0) > 0
    THEN ROUND(${serviceAlias}.total_amount * ${serviceAlias}.driver_commission_rate / 100)
  ELSE 0
END`;

app.get('/api/reports/summary', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const start = optionalDate(req.query, ['start']);
  const end = optionalDate(req.query, ['end']);
  if (!start || !end) throw new ApiError(400, 'start and end are required');
  if (Date.parse(end) <= Date.parse(start)) {
    throw new ApiError(400, 'end must be after start');
  }
  const groupBy = ensureEnum(
    optionalString(req.query, ['groupBy']),
    new Set(['day', 'week', 'month']),
    'groupBy',
  ) ?? 'day';

  const expenseKind = reportExpenseKindSql('e');
  const ownerCommission = reportOwnerCommissionSql('r', 'o');
  const driverCommission = reportDriverCommissionSql('s');
  const reportResults = await Promise.allSettled([
    query(
      `WITH rental_ledgers AS (
         SELECT rental_id,
                COUNT(*) FILTER (
                  WHERE status='completed'
                    AND payment_type IN ('balance','surcharge','deposit_application','refund')
                )::int AS revenue_entries,
                COUNT(*) FILTER (
                  WHERE status='completed'
                    AND payment_type IN ('deposit','deposit_refund','deposit_application')
                )::int AS deposit_entries,
                COALESCE(SUM(CASE
                  WHEN status='completed' AND paid_at < $2::timestamptz
                    AND payment_type IN ('balance','surcharge','deposit_application') THEN amount
                  WHEN status='completed' AND paid_at < $2::timestamptz
                    AND payment_type='refund' THEN -amount
                  ELSE 0
                END),0) AS applied
         FROM rental_payments
         GROUP BY rental_id
       ), service_ledgers AS (
         SELECT service_order_id,
                COUNT(*) FILTER (WHERE status='completed')::int AS payment_entries,
                COALESCE(SUM(CASE
                  WHEN status='completed' AND paid_at < $2::timestamptz
                    AND payment_type='payment' THEN amount
                  WHEN status='completed' AND paid_at < $2::timestamptz
                    AND payment_type='refund' THEN -amount
                  ELSE 0
                END),0) AS applied
         FROM service_order_payments
         GROUP BY service_order_id
       ), completed_rentals AS (
         SELECT r.*,
                CASE
                  WHEN COALESCE(l.revenue_entries,0)=0 AND r.payment_status='paid' THEN r.total_amount
                  ELSE COALESCE(l.applied,0)
                END AS applied_revenue,
                COALESCE(l.revenue_entries,0) AS revenue_entries,
                COALESCE(l.deposit_entries,0) AS deposit_entries,
                ${ownerCommission} AS effective_owner_commission,
                COALESCE((
                  SELECT SUM(CASE
                    WHEN COALESCE(item->>'amount','')
                      ~ '^[[:space:]]*[+-]?[0-9]+([.][0-9]+)?[[:space:]]*$'
                      THEN (item->>'amount')::numeric
                    ELSE 0
                  END)
                  FROM jsonb_array_elements(
                    CASE
                      WHEN jsonb_typeof(COALESCE(r.violations,'[]'::jsonb))='array'
                        THEN COALESCE(r.violations,'[]'::jsonb)
                      ELSE '[]'::jsonb
                    END
                  ) item
                  WHERE COALESCE(item->>'status','') <> 'void'
                ),0) AS violation_amount
         FROM rentals r
         LEFT JOIN rental_ledgers l ON l.rental_id=r.id
         LEFT JOIN vehicles v ON v.plate_number=r.car_id
         LEFT JOIN owners o ON o.id=v.owner_id
         WHERE r.status='completed'
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
       ), completed_services AS (
         SELECT s.*,
                CASE
                  WHEN COALESCE(l.payment_entries,0)=0 AND s.payment_status='paid' THEN s.total_amount
                  ELSE COALESCE(l.applied,0)
                END AS applied_revenue,
                COALESCE(l.payment_entries,0) AS payment_entries,
                ${driverCommission} AS effective_driver_commission
         FROM service_orders s
         LEFT JOIN service_ledgers l ON l.service_order_id=s.id
         WHERE s.status='completed'
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
       ), scoped_rentals AS (
         SELECT * FROM completed_rentals
         WHERE COALESCE(returned_at,created_at) >= $1::timestamptz
       ), scoped_services AS (
         SELECT * FROM completed_services
         WHERE COALESCE(completed_at,created_at) >= $1::timestamptz
       ), period_expenses AS (
         SELECT e.*, ${expenseKind} AS expense_kind
         FROM expenses e
         WHERE e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
       ), expenses_to_end AS (
         SELECT e.*, ${expenseKind} AS expense_kind
         FROM expenses e
         WHERE e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
       )
       SELECT
         COALESCE((SELECT SUM(total_amount) FROM scoped_rentals),0) AS rental_revenue,
         COALESCE((SELECT SUM(total_amount) FROM scoped_services),0) AS service_revenue,
         COALESCE((SELECT SUM(rental_fee) FROM scoped_rentals),0) AS rental_fee_revenue,
         COALESCE((SELECT SUM(delivery_fee) FROM scoped_rentals),0) AS delivery_fee_revenue,
         COALESCE((SELECT SUM(extra_fee) FROM scoped_rentals),0) AS rental_extra_revenue,
         COALESCE((SELECT SUM(violation_amount) FROM scoped_rentals),0) AS violation_revenue,
         COALESCE((SELECT SUM(discount_amount) FROM scoped_rentals),0) AS discount_amount,
         COALESCE((SELECT SUM(GREATEST(total_amount-extra_fee,0)) FROM scoped_services),0) AS service_base_revenue,
         COALESCE((SELECT SUM(extra_fee) FROM scoped_services),0) AS service_extra_revenue,
         COALESCE((SELECT SUM(LEAST(total_amount,GREATEST(applied_revenue,0))) FROM scoped_rentals),0)
           + COALESCE((SELECT SUM(LEAST(total_amount,GREATEST(applied_revenue,0))) FROM scoped_services),0)
           AS collected_revenue,
         COALESCE((SELECT SUM(GREATEST(total_amount-applied_revenue,0)) FROM scoped_rentals),0)
           + COALESCE((SELECT SUM(GREATEST(total_amount-applied_revenue,0)) FROM scoped_services),0)
           AS period_receivables,
         COALESCE((SELECT SUM(GREATEST(total_amount-applied_revenue,0)) FROM completed_rentals),0)
           + COALESCE((SELECT SUM(GREATEST(total_amount-applied_revenue,0)) FROM completed_services),0)
           AS total_receivables,
         COALESCE((SELECT SUM(total_amount) FROM rentals
                   WHERE status<>'cancelled' AND start_date >= $1::timestamptz AND start_date < $2::timestamptz),0)
           + COALESCE((SELECT SUM(total_amount) FROM service_orders
                       WHERE status<>'cancelled' AND service_date >= $1::timestamptz AND service_date < $2::timestamptz),0)
           AS booked_value,
         (SELECT COUNT(*)::int FROM scoped_rentals) AS rental_orders_completed,
         (SELECT COUNT(*)::int FROM scoped_services) AS service_orders_completed,
         (SELECT COUNT(*)::int FROM rentals
          WHERE status IN ('pending','active') AND start_date < $2::timestamptz AND end_date >= $1::timestamptz)
           AS rental_orders_open,
         (SELECT COUNT(*)::int FROM service_orders
          WHERE status IN ('scheduled','ongoing') AND service_date < $2::timestamptz
            AND COALESCE(scheduled_end_at,service_date + interval '1 hour') >= $1::timestamptz)
           AS service_orders_open,
         COALESCE((SELECT SUM(amount) FROM rental_payments
                   WHERE status='completed' AND payment_type IN ('deposit','balance','surcharge')
                     AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
           + COALESCE((SELECT SUM(amount) FROM service_order_payments
                       WHERE status='completed' AND payment_type='payment'
                         AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
           + COALESCE((SELECT SUM(total_amount) FROM scoped_rentals
                       WHERE revenue_entries=0 AND payment_status='paid'),0)
           + COALESCE((SELECT SUM(total_amount) FROM scoped_services
                       WHERE payment_entries=0 AND payment_status='paid'),0)
           + COALESCE((SELECT SUM(r.deposit) FROM rentals r
                       LEFT JOIN rental_ledgers l ON l.rental_id=r.id
                       WHERE COALESCE(l.deposit_entries,0)=0
                         AND r.deposit_type='cash' AND r.deposit_status='received' AND r.deposit>0
                         AND r.created_at >= $1::timestamptz AND r.created_at < $2::timestamptz),0)
           AS cash_received,
         COALESCE((SELECT SUM(amount) FROM rental_payments
                   WHERE status='completed' AND payment_type='refund'
                     AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
           + COALESCE((SELECT SUM(amount) FROM service_order_payments
                       WHERE status='completed' AND payment_type='refund'
                         AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
           AS customer_refunds,
         COALESCE((SELECT SUM(amount) FROM rental_payments
                   WHERE status='completed' AND payment_type='deposit'
                     AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
           + COALESCE((SELECT SUM(r.deposit) FROM rentals r
                       LEFT JOIN rental_ledgers l ON l.rental_id=r.id
                       WHERE COALESCE(l.deposit_entries,0)=0
                         AND r.deposit_type='cash' AND r.deposit_status='received' AND r.deposit>0
                         AND r.created_at >= $1::timestamptz AND r.created_at < $2::timestamptz),0)
           AS deposit_received,
         COALESCE((SELECT SUM(amount) FROM rental_payments
                   WHERE status='completed' AND payment_type='deposit_refund'
                     AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
           + COALESCE((SELECT SUM(r.deposit) FROM rentals r
                       LEFT JOIN rental_ledgers l ON l.rental_id=r.id
                       WHERE COALESCE(l.deposit_entries,0)=0
                         AND r.deposit_type='cash' AND r.deposit>0
                         AND r.deposit_returned_at >= $1::timestamptz
                         AND r.deposit_returned_at < $2::timestamptz),0)
           AS deposit_refunded,
         GREATEST(0,
           COALESCE((SELECT SUM(CASE
             WHEN status='completed' AND payment_type='deposit' AND paid_at < $2::timestamptz THEN amount
             WHEN status='completed' AND payment_type IN ('deposit_refund','deposit_application')
               AND paid_at < $2::timestamptz THEN -amount
             ELSE 0 END) FROM rental_payments),0)
           + COALESCE((SELECT SUM(r.deposit) FROM rentals r
                       LEFT JOIN rental_ledgers l ON l.rental_id=r.id
                       WHERE COALESCE(l.deposit_entries,0)=0
                         AND r.deposit_type='cash' AND r.deposit_status='received' AND r.deposit>0
                         AND r.created_at < $2::timestamptz
                         AND (r.deposit_returned_at IS NULL OR r.deposit_returned_at >= $2::timestamptz)),0)
         ) AS deposits_held,
         COALESCE((SELECT COUNT(*) FROM rentals
                   WHERE deposit_type='motorbike' AND deposit_status='received'
                     AND created_at < $2::timestamptz
                     AND (deposit_returned_at IS NULL OR deposit_returned_at >= $2::timestamptz)),0)
           AS motorcycle_collateral_held,
         COALESCE((SELECT SUM(amount) FROM period_expenses WHERE expense_kind='operating'),0)
           AS operating_expenses,
         COALESCE((SELECT SUM(amount) FROM period_expenses),0) AS expense_cash_out,
         COALESCE((SELECT SUM(amount) FROM period_expenses WHERE expense_kind='owner_payout'),0)
           AS owner_manual_payouts,
         COALESCE((SELECT SUM(amount) FROM period_expenses WHERE expense_kind='driver_payout'),0)
           AS driver_manual_payouts,
         COALESCE((SELECT SUM(effective_owner_commission) FROM scoped_rentals),0) AS owner_commissions,
         COALESCE((SELECT SUM(effective_driver_commission) FROM scoped_services),0) AS driver_commissions,
         COALESCE((SELECT SUM(total_amount) FROM owner_payouts
                   WHERE status='confirmed' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
           AS owner_payouts_confirmed,
         COALESCE((SELECT SUM(total_amount) FROM owner_payouts
                   WHERE status='draft' AND created_at < $2::timestamptz),0) AS owner_payouts_draft,
         GREATEST(0,
           COALESCE((SELECT SUM(effective_owner_commission) FROM completed_rentals),0)
           - COALESCE((SELECT SUM(total_amount) FROM owner_payouts
                       WHERE status='confirmed' AND paid_at < $2::timestamptz),0)
           - COALESCE((SELECT SUM(amount) FROM expenses_to_end WHERE expense_kind='owner_payout'),0)
         ) AS owner_payables,
         GREATEST(0,
           COALESCE((SELECT SUM(effective_driver_commission) FROM completed_services),0)
           - COALESCE((SELECT SUM(amount) FROM expenses_to_end WHERE expense_kind='driver_payout'),0)
         ) AS driver_payables
       `,
      [start, end],
    ),
    query(
      `WITH rental_ledger_presence AS (
         SELECT rental_id,
                COUNT(*) FILTER (WHERE status='completed'
                  AND payment_type IN ('balance','surcharge','deposit_application','refund'))::int AS revenue_entries,
                COUNT(*) FILTER (WHERE status='completed'
                  AND payment_type IN ('deposit','deposit_refund','deposit_application'))::int AS deposit_entries
         FROM rental_payments GROUP BY rental_id
       ), service_ledger_presence AS (
         SELECT service_order_id, COUNT(*) FILTER (WHERE status='completed')::int AS payment_entries
         FROM service_order_payments GROUP BY service_order_id
       ), bounds AS (
         SELECT ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh') AS start_local,
                ($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh') AS end_local
       ), buckets AS (
         SELECT generate_series(
           date_trunc($3::text,start_local),
           date_trunc($3::text,end_local - interval '1 microsecond'),
           CASE $3::text WHEN 'month' THEN interval '1 month'
                   WHEN 'week' THEN interval '1 week'
                   ELSE interval '1 day' END
         ) AS bucket
         FROM bounds
       ), events AS (
         SELECT date_trunc($3::text,COALESCE(r.returned_at,r.created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS bucket,
                SUM(r.total_amount) AS revenue, SUM(r.total_amount) AS rental_revenue,
                0::numeric AS service_revenue, 0::numeric AS operating_expenses,
                SUM(${ownerCommission}) AS owner_commissions,
                0::numeric AS driver_commissions, 0::numeric AS cash_received,
                0::numeric AS customer_refunds, 0::numeric AS deposit_refunded,
                0::numeric AS expense_cash_out, 0::numeric AS owner_payouts
         FROM rentals r
         LEFT JOIN vehicles v ON v.plate_number=r.car_id
         LEFT JOIN owners o ON o.id=v.owner_id
         WHERE r.status='completed' AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,COALESCE(s.completed_at,s.created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                SUM(s.total_amount),0::numeric,SUM(s.total_amount),0::numeric,0::numeric,
                SUM(${driverCommission}),0::numeric,0::numeric,0::numeric,0::numeric,0::numeric
         FROM service_orders s
         WHERE s.status='completed' AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,e.expense_date::timestamp),0::numeric,0::numeric,0::numeric,
                SUM(e.amount) FILTER (WHERE ${expenseKind}='operating'),0::numeric,0::numeric,
                0::numeric,0::numeric,0::numeric,SUM(e.amount),0::numeric
         FROM expenses e
         WHERE e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,p.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,
                0::numeric,0::numeric,0::numeric,0::numeric,SUM(p.total_amount)
         FROM owner_payouts p
         WHERE p.status='confirmed' AND p.paid_at >= $1::timestamptz AND p.paid_at < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,p.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,
                SUM(CASE WHEN p.payment_type IN ('deposit','balance','surcharge') THEN p.amount ELSE 0 END),
                SUM(CASE WHEN p.payment_type='refund' THEN p.amount ELSE 0 END),
                SUM(CASE WHEN p.payment_type='deposit_refund' THEN p.amount ELSE 0 END),
                0::numeric,0::numeric
         FROM rental_payments p
         WHERE p.status='completed' AND p.paid_at >= $1::timestamptz AND p.paid_at < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,p.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,
                SUM(CASE WHEN p.payment_type='payment' THEN p.amount ELSE 0 END),
                SUM(CASE WHEN p.payment_type='refund' THEN p.amount ELSE 0 END),
                0::numeric,0::numeric,0::numeric,0::numeric
         FROM service_order_payments p
         WHERE p.status='completed' AND p.paid_at >= $1::timestamptz AND p.paid_at < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,COALESCE(r.returned_at,r.created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,
                SUM(r.total_amount),0::numeric,0::numeric,0::numeric,0::numeric
         FROM rentals r
         LEFT JOIN rental_ledger_presence l ON l.rental_id=r.id
         WHERE r.status='completed' AND r.payment_status='paid' AND COALESCE(l.revenue_entries,0)=0
           AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,COALESCE(s.completed_at,s.created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,
                SUM(s.total_amount),0::numeric,0::numeric,0::numeric,0::numeric
         FROM service_orders s
         LEFT JOIN service_ledger_presence l ON l.service_order_id=s.id
         WHERE s.status='completed' AND s.payment_status='paid' AND COALESCE(l.payment_entries,0)=0
           AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,
                SUM(r.deposit),0::numeric,0::numeric,0::numeric,0::numeric
         FROM rentals r
         LEFT JOIN rental_ledger_presence l ON l.rental_id=r.id
         WHERE COALESCE(l.deposit_entries,0)=0 AND r.deposit_type='cash'
           AND r.deposit_status='received' AND r.deposit>0
           AND r.created_at >= $1::timestamptz AND r.created_at < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3::text,r.deposit_returned_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,
                0::numeric,0::numeric,SUM(r.deposit),0::numeric,0::numeric
         FROM rentals r
         LEFT JOIN rental_ledger_presence l ON l.rental_id=r.id
         WHERE COALESCE(l.deposit_entries,0)=0 AND r.deposit_type='cash' AND r.deposit>0
           AND r.deposit_returned_at >= $1::timestamptz AND r.deposit_returned_at < $2::timestamptz
         GROUP BY 1
       ), totals AS (
         SELECT bucket,
                COALESCE(SUM(revenue),0) AS revenue,
                COALESCE(SUM(rental_revenue),0) AS rental_revenue,
                COALESCE(SUM(service_revenue),0) AS service_revenue,
                COALESCE(SUM(operating_expenses),0) AS operating_expenses,
                COALESCE(SUM(owner_commissions),0) AS owner_commissions,
                COALESCE(SUM(driver_commissions),0) AS driver_commissions,
                COALESCE(SUM(cash_received),0) AS cash_received,
                COALESCE(SUM(customer_refunds),0) AS customer_refunds,
                COALESCE(SUM(deposit_refunded),0) AS deposit_refunded,
                COALESCE(SUM(expense_cash_out),0) AS expense_cash_out,
                COALESCE(SUM(owner_payouts),0) AS owner_payouts
         FROM events GROUP BY bucket
       )
       SELECT b.bucket,
              COALESCE(t.revenue,0) AS revenue,
              COALESCE(t.rental_revenue,0) AS rental_revenue,
              COALESCE(t.service_revenue,0) AS service_revenue,
              COALESCE(t.operating_expenses,0) AS operating_expenses,
              COALESCE(t.owner_commissions,0) AS owner_commissions,
              COALESCE(t.driver_commissions,0) AS driver_commissions,
              COALESCE(t.cash_received,0) AS cash_received,
              COALESCE(t.customer_refunds,0) AS customer_refunds,
              COALESCE(t.deposit_refunded,0) AS deposit_refunded,
              COALESCE(t.expense_cash_out,0) AS expense_cash_out,
              COALESCE(t.owner_payouts,0) AS owner_payouts
       FROM buckets b LEFT JOIN totals t ON t.bucket=b.bucket
       ORDER BY b.bucket`,
      [start, end, groupBy],
    ),
    query(
      `WITH cost_rows AS (
         SELECT COALESCE(NULLIF(e.category,''),'Khác') AS category, SUM(e.amount) AS amount
         FROM expenses e
         WHERE ${expenseKind}='operating'
           AND e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY COALESCE(NULLIF(e.category,''),'Khác')
         UNION ALL
         SELECT 'Chiết khấu chủ xe phải trả', COALESCE(SUM(${ownerCommission}),0)
         FROM rentals r
         LEFT JOIN vehicles v ON v.plate_number=r.car_id
         LEFT JOIN owners o ON o.id=v.owner_id
         WHERE r.status='completed' AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
         UNION ALL
         SELECT 'Hoa hồng tài xế phải trả', COALESCE(SUM(${driverCommission}),0)
         FROM service_orders s
         WHERE s.status='completed' AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
       )
       SELECT category, SUM(amount) AS amount
       FROM cost_rows GROUP BY category HAVING SUM(amount) <> 0
       ORDER BY amount DESC`,
      [start, end],
    ),
    query(
      `WITH cash_rows AS (
         SELECT COALESCE(NULLIF(e.category,''),'Chi phí khác') AS category, SUM(e.amount) AS amount
         FROM expenses e
         WHERE e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY COALESCE(NULLIF(e.category,''),'Chi phí khác')
         UNION ALL
         SELECT 'Payout chủ xe đã xác nhận', COALESCE(SUM(total_amount),0)
         FROM owner_payouts WHERE status='confirmed'
           AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         UNION ALL
         SELECT 'Hoàn doanh thu cho khách',
                COALESCE((SELECT SUM(amount) FROM rental_payments WHERE status='completed'
                  AND payment_type='refund' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
                + COALESCE((SELECT SUM(amount) FROM service_order_payments WHERE status='completed'
                  AND payment_type='refund' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
         UNION ALL
         SELECT 'Hoàn tiền cọc',
                COALESCE((SELECT SUM(amount) FROM rental_payments
                  WHERE status='completed' AND payment_type='deposit_refund'
                    AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz),0)
                + COALESCE((SELECT SUM(r.deposit) FROM rentals r
                  WHERE r.deposit_type='cash' AND r.deposit>0
                    AND r.deposit_returned_at >= $1::timestamptz
                    AND r.deposit_returned_at < $2::timestamptz
                    AND NOT EXISTS (SELECT 1 FROM rental_payments p
                      WHERE p.rental_id=r.id AND p.status='completed'
                        AND p.payment_type IN ('deposit','deposit_refund','deposit_application'))),0)
       )
       SELECT category, SUM(amount) AS amount FROM cash_rows
       GROUP BY category HAVING SUM(amount) <> 0 ORDER BY amount DESC`,
      [start, end],
    ),
    query(
      `WITH rental_metrics AS (
         SELECT r.car_id,
                COALESCE(SUM(r.total_amount),0) AS rental_revenue,
                COALESCE(SUM(${ownerCommission}),0) AS owner_commissions,
                COUNT(*)::int AS rental_count,
                COALESCE(SUM(EXTRACT(EPOCH FROM (
                  LEAST(COALESCE(r.returned_at,r.end_date),$2::timestamptz)
                  - GREATEST(COALESCE(r.delivered_at,r.start_date),$1::timestamptz)
                ))/3600) FILTER (WHERE COALESCE(r.delivered_at,r.start_date) < $2::timestamptz
                  AND COALESCE(r.returned_at,r.end_date) > $1::timestamptz),0) AS utilized_hours
         FROM rentals r
         LEFT JOIN vehicles v ON v.plate_number=r.car_id
         LEFT JOIN owners o ON o.id=v.owner_id
         WHERE r.status='completed' AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
         GROUP BY r.car_id
       ), utilization AS (
         SELECT r.car_id,
                COALESCE(SUM(EXTRACT(EPOCH FROM (
                  LEAST(COALESCE(r.returned_at,r.end_date),$2::timestamptz)
                  - GREATEST(COALESCE(r.delivered_at,r.start_date),$1::timestamptz)
                ))/3600),0) AS utilized_hours
         FROM rentals r
         WHERE r.status IN ('active','completed')
           AND COALESCE(r.delivered_at,r.start_date) < $2::timestamptz
           AND COALESCE(r.returned_at,r.end_date) > $1::timestamptz
         GROUP BY r.car_id
       ), service_metrics AS (
         SELECT s.car_id, COALESCE(SUM(s.total_amount),0) AS service_revenue,
                COALESCE(SUM(${driverCommission}),0) AS driver_commissions,
                COUNT(*)::int AS service_count
         FROM service_orders s
         WHERE s.status='completed' AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
         GROUP BY s.car_id
       ), expense_metrics AS (
         SELECT v.id AS vehicle_id, COALESCE(SUM(e.amount),0) AS operating_expenses
         FROM vehicles v LEFT JOIN expenses e ON (e.vehicle_id::text=v.id::text OR e.ref=v.plate_number)
           AND ${expenseKind}='operating'
           AND e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY v.id
       )
       SELECT v.plate_number AS id, concat_ws(' ',v.brand,v.model) AS name,
              COALESCE(r.rental_revenue,0)+COALESCE(s.service_revenue,0) AS revenue,
              COALESCE(e.operating_expenses,0) AS operating_expenses,
              COALESCE(r.owner_commissions,0) AS owner_commissions,
              COALESCE(s.driver_commissions,0) AS driver_commissions,
              COALESCE(r.rental_count,0) AS rental_count,
              COALESCE(s.service_count,0) AS service_count,
              COALESCE(u.utilized_hours,0) AS utilized_hours,
              LEAST(100,ROUND((COALESCE(u.utilized_hours,0)
                / NULLIF(EXTRACT(EPOCH FROM ($2::timestamptz-$1::timestamptz))/3600,0)*100)::numeric,1))
                AS utilization_rate
       FROM vehicles v
       LEFT JOIN rental_metrics r ON r.car_id=v.plate_number
       LEFT JOIN utilization u ON u.car_id=v.plate_number
       LEFT JOIN service_metrics s ON s.car_id=v.plate_number
       LEFT JOIN expense_metrics e ON e.vehicle_id=v.id
       ORDER BY revenue DESC,v.plate_number`,
      [start, end],
    ),
    query(
      `WITH customer_rows AS (
         SELECT r.customer_name AS name,r.customer_phone AS phone,COUNT(*) AS orders,SUM(r.total_amount) AS revenue
         FROM rentals r WHERE r.status='completed'
           AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
         GROUP BY r.customer_name,r.customer_phone
         UNION ALL
         SELECT NULLIF(s.customer_name,''),NULLIF(s.customer_phone,''),COUNT(*),SUM(s.total_amount)
         FROM service_orders s WHERE s.status='completed'
           AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
         GROUP BY s.customer_name,s.customer_phone
       )
       SELECT COALESCE(name,'Khách lẻ') AS name,COALESCE(phone,'') AS phone,
              SUM(orders)::int AS orders,SUM(revenue) AS revenue
       FROM customer_rows GROUP BY name,phone ORDER BY revenue DESC,orders DESC LIMIT 8`,
      [start, end],
    ),
    query(
      `WITH vehicle_statuses AS (
         SELECT ${effectiveVehicleStatusSql('v')} AS status FROM vehicles v
       )
       SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='Available')::int AS available,
              COUNT(*) FILTER (WHERE status='Reserved')::int AS reserved,
              COUNT(*) FILTER (WHERE status='Rented')::int AS rented,
              COUNT(*) FILTER (WHERE status='Maintenance')::int AS maintenance,
              COUNT(*) FILTER (WHERE status='Suspended')::int AS suspended
       FROM vehicle_statuses`,
    ),
    query(
      `WITH vehicle_counts AS (
         SELECT owner_id,COUNT(*)::int AS vehicle_count FROM vehicles WHERE owner_id IS NOT NULL GROUP BY owner_id
       ), period_accrual AS (
         SELECT v.owner_id,SUM(${ownerCommission}) AS amount,COUNT(*)::int AS rental_count
         FROM rentals r JOIN vehicles v ON v.plate_number=r.car_id
         JOIN owners o ON o.id=v.owner_id
         WHERE v.owner_id IS NOT NULL AND r.status='completed'
           AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
         GROUP BY v.owner_id
       ), total_accrual AS (
         SELECT v.owner_id,SUM(${ownerCommission}) AS amount
         FROM rentals r JOIN vehicles v ON v.plate_number=r.car_id
         JOIN owners o ON o.id=v.owner_id
         WHERE v.owner_id IS NOT NULL AND r.status='completed'
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
         GROUP BY v.owner_id
       ), period_payout AS (
         SELECT owner_id,SUM(total_amount) AS amount FROM owner_payouts
         WHERE status='confirmed' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz GROUP BY owner_id
       ), total_payout AS (
         SELECT owner_id,SUM(total_amount) AS amount FROM owner_payouts
         WHERE status='confirmed' AND paid_at < $2::timestamptz GROUP BY owner_id
       ), drafts AS (
         SELECT owner_id,SUM(total_amount) AS amount FROM owner_payouts
         WHERE status='draft' AND created_at < $2::timestamptz GROUP BY owner_id
       ), period_manual AS (
         SELECT o.id AS owner_id,SUM(e.amount) AS amount
         FROM owners o JOIN expenses e ON ${expenseKind}='owner_payout'
           AND (EXISTS (SELECT 1 FROM vehicles v WHERE v.owner_id=o.id AND e.ref=v.plate_number)
             OR lower(e.title) LIKE '%'||lower(o.name)||'%')
         WHERE e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY o.id
       ), total_manual AS (
         SELECT o.id AS owner_id,SUM(e.amount) AS amount
         FROM owners o JOIN expenses e ON ${expenseKind}='owner_payout'
           AND (EXISTS (SELECT 1 FROM vehicles v WHERE v.owner_id=o.id AND e.ref=v.plate_number)
             OR lower(e.title) LIKE '%'||lower(o.name)||'%')
         WHERE e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY o.id
       )
       SELECT o.id,o.name,COALESCE(v.vehicle_count,0) AS vehicle_count,
              COALESCE(a.rental_count,0) AS rental_count,
              COALESCE(a.amount,0) AS accrued,
              COALESCE(p.amount,0)+COALESCE(pm.amount,0) AS paid,
              COALESCE(d.amount,0) AS draft,
              GREATEST(0,COALESCE(t.amount,0)-COALESCE(tp.amount,0)-COALESCE(tm.amount,0)) AS outstanding
       FROM owners o
       LEFT JOIN vehicle_counts v ON v.owner_id=o.id
       LEFT JOIN period_accrual a ON a.owner_id=o.id
       LEFT JOIN total_accrual t ON t.owner_id=o.id
       LEFT JOIN period_payout p ON p.owner_id=o.id
       LEFT JOIN total_payout tp ON tp.owner_id=o.id
       LEFT JOIN drafts d ON d.owner_id=o.id
       LEFT JOIN period_manual pm ON pm.owner_id=o.id
       LEFT JOIN total_manual tm ON tm.owner_id=o.id
       WHERE COALESCE(a.amount,0)<>0 OR COALESCE(p.amount,0)<>0 OR COALESCE(pm.amount,0)<>0
          OR COALESCE(d.amount,0)<>0 OR GREATEST(0,COALESCE(t.amount,0)-COALESCE(tp.amount,0)-COALESCE(tm.amount,0))<>0
       ORDER BY outstanding DESC,accrued DESC,o.name`,
      [start, end],
    ),
    query(
      `WITH period_accrual AS (
         SELECT COALESCE(s.driver_id,'') AS driver_id,
                COALESCE(NULLIF(MAX(s.driver_name),''),'Chưa gán tài xế') AS driver_name,
                COUNT(*)::int AS service_count,SUM(${driverCommission}) AS amount
         FROM service_orders s WHERE s.status='completed'
           AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
         GROUP BY COALESCE(s.driver_id,'')
       ), total_accrual AS (
         SELECT COALESCE(s.driver_id,'') AS driver_id,SUM(${driverCommission}) AS amount
         FROM service_orders s WHERE s.status='completed'
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
         GROUP BY COALESCE(s.driver_id,'')
       ), period_manual AS (
         SELECT d.id AS driver_id,SUM(e.amount) AS amount
         FROM drivers d JOIN expenses e ON ${expenseKind}='driver_payout'
           AND (e.ref=d.id OR lower(e.title) LIKE '%'||lower(d.name)||'%')
         WHERE e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY d.id
       ), total_manual AS (
         SELECT d.id AS driver_id,SUM(e.amount) AS amount
         FROM drivers d JOIN expenses e ON ${expenseKind}='driver_payout'
           AND (e.ref=d.id OR lower(e.title) LIKE '%'||lower(d.name)||'%')
         WHERE e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY d.id
       ), driver_ids AS (
         SELECT driver_id FROM period_accrual UNION SELECT driver_id FROM total_accrual
         UNION SELECT driver_id FROM period_manual UNION SELECT driver_id FROM total_manual
       )
       SELECT ids.driver_id AS id,COALESCE(d.name,a.driver_name,'Chưa gán tài xế') AS name,
              COALESCE(a.service_count,0) AS service_count,COALESCE(a.amount,0) AS accrued,
              COALESCE(pm.amount,0) AS paid,
              GREATEST(0,COALESCE(t.amount,0)-COALESCE(tm.amount,0)) AS outstanding
       FROM driver_ids ids
       LEFT JOIN drivers d ON d.id=ids.driver_id
       LEFT JOIN period_accrual a ON a.driver_id=ids.driver_id
       LEFT JOIN total_accrual t ON t.driver_id=ids.driver_id
       LEFT JOIN period_manual pm ON pm.driver_id=ids.driver_id
       LEFT JOIN total_manual tm ON tm.driver_id=ids.driver_id
       WHERE COALESCE(a.amount,0)<>0 OR COALESCE(pm.amount,0)<>0
          OR GREATEST(0,COALESCE(t.amount,0)-COALESCE(tm.amount,0))<>0
       ORDER BY outstanding DESC,accrued DESC,name`,
      [start, end],
    ),
    query(
      `SELECT
         (SELECT COUNT(*)::int FROM rentals r WHERE r.status='completed'
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
           AND NOT EXISTS (SELECT 1 FROM rental_payments p WHERE p.rental_id=r.id))
           AS legacy_rentals_without_ledger,
         (SELECT COUNT(*)::int FROM service_orders s WHERE s.status='completed'
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
           AND NOT EXISTS (SELECT 1 FROM service_order_payments p WHERE p.service_order_id=s.id))
           AS legacy_services_without_ledger,
         (SELECT COUNT(*)::int FROM rentals r JOIN vehicles v ON v.plate_number=r.car_id
           JOIN owners o ON o.id=v.owner_id
           WHERE r.status='completed' AND o.commission_rate>0 AND r.owner_commission_amount=0
             AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
             AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz)
           AS missing_owner_commissions,
         (SELECT COUNT(*)::int FROM service_orders s
           WHERE s.status='completed' AND s.driver_commission_rate>0 AND s.driver_commission_amount=0
             AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
             AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz)
           AS missing_driver_commissions,
         (SELECT COUNT(*)::int FROM owner_payouts p WHERE p.status='draft' AND p.created_at < $2::timestamptz)
           AS draft_owner_payouts,
         (SELECT COUNT(*)::int FROM expenses e WHERE ${expenseKind} IN ('owner_payout','driver_payout')
           AND e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date))
           AS manual_partner_payouts`,
      [start, end],
    ),
  ]);

  const reportSectionNames = [
    'overview',
    'series',
    'expense_breakdown',
    'cash_out_breakdown',
    'vehicles',
    'customers',
    'fleet',
    'owners',
    'drivers',
    'data_quality',
  ];
  const failedReportSections = reportResults
    .map((result, index) => ({ result, name: reportSectionNames[index] }))
    .filter(({ result }) => result.status === 'rejected');

  failedReportSections.forEach(({ result, name }) => {
    console.error(`[Reports] Query section "${name}" failed`, result.reason);
  });

  if (reportResults[0].status === 'rejected') throw reportResults[0].reason;

  const emptyReportResult = { rows: [], rowCount: 0 };
  const reportResult = (index) => (
    reportResults[index].status === 'fulfilled'
      ? reportResults[index].value
      : emptyReportResult
  );
  const overview = reportResult(0);
  const series = reportResult(1);
  const expenseBreakdown = reportResult(2);
  const cashOutBreakdown = reportResult(3);
  const vehicles = reportResult(4);
  const customers = reportResult(5);
  const fleet = reportResult(6);
  const owners = reportResult(7);
  const drivers = reportResult(8);
  const dataQuality = reportResult(9);

  const row = overview.rows[0] || {};
  const number = (value) => Number(value) || 0;
  const rentalRevenue = number(row.rental_revenue);
  const serviceRevenue = number(row.service_revenue);
  const revenue = rentalRevenue + serviceRevenue;
  const operatingExpenses = number(row.operating_expenses);
  const ownerCommissions = number(row.owner_commissions);
  const driverCommissions = number(row.driver_commissions);
  const totalCosts = operatingExpenses + ownerCommissions + driverCommissions;
  const profit = revenue - totalCosts;
  const cashReceived = number(row.cash_received);
  const customerRefunds = number(row.customer_refunds);
  const depositRefunded = number(row.deposit_refunded);
  const expenseCashOut = number(row.expense_cash_out);
  const ownerPayoutsConfirmed = number(row.owner_payouts_confirmed);
  const cashOut = customerRefunds + depositRefunded + expenseCashOut + ownerPayoutsConfirmed;

  const fleetRow = fleet.rows[0] || {};
  const normalizeMoneyRows = (rows) => rows.map((item) => ({
    category: item.category || 'Khác',
    amount: number(item.amount),
  }));

  res.json({
    success: true,
    data: {
      period: { start, end, group_by: groupBy },
      summary: {
        booked_value: number(row.booked_value),
        revenue,
        rental_revenue: rentalRevenue,
        service_revenue: serviceRevenue,
        rental_fee_revenue: number(row.rental_fee_revenue),
        delivery_fee_revenue: number(row.delivery_fee_revenue),
        rental_extra_revenue: number(row.rental_extra_revenue),
        violation_revenue: number(row.violation_revenue),
        discount_amount: number(row.discount_amount),
        service_base_revenue: number(row.service_base_revenue),
        service_extra_revenue: number(row.service_extra_revenue),
        collected_revenue: number(row.collected_revenue),
        period_receivables: number(row.period_receivables),
        total_receivables: number(row.total_receivables),
        receivables: number(row.total_receivables),
        cash_received: cashReceived,
        customer_refunds: customerRefunds,
        cash_in: cashReceived - customerRefunds - depositRefunded,
        cash_out: cashOut,
        operating_expenses: operatingExpenses,
        expense_cash_out: expenseCashOut,
        owner_commissions: ownerCommissions,
        owner_payouts: ownerPayoutsConfirmed,
        owner_payouts_confirmed: ownerPayoutsConfirmed,
        owner_manual_payouts: number(row.owner_manual_payouts),
        owner_payouts_draft: number(row.owner_payouts_draft),
        driver_commissions: driverCommissions,
        driver_manual_payouts: number(row.driver_manual_payouts),
        owner_payables: number(row.owner_payables),
        driver_payables: number(row.driver_payables),
        partner_payables: number(row.owner_payables) + number(row.driver_payables),
        total_costs: totalCosts,
        profit,
        profit_margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        deposits_held: number(row.deposits_held),
        deposit_received: number(row.deposit_received),
        deposit_refunded: depositRefunded,
        motorcycle_collateral_held: number(row.motorcycle_collateral_held),
        net_cash_flow: cashReceived - cashOut,
        rental_orders_completed: number(row.rental_orders_completed),
        service_orders_completed: number(row.service_orders_completed),
        rental_orders_open: number(row.rental_orders_open),
        service_orders_open: number(row.service_orders_open),
      },
      series: series.rows.map((item) => {
        const seriesOperating = number(item.operating_expenses);
        const seriesOwner = number(item.owner_commissions);
        const seriesDriver = number(item.driver_commissions);
        const seriesRevenue = number(item.revenue);
        const seriesCosts = seriesOperating + seriesOwner + seriesDriver;
        const seriesCashReceived = number(item.cash_received);
        const seriesCashOut = number(item.customer_refunds) + number(item.deposit_refunded)
          + number(item.expense_cash_out) + number(item.owner_payouts);
        return {
          bucket: item.bucket,
          revenue: seriesRevenue,
          rental_revenue: number(item.rental_revenue),
          service_revenue: number(item.service_revenue),
          operating_expenses: seriesOperating,
          owner_commissions: seriesOwner,
          owner_payouts: number(item.owner_payouts),
          driver_commissions: seriesDriver,
          total_costs: seriesCosts,
          profit: seriesRevenue - seriesCosts,
          cash_received: seriesCashReceived,
          cash_out: seriesCashOut,
          net_cash_flow: seriesCashReceived - seriesCashOut,
        };
      }),
      expense_breakdown: normalizeMoneyRows(expenseBreakdown.rows),
      cash_out_breakdown: normalizeMoneyRows(cashOutBreakdown.rows),
      vehicles: vehicles.rows.map((item) => {
        const vehicleRevenue = number(item.revenue);
        const vehicleOperating = number(item.operating_expenses);
        const vehicleOwner = number(item.owner_commissions);
        const vehicleDriver = number(item.driver_commissions);
        const vehicleCosts = vehicleOperating + vehicleOwner + vehicleDriver;
        return {
          id: item.id,
          name: item.name || item.id,
          revenue: vehicleRevenue,
          operating_expenses: vehicleOperating,
          owner_commissions: vehicleOwner,
          owner_payouts: vehicleOwner,
          driver_commissions: vehicleDriver,
          total_costs: vehicleCosts,
          rental_count: number(item.rental_count),
          service_count: number(item.service_count),
          utilized_hours: number(item.utilized_hours),
          utilization_rate: number(item.utilization_rate),
          profit: vehicleRevenue - vehicleCosts,
        };
      }),
      customers: customers.rows.map((item) => ({
        name: item.name || 'Khách lẻ',
        phone: item.phone || '',
        orders: number(item.orders),
        revenue: number(item.revenue),
      })),
      owners: owners.rows.map((item) => ({
        id: item.id,
        name: item.name || 'Chủ xe',
        vehicle_count: number(item.vehicle_count),
        rental_count: number(item.rental_count),
        accrued: number(item.accrued),
        paid: number(item.paid),
        draft: number(item.draft),
        outstanding: number(item.outstanding),
      })),
      drivers: drivers.rows.map((item) => ({
        id: item.id || 'unassigned',
        name: item.name || 'Chưa gán tài xế',
        service_count: number(item.service_count),
        accrued: number(item.accrued),
        paid: number(item.paid),
        outstanding: number(item.outstanding),
      })),
      fleet: {
        total: number(fleetRow.total),
        available: number(fleetRow.available),
        reserved: number(fleetRow.reserved),
        rented: number(fleetRow.rented),
        maintenance: number(fleetRow.maintenance),
        suspended: number(fleetRow.suspended),
      },
      data_quality: {
        legacy_rentals_without_ledger: number(dataQuality.rows[0]?.legacy_rentals_without_ledger),
        legacy_services_without_ledger: number(dataQuality.rows[0]?.legacy_services_without_ledger),
        missing_owner_commissions: number(dataQuality.rows[0]?.missing_owner_commissions),
        missing_driver_commissions: number(dataQuality.rows[0]?.missing_driver_commissions),
        draft_owner_payouts: number(dataQuality.rows[0]?.draft_owner_payouts),
        manual_partner_payouts: number(dataQuality.rows[0]?.manual_partner_payouts),
        report_query_failures: failedReportSections.map(({ name }) => name),
      },
    },
  });
}));

app.get('/api/reports/summary-legacy', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const start = optionalDate(req.query, ['start']);
  const end = optionalDate(req.query, ['end']);
  if (!start || !end) throw new ApiError(400, 'start and end are required');
  if (Date.parse(end) <= Date.parse(start)) {
    throw new ApiError(400, 'end must be after start');
  }
  const groupBy = ensureEnum(
    optionalString(req.query, ['groupBy']),
    new Set(['day', 'week', 'month']),
    'groupBy',
  ) ?? 'day';

  const [overview, series, expenseBreakdown, vehicles, customers, fleet] = await Promise.all([
    query(
      `WITH rental_payment_totals AS (
         SELECT rental_id,
                COALESCE(SUM(CASE
                  WHEN status='completed' AND payment_type IN ('balance','surcharge','deposit_application') THEN amount
                  WHEN status='completed' AND payment_type='refund' THEN -amount
                  ELSE 0
                END), 0) AS applied
         FROM rental_payments
         WHERE paid_at < $2::timestamptz
         GROUP BY rental_id
       ),
       service_payment_totals AS (
         SELECT service_order_id,
                COALESCE(SUM(CASE
                  WHEN status='completed' AND payment_type='payment' THEN amount
                  WHEN status='completed' AND payment_type='refund' THEN -amount
                  ELSE 0
                END), 0) AS applied
         FROM service_order_payments
         WHERE paid_at < $2::timestamptz
         GROUP BY service_order_id
       ),
       scoped_rentals AS (
         SELECT r.*, COALESCE(p.applied, 0) AS applied
         FROM rentals r
         LEFT JOIN rental_payment_totals p ON p.rental_id=r.id
         WHERE r.status='completed'
           AND COALESCE(r.returned_at,r.created_at) >= $1::timestamptz
           AND COALESCE(r.returned_at,r.created_at) < $2::timestamptz
       ),
       scoped_services AS (
         SELECT s.*, COALESCE(p.applied, 0) AS applied
         FROM service_orders s
         LEFT JOIN service_payment_totals p ON p.service_order_id=s.id
         WHERE s.status='completed'
           AND COALESCE(s.completed_at,s.created_at) >= $1::timestamptz
           AND COALESCE(s.completed_at,s.created_at) < $2::timestamptz
       )
       SELECT
         COALESCE((SELECT SUM(total_amount) FROM scoped_rentals), 0) AS rental_revenue,
         COALESCE((SELECT SUM(total_amount) FROM scoped_services), 0) AS service_revenue,
         COALESCE((SELECT SUM(GREATEST(total_amount-applied,0)) FROM scoped_rentals), 0)
           + COALESCE((SELECT SUM(GREATEST(total_amount-applied,0)) FROM scoped_services), 0) AS receivables,
         COALESCE((
           SELECT SUM(CASE
             WHEN status='completed' AND payment_type IN ('balance','surcharge','deposit_application') THEN amount
             WHEN status='completed' AND payment_type='refund' THEN -amount
             ELSE 0
           END)
           FROM rental_payments
           WHERE paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         ), 0)
           + COALESCE((
             SELECT SUM(CASE
               WHEN status='completed' AND payment_type='payment' THEN amount
               WHEN status='completed' AND payment_type='refund' THEN -amount
               ELSE 0
             END)
             FROM service_order_payments
             WHERE paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
           ), 0) AS collected_revenue,
         COALESCE((
           SELECT SUM(CASE
             WHEN status='completed' AND payment_type IN ('deposit','balance','surcharge') THEN amount
             WHEN status='completed' AND payment_type IN ('deposit_refund','refund') THEN -amount
             ELSE 0
           END)
           FROM rental_payments
           WHERE paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         ), 0)
           + COALESCE((
             SELECT SUM(CASE
               WHEN status='completed' AND payment_type='payment' THEN amount
               WHEN status='completed' AND payment_type='refund' THEN -amount
               ELSE 0
             END)
             FROM service_order_payments
             WHERE paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
           ), 0) AS cash_in,
         COALESCE((
           SELECT SUM(CASE
             WHEN status='completed' AND payment_type='deposit' THEN amount
             WHEN status='completed' AND payment_type IN ('deposit_refund','deposit_application') THEN -amount
             ELSE 0
           END)
           FROM rental_payments
           WHERE status='completed' AND paid_at < $2::timestamptz
         ), 0) AS deposits_held,
         COALESCE((
           SELECT SUM(amount)
           FROM rental_payments
           WHERE status='completed' AND payment_type='deposit_refund'
             AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         ), 0) AS deposit_refunded,
         COALESCE((
           SELECT COUNT(*)
           FROM rentals
           WHERE deposit_type='motorbike'
             AND deposit_status='received'
             AND deposit_returned_at IS NULL
             AND created_at < $2::timestamptz
         ), 0) AS motorcycle_collateral_held,
         COALESCE((
           SELECT SUM(amount)
           FROM expenses
           WHERE expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
             AND expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         ), 0) AS operating_expenses,
         COALESCE((
           SELECT SUM(total_amount)
           FROM owner_payouts
           WHERE status='confirmed' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         ), 0) AS owner_payouts,
         COALESCE((SELECT SUM(driver_commission_amount) FROM scoped_services), 0) AS driver_commissions` ,
      [start, end],
    ),
    query(
      `WITH events AS (
         SELECT date_trunc($3, COALESCE(returned_at,created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS bucket,
                SUM(total_amount) AS revenue, SUM(total_amount) AS rental_revenue, 0::numeric AS service_revenue,
                0::numeric AS collected_revenue, 0::numeric AS cash_in, 0::numeric AS operating_expenses,
                0::numeric AS owner_payouts, 0::numeric AS driver_commissions
         FROM rentals
         WHERE status='completed'
           AND COALESCE(returned_at,created_at) >= $1::timestamptz
           AND COALESCE(returned_at,created_at) < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3, COALESCE(completed_at,created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                SUM(total_amount), 0::numeric, SUM(total_amount),
                0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric
         FROM service_orders
         WHERE status='completed'
           AND COALESCE(completed_at,created_at) >= $1::timestamptz
           AND COALESCE(completed_at,created_at) < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3, paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric, 0::numeric, 0::numeric,
                SUM(CASE
                  WHEN payment_type IN ('balance','surcharge','deposit_application') THEN amount
                  WHEN payment_type='refund' THEN -amount
                  ELSE 0
                END),
                SUM(CASE
                  WHEN payment_type IN ('deposit','balance','surcharge') THEN amount
                  WHEN payment_type IN ('deposit_refund','refund') THEN -amount
                  ELSE 0
                END),
                0::numeric, 0::numeric, 0::numeric
         FROM rental_payments
         WHERE status='completed' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3, paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric, 0::numeric, 0::numeric,
                SUM(CASE WHEN payment_type='payment' THEN amount WHEN payment_type='refund' THEN -amount ELSE 0 END),
                SUM(CASE WHEN payment_type='payment' THEN amount WHEN payment_type='refund' THEN -amount ELSE 0 END),
                0::numeric, 0::numeric, 0::numeric
         FROM service_order_payments
         WHERE status='completed' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3, expense_date::timestamp),
                0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric,
                SUM(amount), 0::numeric, 0::numeric
         FROM expenses
         WHERE expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3, paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric,
                SUM(total_amount), 0::numeric
         FROM owner_payouts
         WHERE status='confirmed' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
         GROUP BY 1
         UNION ALL
         SELECT date_trunc($3, COALESCE(completed_at,created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric,
                SUM(driver_commission_amount)
         FROM service_orders
         WHERE status='completed'
           AND COALESCE(completed_at,created_at) >= $1::timestamptz
           AND COALESCE(completed_at,created_at) < $2::timestamptz
         GROUP BY 1
       )
       SELECT bucket,
              COALESCE(SUM(revenue),0) AS revenue,
              COALESCE(SUM(rental_revenue),0) AS rental_revenue,
              COALESCE(SUM(service_revenue),0) AS service_revenue,
              COALESCE(SUM(collected_revenue),0) AS collected_revenue,
              COALESCE(SUM(cash_in),0) AS cash_in,
              COALESCE(SUM(operating_expenses),0) AS operating_expenses,
              COALESCE(SUM(owner_payouts),0) AS owner_payouts,
              COALESCE(SUM(driver_commissions),0) AS driver_commissions
       FROM events
       GROUP BY bucket
       ORDER BY bucket`,
      [start, end, groupBy],
    ),
    query(
      `SELECT category, SUM(amount) AS amount
       FROM expenses
       WHERE expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         AND expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
       GROUP BY category
       UNION ALL
       SELECT 'Chi trả chủ xe' AS category, COALESCE(SUM(total_amount),0) AS amount
       FROM owner_payouts
       WHERE status='confirmed' AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz
       UNION ALL
       SELECT 'Hoa hồng tài xế' AS category, COALESCE(SUM(driver_commission_amount),0) AS amount
       FROM service_orders
       WHERE status='completed'
         AND COALESCE(completed_at,created_at) >= $1::timestamptz
         AND COALESCE(completed_at,created_at) < $2::timestamptz
       ORDER BY amount DESC`,
      [start, end],
    ),
    query(
      `WITH rental_metrics AS (
         SELECT car_id,
                COALESCE(SUM(total_amount) FILTER (WHERE status='completed'
                  AND COALESCE(returned_at,created_at) >= $1::timestamptz
                  AND COALESCE(returned_at,created_at) < $2::timestamptz),0) AS rental_revenue,
                COUNT(*) FILTER (WHERE status='completed'
                  AND COALESCE(returned_at,created_at) >= $1::timestamptz
                  AND COALESCE(returned_at,created_at) < $2::timestamptz) AS rental_count,
                COALESCE(SUM(EXTRACT(EPOCH FROM (
                  LEAST(COALESCE(returned_at,end_date),$2::timestamptz)
                  - GREATEST(COALESCE(delivered_at,start_date),$1::timestamptz)
                )) / 3600) FILTER (
                  WHERE status IN ('active','completed')
                    AND COALESCE(delivered_at,start_date) < $2::timestamptz
                    AND COALESCE(returned_at,end_date) > $1::timestamptz
                ),0) AS utilized_hours
         FROM rentals
         GROUP BY car_id
       ), service_metrics AS (
         SELECT car_id,
                COALESCE(SUM(total_amount) FILTER (WHERE status='completed'
                  AND COALESCE(completed_at,created_at) >= $1::timestamptz
                  AND COALESCE(completed_at,created_at) < $2::timestamptz),0) AS service_revenue,
                COALESCE(SUM(driver_commission_amount) FILTER (WHERE status='completed'
                  AND COALESCE(completed_at,created_at) >= $1::timestamptz
                  AND COALESCE(completed_at,created_at) < $2::timestamptz),0) AS driver_commissions,
                COUNT(*) FILTER (WHERE status='completed'
                  AND COALESCE(completed_at,created_at) >= $1::timestamptz
                  AND COALESCE(completed_at,created_at) < $2::timestamptz) AS service_count
         FROM service_orders
         GROUP BY car_id
       ), expense_metrics AS (
         SELECT v.id AS vehicle_id, COALESCE(SUM(e.amount),0) AS operating_expenses
         FROM vehicles v
         LEFT JOIN expenses e ON (e.vehicle_id=v.id OR e.ref=v.plate_number)
           AND e.expense_date >= (($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND e.expense_date < (($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
         GROUP BY v.id
       ), payout_metrics AS (
         SELECT r.car_id, COALESCE(SUM(i.amount),0) AS owner_payouts
         FROM owner_payout_items i
         JOIN owner_payouts p ON p.id=i.payout_id
         JOIN rentals r ON r.id=i.rental_id
         WHERE p.status='confirmed' AND p.paid_at >= $1::timestamptz AND p.paid_at < $2::timestamptz
         GROUP BY r.car_id
       )
       SELECT v.plate_number AS id,
              concat_ws(' ', v.brand, v.model) AS name,
              COALESCE(r.rental_revenue,0) + COALESCE(s.service_revenue,0) AS revenue,
              COALESCE(e.operating_expenses,0) AS operating_expenses,
              COALESCE(p.owner_payouts,0) AS owner_payouts,
              COALESCE(s.driver_commissions,0) AS driver_commissions,
              COALESCE(r.rental_count,0) AS rental_count,
              COALESCE(s.service_count,0) AS service_count,
              COALESCE(r.utilized_hours,0) AS utilized_hours,
              LEAST(100, ROUND((COALESCE(r.utilized_hours,0) / NULLIF(EXTRACT(EPOCH FROM ($2::timestamptz-$1::timestamptz))/3600,0) * 100)::numeric, 1)) AS utilization_rate
       FROM vehicles v
       LEFT JOIN rental_metrics r ON r.car_id=v.plate_number
       LEFT JOIN service_metrics s ON s.car_id=v.plate_number
       LEFT JOIN expense_metrics e ON e.vehicle_id=v.id
       LEFT JOIN payout_metrics p ON p.car_id=v.plate_number
       ORDER BY revenue DESC, v.plate_number`,
      [start, end],
    ),
    query(
      `WITH customers AS (
         SELECT customer_name AS name, customer_phone AS phone, COUNT(*) AS orders, SUM(total_amount) AS revenue
         FROM rentals
         WHERE status='completed'
           AND COALESCE(returned_at,created_at) >= $1::timestamptz
           AND COALESCE(returned_at,created_at) < $2::timestamptz
         GROUP BY customer_name, customer_phone
         UNION ALL
         SELECT NULLIF(customer_name,''), NULLIF(customer_phone,''), COUNT(*), SUM(total_amount)
         FROM service_orders
         WHERE status='completed'
           AND COALESCE(completed_at,created_at) >= $1::timestamptz
           AND COALESCE(completed_at,created_at) < $2::timestamptz
         GROUP BY customer_name, customer_phone
       )
       SELECT COALESCE(name,'Khách lẻ') AS name, COALESCE(phone,'') AS phone,
              SUM(orders)::int AS orders, SUM(revenue) AS revenue
       FROM customers
       GROUP BY name, phone
       ORDER BY revenue DESC, orders DESC
       LIMIT 5`,
      [start, end],
    ),
    query(
      `WITH vehicle_statuses AS (
         SELECT ${effectiveVehicleStatusSql('v')} AS status
         FROM vehicles v
       )
       SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='Available')::int AS available,
              COUNT(*) FILTER (WHERE status='Reserved')::int AS reserved,
              COUNT(*) FILTER (WHERE status='Rented')::int AS rented,
              COUNT(*) FILTER (WHERE status='Maintenance')::int AS maintenance,
              COUNT(*) FILTER (WHERE status='Suspended')::int AS suspended
       FROM vehicle_statuses`,
    ),
  ]);

  const row = overview.rows[0] || {};
  const rentalRevenue = Number(row.rental_revenue) || 0;
  const serviceRevenue = Number(row.service_revenue) || 0;
  const revenue = rentalRevenue + serviceRevenue;
  const operatingExpenses = Number(row.operating_expenses) || 0;
  const ownerPayouts = Number(row.owner_payouts) || 0;
  const driverCommissions = Number(row.driver_commissions) || 0;
  const totalCosts = operatingExpenses + ownerPayouts + driverCommissions;
  const profit = revenue - totalCosts;
  const cashIn = Number(row.cash_in) || 0;

  const breakdownMap = new Map();
  for (const item of expenseBreakdown.rows) {
    const category = item.category || 'Khác';
    breakdownMap.set(category, (breakdownMap.get(category) || 0) + (Number(item.amount) || 0));
  }
  const fleetRow = fleet.rows[0] || {};
  const fleetData = {
    total: Number(fleetRow.total) || 0,
    available: Number(fleetRow.available) || 0,
    reserved: Number(fleetRow.reserved) || 0,
    rented: Number(fleetRow.rented) || 0,
    maintenance: Number(fleetRow.maintenance) || 0,
    suspended: Number(fleetRow.suspended) || 0,
  };

  res.json({
    success: true,
    data: {
      period: { start, end, group_by: groupBy },
      summary: {
        revenue,
        rental_revenue: rentalRevenue,
        service_revenue: serviceRevenue,
        collected_revenue: Number(row.collected_revenue) || 0,
        cash_in: cashIn,
        operating_expenses: operatingExpenses,
        owner_payouts: ownerPayouts,
        driver_commissions: driverCommissions,
        total_costs: totalCosts,
        profit,
        profit_margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        receivables: Number(row.receivables) || 0,
        deposits_held: Number(row.deposits_held) || 0,
        deposit_refunded: Number(row.deposit_refunded) || 0,
        motorcycle_collateral_held: Number(row.motorcycle_collateral_held) || 0,
        net_cash_flow: cashIn - operatingExpenses - ownerPayouts,
      },
      series: series.rows.map((item) => ({
        bucket: item.bucket,
        revenue: Number(item.revenue) || 0,
        rental_revenue: Number(item.rental_revenue) || 0,
        service_revenue: Number(item.service_revenue) || 0,
        collected_revenue: Number(item.collected_revenue) || 0,
        cash_in: Number(item.cash_in) || 0,
        operating_expenses: Number(item.operating_expenses) || 0,
        owner_payouts: Number(item.owner_payouts) || 0,
        driver_commissions: Number(item.driver_commissions) || 0,
      })),
      expense_breakdown: Array.from(breakdownMap.entries()).map(([category, amount]) => ({ category, amount })),
      vehicles: vehicles.rows.map((item) => ({
        id: item.id,
        name: item.name || item.id,
        revenue: Number(item.revenue) || 0,
        operating_expenses: Number(item.operating_expenses) || 0,
        owner_payouts: Number(item.owner_payouts) || 0,
        driver_commissions: Number(item.driver_commissions) || 0,
        rental_count: Number(item.rental_count) || 0,
        service_count: Number(item.service_count) || 0,
        utilized_hours: Number(item.utilized_hours) || 0,
        utilization_rate: Number(item.utilization_rate) || 0,
        profit: (Number(item.revenue) || 0)
          - (Number(item.operating_expenses) || 0)
          - (Number(item.owner_payouts) || 0)
          - (Number(item.driver_commissions) || 0),
      })),
      customers: customers.rows.map((item) => ({
        name: item.name || 'Khách lẻ',
        phone: item.phone || '',
        orders: Number(item.orders) || 0,
        revenue: Number(item.revenue) || 0,
      })),
      fleet: fleetData,
    },
  });
}));

app.get('/api/finance/summary', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const start = optionalDate(req.query, ['start']);
  const end = optionalDate(req.query, ['end']);
  const result = await query(
    `WITH payment_scope AS (
       SELECT
         (SELECT COALESCE(SUM(CASE
            WHEN status <> 'completed' THEN 0
            WHEN payment_type IN ('deposit','balance','surcharge') THEN amount
            WHEN payment_type IN ('deposit_refund','refund') THEN -amount
            ELSE 0
          END),0)
          FROM rental_payments
          WHERE ($1::timestamptz IS NULL OR paid_at >= $1)
            AND ($2::timestamptz IS NULL OR paid_at < $2)) AS net_cash,
         (SELECT COALESCE(SUM(CASE
            WHEN status = 'completed' AND payment_type = 'deposit' THEN amount
            WHEN status = 'completed' AND payment_type IN ('deposit_refund','deposit_application') THEN -amount
            ELSE 0
          END),0)
          FROM rental_payments
          WHERE ($2::timestamptz IS NULL OR paid_at < $2)) AS held_deposit,
         (SELECT COALESCE(SUM(amount) FILTER (WHERE status='completed' AND payment_type='deposit_refund'),0)
          FROM rental_payments
          WHERE ($1::timestamptz IS NULL OR paid_at >= $1)
            AND ($2::timestamptz IS NULL OR paid_at < $2)) AS deposit_refunded
     ),
     rental_payment_totals AS (
       SELECT rental_id,
              SUM(CASE
                    WHEN status = 'completed' AND payment_type IN ('balance','surcharge','deposit_application') THEN amount
                    WHEN status = 'completed' AND payment_type = 'refund' THEN -amount
                    ELSE 0
                  END) AS applied
       FROM rental_payments
       GROUP BY rental_id
     ),
     scoped_rentals AS (
       SELECT r.*, COALESCE(p.applied,0) AS applied
       FROM rentals r
       LEFT JOIN rental_payment_totals p ON p.rental_id=r.id
       WHERE ($1::timestamptz IS NULL OR COALESCE(r.returned_at,r.created_at) >= $1)
         AND ($2::timestamptz IS NULL OR COALESCE(r.returned_at,r.created_at) < $2)
     ),
     service_payment_scope AS (
       SELECT COALESCE(SUM(CASE
         WHEN status <> 'completed' THEN 0
         WHEN payment_type='payment' THEN amount
         WHEN payment_type='refund' THEN -amount
         ELSE 0
       END),0) AS net_cash
       FROM service_order_payments
       WHERE ($1::timestamptz IS NULL OR paid_at >= $1)
         AND ($2::timestamptz IS NULL OR paid_at < $2)
     ),
     service_payment_totals AS (
       SELECT service_order_id,
              SUM(CASE
                WHEN status <> 'completed' THEN 0
                WHEN payment_type='payment' THEN amount
                WHEN payment_type='refund' THEN -amount
                ELSE 0
              END) AS applied
       FROM service_order_payments
       GROUP BY service_order_id
     ),
     scoped_services AS (
       SELECT s.*, COALESCE(p.applied,0) AS applied
       FROM service_orders s
       LEFT JOIN service_payment_totals p ON p.service_order_id=s.id
       WHERE s.status='completed'
         AND ($1::timestamptz IS NULL OR COALESCE(s.completed_at,s.created_at) >= $1)
         AND ($2::timestamptz IS NULL OR COALESCE(s.completed_at,s.created_at) < $2)
     ),
     collateral_scope AS (
       SELECT COUNT(*) FILTER (
         WHERE deposit_type='motorbike'
           AND status <> 'cancelled'
           AND deposit_returned_at IS NULL
       ) AS motorcycle_collateral_held
       FROM rentals
       WHERE ($2::timestamptz IS NULL OR created_at < $2)
     )
     SELECT
       COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending','active','completed')),0) AS booked_revenue,
       COALESCE(SUM(total_amount) FILTER (WHERE status='completed'),0)
         + (SELECT COALESCE(SUM(total_amount),0) FROM scoped_services) AS completed_revenue,
       (SELECT net_cash FROM payment_scope)
       + (SELECT net_cash FROM service_payment_scope) AS cash_collected,
       (SELECT held_deposit FROM payment_scope) AS deposits_held,
       (SELECT deposit_refunded FROM payment_scope) AS deposit_refunded,
       (SELECT motorcycle_collateral_held FROM collateral_scope) AS motorcycle_collateral_held,
       COALESCE(SUM(GREATEST(total_amount-applied,0)) FILTER (WHERE status='completed'),0)
         + (SELECT COALESCE(SUM(GREATEST(total_amount-applied,0)),0) FROM scoped_services) AS receivables
     FROM scoped_rentals`,
    [start ?? null, end ?? null],
  );
  const expenses = await query(
    `SELECT
       COALESCE((
         SELECT SUM(amount)
         FROM expenses
         WHERE ($1::timestamptz IS NULL OR expense_date >= ($1 AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AND ($2::timestamptz IS NULL OR expense_date < ($2 AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
       ),0)
       + COALESCE((
         SELECT SUM(total_amount)
         FROM owner_payouts
         WHERE status='confirmed'
           AND ($1::timestamptz IS NULL OR paid_at >= $1)
           AND ($2::timestamptz IS NULL OR paid_at < $2)
       ),0) AS total`,
    [start ?? null, end ?? null],
  );
  const data = {
    ...result.rows[0],
    expenses: expenses.rows[0].total,
    profit: Number(result.rows[0].completed_revenue) - Number(expenses.rows[0].total),
  };
  res.json({ success: true, data });
}));

app.get('/api/owner-payouts/candidates', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const ownerId = requiredString(req.query, ['ownerId'], { max: 50 });
  const periodStart = optionalDate(req.query, ['periodStart']);
  const periodEnd = optionalDate(req.query, ['periodEnd']);
  if (!periodStart || !periodEnd) throw new ApiError(400, 'periodStart and periodEnd are required');
  const result = await query(
    `SELECT r.id, r.car_id, r.returned_at, r.rental_fee, r.owner_commission_amount
     FROM rentals r
     JOIN vehicles v ON v.plate_number=r.car_id
     WHERE v.owner_id::text=$1
       AND r.status='completed'
       AND r.returned_at >= $2
       AND r.returned_at < $3
       AND NOT EXISTS (
         SELECT 1 FROM owner_payout_items i
         WHERE i.rental_id=r.id AND i.status='included'
       )
     ORDER BY r.returned_at, r.id`,
    [ownerId, periodStart, periodEnd],
  );
  res.json({ success: true, data: result.rows });
}));

app.post('/api/owner-payouts', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const ownerId = requiredString(body, ['ownerId', 'owner_id'], { max: 50 });
  const periodStart = optionalDate(body, ['periodStart', 'period_start']);
  const periodEnd = optionalDate(body, ['periodEnd', 'period_end']);
  const rentalIds = optionalArray(body, ['rentalIds', 'rental_ids']);
  if (!periodStart || !periodEnd) throw new ApiError(400, 'periodStart and periodEnd are required');
  if (!rentalIds?.length || rentalIds.some((id) => typeof id !== 'string')) {
    throw new ApiError(400, 'rentalIds must contain at least one rental id');
  }
  if (new Set(rentalIds).size !== rentalIds.length) throw new ApiError(400, 'rentalIds contains duplicates');
  const payout = await withTransaction(async (client) => {
    const rentals = await client.query(
      `SELECT r.id, r.owner_commission_amount
       FROM rentals r
       JOIN vehicles v ON v.plate_number=r.car_id
       WHERE r.id = ANY($1::varchar[])
         AND v.owner_id::text=$2
         AND r.status='completed'
         AND r.returned_at >= $3
         AND r.returned_at < $4
         AND NOT EXISTS (
           SELECT 1 FROM owner_payout_items i
           WHERE i.rental_id=r.id AND i.status='included'
         )
       FOR UPDATE OF r`,
      [rentalIds, ownerId, periodStart, periodEnd],
    );
    if (rentals.rowCount !== rentalIds.length) {
      throw new ApiError(409, 'One or more rentals are ineligible or already included in a payout', 'PAYOUT_RENTAL_INELIGIBLE');
    }
    const total = rentals.rows.reduce((sum, rental) => sum + Number(rental.owner_commission_amount), 0);
    const payoutResult = await client.query(
      `INSERT INTO owner_payouts
         (owner_id, period_start, period_end, status, total_amount, note, created_by)
       VALUES ($1,$2,$3,'draft',$4,$5,$6)
       RETURNING *`,
      [ownerId, periodStart, periodEnd, total, optionalString(body, ['note']) ?? '', req.user.id],
    );
    for (const rental of rentals.rows) {
      await client.query(
        `INSERT INTO owner_payout_items (payout_id, rental_id, amount)
         VALUES ($1,$2,$3)`,
        [payoutResult.rows[0].id, rental.id, rental.owner_commission_amount],
      );
    }
    return payoutResult.rows[0];
  });
  res.status(201).json({ success: true, data: payout });
}));

app.post('/api/owner-payouts/:id/confirm', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const result = await query(
    `UPDATE owner_payouts
     SET status='confirmed', paid_at=NOW(), updated_at=NOW()
     WHERE id::text=$1 AND status='draft'
     RETURNING *`,
    [req.params.id],
  );
  if (result.rowCount === 0) throw new ApiError(409, 'Only draft payouts can be confirmed');
  res.json({ success: true, data: result.rows[0] });
}));

app.post('/api/owner-payouts/:id/cancel', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const payout = await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE owner_payouts
       SET status='cancelled', updated_at=NOW()
       WHERE id::text=$1 AND status='draft'
       RETURNING *`,
      [req.params.id],
    );
    if (result.rowCount === 0) throw new ApiError(409, 'Only draft payouts can be cancelled');
    await client.query(
      `UPDATE owner_payout_items SET status='released'
       WHERE payout_id=$1 AND status='included'`,
      [result.rows[0].id],
    );
    return result.rows[0];
  });
  res.json({ success: true, data: payout });
}));

const expenseFields = (body) => ({
  title: optionalString(body, ['title'], { max: 200 }),
  category: optionalString(body, ['category'], { max: 50 }),
  amount: optionalNumber(body, ['amount'], { min: 0 }),
  expense_date: optionalDate(body, ['date', 'expense_date']),
  vehicle_id: optionalString(body, ['vehicleId', 'vehicle_id'], { max: 50, nullable: true }),
  ref: optionalString(body, ['ref'], { max: 100 }),
  location: optionalString(body, ['location'], { max: 200 }),
  description: optionalString(body, ['description']),
});

const resolveExpenseVehicleId = async (db, fields) => {
  if (fields.vehicle_id !== undefined || !fields.ref) return;
  const vehicle = await executeQuery(db, 'SELECT id FROM vehicles WHERE plate_number=$1', [fields.ref]);
  fields.vehicle_id = vehicle.rowCount > 0 ? vehicle.rows[0].id : null;
};

app.get('/api/expenses', asyncRoute(async (req, res) => {
  const values = [];
  const conditions = [];
  const category = optionalString(req.query, ['category'], { max: 50 });
  if (category) {
    values.push(category);
    conditions.push(`category=$${values.length}`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const pagination = parsePagination(req, values);
  const result = await query(
    `SELECT * FROM expenses${where} ORDER BY created_at DESC${pagination.sql}`,
    values,
  );
  res.json({ success: true, data: result.rows, ...(pagination.meta ? { meta: pagination.meta } : {}) });
}));

app.post('/api/expenses', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const fields = expenseFields(body);
  fields.title = requiredString(body, ['title'], { max: 200 });
  fields.category = requiredString(body, ['category'], { max: 50 });
  fields.amount = optionalNumber(body, ['amount'], { min: 0 });
  if (fields.amount === undefined) throw new ApiError(400, 'amount is required');
  fields.expense_date ??= new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  fields.ref ??= '';
  fields.location ??= '';
  fields.description ??= '';
  await resolveExpenseVehicleId(query, fields);
  const id = optionalString(body, ['id'], { max: 50 })?.trim() || `EXP-${crypto.randomUUID()}`;
  const result = await query(
    `INSERT INTO expenses
       (id,title,category,amount,expense_date,vehicle_id,ref,location,description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      id, fields.title, fields.category, fields.amount, fields.expense_date,
      fields.vehicle_id ?? null, fields.ref, fields.location, fields.description,
    ],
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

app.put('/api/expenses/:id', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const fields = expenseFields(requireObjectBody(req));
  await resolveExpenseVehicleId(query, fields);
  const result = await updateByFields(query, 'expenses', 'id', req.params.id, fields);
  if (result.rowCount === 0) throw new ApiError(404, 'Expense not found');
  res.json({ success: true, data: result.rows[0] });
}));

app.delete('/api/expenses/:id', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const result = await query('DELETE FROM expenses WHERE id=$1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Expense not found');
  res.json({ success: true });
}));

const driverFields = (body) => ({
  name: optionalString(body, ['name'], { max: 100 }),
  phone: optionalString(body, ['phone'], { max: 20 }),
  license_number: optionalString(body, ['licenseNumber', 'license_number'], { max: 50 }),
  license_class: optionalString(body, ['licenseClass', 'license_class'], { max: 20 }),
  status: ensureEnum(optionalString(body, ['status'], { max: 20 }), new Set(['available', 'on_trip', 'off']), 'status'),
  address: optionalString(body, ['address']),
  notes: optionalString(body, ['notes']),
  assigned_car_id: optionalString(body, ['assignedCarId', 'assigned_car_id'], { max: 20, nullable: true }),
  avatar: optionalString(body, ['avatar'], { max: 2048 }),
  commission_rate: optionalNumber(body, ['commissionRate', 'commission_rate'], { min: 0, max: 100 }),
});

app.get('/api/drivers', asyncRoute(async (_req, res) => {
  const result = await query('SELECT * FROM drivers ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

app.post('/api/drivers', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const fields = driverFields(body);
  fields.name = requiredString(body, ['name'], { max: 100 });
  fields.phone = requiredString(body, ['phone'], { max: 20 });
  const id = optionalString(body, ['id'], { max: 50 })?.trim() || `DRV-${crypto.randomUUID()}`;
  const result = await query(
    `INSERT INTO drivers
       (id,name,phone,license_number,license_class,status,address,notes,total_trips,
        assigned_car_id,avatar,commission_rate)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11)
     RETURNING *`,
    [
      id, fields.name, fields.phone, fields.license_number ?? '', fields.license_class ?? 'B2',
      fields.status ?? 'available', fields.address ?? '', fields.notes ?? '',
      fields.assigned_car_id ?? null, fields.avatar ?? '', fields.commission_rate ?? 0,
    ],
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

app.put('/api/drivers/:id', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const result = await updateByFields(query, 'drivers', 'id', req.params.id, driverFields(requireObjectBody(req)));
  if (result.rowCount === 0) throw new ApiError(404, 'Driver not found');
  res.json({ success: true, data: result.rows[0] });
}));

app.delete('/api/drivers/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const result = await query('DELETE FROM drivers WHERE id=$1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Driver not found');
  res.json({ success: true });
}));

const serviceOrderFields = (body) => ({
  car_id: optionalString(body, ['carId', 'car_id'], { max: 20 }),
  driver_id: (() => {
    const driverId = optionalString(body, ['driverId', 'driver_id'], { max: 50, nullable: true });
    return driverId === '' ? null : driverId;
  })(),
  driver_name: optionalString(body, ['driverName', 'driver_name'], { max: 100 }),
  driver_phone: optionalString(body, ['driverPhone', 'driver_phone'], { max: 20 }),
  customer_name: optionalString(body, ['customerName', 'customer_name'], { max: 100 }),
  customer_phone: optionalString(body, ['customerPhone', 'customer_phone'], { max: 20 }),
  pickup_location: optionalString(body, ['pickupLocation', 'pickup_location']),
  dropoff_location: optionalString(body, ['dropoffLocation', 'dropoff_location']),
  service_date: optionalDate(body, ['serviceDate', 'service_date']),
  scheduled_end_at: optionalDate(body, ['scheduledEndAt', 'scheduled_end_at']),
  completed_at: optionalDate(body, ['completedAt', 'completed_at'], { nullable: true }),
  start_km: optionalNumber(body, ['startKm', 'start_km'], { integer: true, min: 0 }),
  end_km: optionalNumber(body, ['endKm', 'end_km'], { integer: true, min: 0 }),
  distance_km: optionalNumber(body, ['distanceKm', 'distance_km'], { integer: true, min: 0 }),
  price_per_km: optionalNumber(body, ['pricePerKm', 'price_per_km'], { min: 0 }),
  extra_fee: optionalNumber(body, ['extraFee', 'extra_fee'], { min: 0 }),
  total_amount: optionalNumber(body, ['totalAmount', 'total_amount'], { min: 0 }),
  driver_commission_rate: optionalNumber(body, ['driverCommissionRate', 'driver_commission_rate'], { min: 0, max: 100 }),
  driver_commission_amount: optionalNumber(body, ['driverCommissionAmount', 'driver_commission_amount'], { min: 0 }),
  payment_status: ensureEnum(optionalString(body, ['paymentStatus', 'payment_status'], { max: 30 }), SERVICE_PAYMENT_STATUSES, 'paymentStatus'),
  status: ensureEnum(optionalString(body, ['status'], { max: 30 }), SERVICE_STATUSES, 'status'),
  notes: optionalString(body, ['notes']),
});

const syncDriverTrips = async (client, driverId) => {
  if (!driverId) return;
  await client.query(
    `UPDATE drivers
     SET total_trips=(
       SELECT COUNT(*)::int FROM service_orders
       WHERE driver_id=$1 AND status<>'cancelled'
     ), updated_at=NOW()
     WHERE id=$1`,
    [driverId],
  );
};

const syncDriverStatus = async (client, driverId) => {
  if (!driverId) return;
  await client.query(
    `UPDATE drivers
     SET status=CASE
       WHEN EXISTS (
         SELECT 1 FROM service_orders
         WHERE driver_id=$1 AND status='ongoing'
       ) THEN 'on_trip'
       WHEN status='on_trip' THEN 'available'
       ELSE status
     END,
     updated_at=NOW()
     WHERE id=$1`,
    [driverId],
  );
};

const lockServiceReferences = async (client, carId, driverId) => {
  const vehicle = await client.query(
    `SELECT id, status, operational_status, current_mileage
     FROM vehicles WHERE plate_number=$1 FOR UPDATE`,
    [carId],
  );
  if (vehicle.rowCount === 0) throw new ApiError(400, 'Vehicle does not exist');
  if (['Maintenance', 'Suspended'].includes(vehicle.rows[0].operational_status)) {
    throw new ApiError(409, 'Vehicle is not operational', 'VEHICLE_NOT_OPERATIONAL');
  }
  if (driverId) {
    const driver = await client.query('SELECT id, status FROM drivers WHERE id=$1 FOR UPDATE', [driverId]);
    if (driver.rowCount === 0) throw new ApiError(400, 'Driver does not exist');
    if (driver.rows[0].status === 'off') throw new ApiError(409, 'Driver is off duty', 'DRIVER_NOT_AVAILABLE');
  }
  return vehicle.rows[0];
};

const assertNoServiceOverlap = async (
  client,
  {
    id,
    carId,
    driverId,
    startDate,
    endDate,
    status,
  },
) => {
  if (!new Set(['scheduled', 'ongoing']).has(status)) return;
  const rental = await client.query(
    `SELECT id FROM rentals
     WHERE car_id=$1
       AND status IN ('pending','active')
       AND $2::timestamptz < end_date
       AND $3::timestamptz > start_date
     LIMIT 1`,
    [carId, startDate, endDate],
  );
  if (rental.rowCount > 0) {
    throw new ApiError(409, 'Vehicle overlaps an open rental', 'SERVICE_RENTAL_OVERLAP');
  }
  const order = await client.query(
    `SELECT id FROM service_orders
     WHERE id<>$1
       AND status IN ('scheduled','ongoing')
       AND (car_id=$2 OR ($3::varchar IS NOT NULL AND driver_id=$3))
       AND $4::timestamptz < COALESCE(scheduled_end_at, service_date + INTERVAL '1 hour')
       AND $5::timestamptz > service_date
     LIMIT 1`,
    [id, carId, driverId, startDate, endDate],
  );
  if (order.rowCount > 0) {
    throw new ApiError(409, 'Vehicle or driver overlaps another service order', 'SERVICE_ORDER_OVERLAP');
  }
};

app.get('/api/service-orders', asyncRoute(async (req, res) => {
  const values = [];
  const conditions = [];
  const paymentStatus = optionalString(req.query, ['paymentStatus'], { max: 30 });
  if (paymentStatus) {
    values.push(paymentStatus);
    conditions.push(`payment_status=$${values.length}`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const pagination = parsePagination(req, values);
  const result = await query(
    `SELECT * FROM service_orders${where} ORDER BY created_at DESC${pagination.sql}`,
    values,
  );
  res.json({ success: true, data: result.rows, ...(pagination.meta ? { meta: pagination.meta } : {}) });
}));

const syncLegacyServicePaymentStatus = async (client, serviceOrderId) => {
  const result = await client.query(
    `SELECT s.total_amount,
            COALESCE(SUM(
              CASE
                WHEN p.status <> 'completed' THEN 0
                WHEN p.payment_type='payment' THEN p.amount
                WHEN p.payment_type='refund' THEN -p.amount
                ELSE 0
              END
            ),0) AS paid_amount
     FROM service_orders s
     LEFT JOIN service_order_payments p ON p.service_order_id=s.id
     WHERE s.id=$1
     GROUP BY s.id`,
    [serviceOrderId],
  );
  if (result.rowCount === 0) throw new ApiError(404, 'Service order not found');
  const paymentStatus = Number(result.rows[0].total_amount) > 0
    && Number(result.rows[0].paid_amount) >= Number(result.rows[0].total_amount)
    ? 'paid'
    : 'unpaid';
  await client.query(
    'UPDATE service_orders SET payment_status=$2, updated_at=NOW() WHERE id=$1',
    [serviceOrderId, paymentStatus],
  );
};

app.get('/api/service-orders/:id/payments', requireRole('admin', 'operations', 'accounting', 'staff'), asyncRoute(async (req, res) => {
  const result = await query(
    `SELECT * FROM service_order_payments
     WHERE service_order_id=$1
     ORDER BY paid_at, created_at`,
    [req.params.id],
  );
  res.json({ success: true, data: result.rows });
}));

app.post('/api/service-orders/:id/payments', requireRole('admin', 'accounting'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const paymentType = ensureEnum(
    requiredString(body, ['paymentType', 'payment_type'], { max: 20 }),
    new Set(['payment', 'refund']),
    'paymentType',
  );
  const amount = optionalNumber(body, ['amount'], { min: 0.01 });
  if (amount === undefined) throw new ApiError(400, 'amount is required');
  const status = ensureEnum(
    optionalString(body, ['status'], { max: 20 }) ?? 'completed',
    PAYMENT_RECORD_STATUSES,
    'status',
  );
  const paidAt = optionalDate(body, ['paidAt', 'paid_at']) ?? new Date().toISOString();
  const idempotencyKey = optionalString(
    body,
    ['idempotencyKey', 'idempotency_key'],
    { max: 100, nullable: true },
  ) ?? null;
  const payment = await withTransaction(async (client) => {
    const order = await client.query(
      'SELECT id, status FROM service_orders WHERE id=$1 FOR UPDATE',
      [req.params.id],
    );
    if (order.rowCount === 0) throw new ApiError(404, 'Service order not found');
    if (order.rows[0].status !== 'completed') {
      throw new ApiError(409, 'Only completed service orders can receive payments');
    }
    const result = await client.query(
      `INSERT INTO service_order_payments
         (service_order_id, payment_type, amount, status, paid_at, note,
          idempotency_key, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.params.id,
        paymentType,
        amount,
        status,
        paidAt,
        optionalString(body, ['note']) ?? '',
        idempotencyKey,
        req.user.id,
      ],
    );
    await syncLegacyServicePaymentStatus(client, req.params.id);
    return result.rows[0];
  });
  res.status(201).json({ success: true, data: payment });
}));

app.post('/api/service-orders', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const fields = serviceOrderFields(body);
  fields.car_id = requiredString(body, ['carId', 'car_id'], { max: 20 });
  fields.service_date ??= new Date().toISOString();
  fields.scheduled_end_at ??= new Date(Date.parse(fields.service_date) + 3_600_000).toISOString();
  if (Date.parse(fields.scheduled_end_at) <= Date.parse(fields.service_date)) {
    throw new ApiError(400, 'scheduledEndAt must be after serviceDate');
  }
  if (fields.status !== undefined && fields.status !== 'scheduled') {
    throw new ApiError(409, 'New service orders must start as scheduled', 'INVALID_SERVICE_TRANSITION');
  }
  fields.status = 'scheduled';
  fields.completed_at = null;
  fields.price_per_km ??= 0;
  fields.extra_fee ??= 0;
  fields.distance_km = 0;
  fields.total_amount = 0;
  fields.driver_commission_rate ??= 0;
  fields.driver_commission_amount = 0;
  fields.payment_status = 'unpaid';
  fields.driver_id ??= null;
  fields.driver_name ??= '';
  fields.driver_phone ??= '';
  fields.customer_name ??= '';
  fields.customer_phone ??= '';
  fields.pickup_location ??= '';
  fields.dropoff_location ??= '';
  fields.notes ??= '';
  const id = optionalString(body, ['id'], { max: 50 })?.trim() || `SRV-${crypto.randomUUID()}`;

  const row = await withTransaction(async (client) => {
    const vehicle = await lockServiceReferences(client, fields.car_id, fields.driver_id);
    fields.start_km = Number(vehicle.current_mileage);
    fields.end_km = Number(vehicle.current_mileage);
    await assertNoServiceOverlap(client, {
      id,
      carId: fields.car_id,
      driverId: fields.driver_id,
      startDate: fields.service_date,
      endDate: fields.scheduled_end_at,
      status: fields.status,
    });
    const keys = Object.keys(fields);
    const values = keys.map((key) => fields[key]);
    const placeholders = keys.map((_, index) => `$${index + 2}`).join(',');
    const result = await client.query(
      `INSERT INTO service_orders (id,${keys.join(',')})
       VALUES ($1,${placeholders})
       RETURNING *`,
      [id, ...values],
    );
    await syncDriverTrips(client, fields.driver_id);
    await syncDriverStatus(client, fields.driver_id);
    return result.rows[0];
  });
  res.status(201).json({ success: true, data: row });
}));

app.put('/api/service-orders/:id', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const fields = serviceOrderFields(requireObjectBody(req));
  const row = await withTransaction(async (client) => {
    const currentResult = await client.query('SELECT * FROM service_orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (currentResult.rowCount === 0) throw new ApiError(404, 'Service order not found');
    const current = currentResult.rows[0];
    if (fields.status !== undefined || fields.completed_at !== undefined) {
      throw new ApiError(
        409,
        'Service status and completion time are controlled by workflow endpoints',
        'INVALID_SERVICE_TRANSITION',
      );
    }
    const scheduledAllowed = new Set([
      'car_id',
      'driver_id',
      'driver_name',
      'driver_phone',
      'customer_name',
      'customer_phone',
      'pickup_location',
      'dropoff_location',
      'service_date',
      'scheduled_end_at',
      'price_per_km',
      'extra_fee',
      'driver_commission_rate',
      'notes',
    ]);
    const allowed = current.status === 'scheduled' ? scheduledAllowed : new Set(['notes']);
    const unsafeKey = Object.entries(fields)
      .find(([key, value]) => value !== undefined && !allowed.has(key))?.[0];
    if (unsafeKey) {
      throw new ApiError(
        409,
        `Field ${unsafeKey} is controlled by service workflow or payment ledger`,
      );
    }
    const carId = fields.car_id ?? current.car_id;
    const driverId = fields.driver_id === undefined ? current.driver_id : fields.driver_id;
    const startKm = fields.start_km ?? Number(current.start_km);
    const endKm = fields.end_km ?? Number(current.end_km);
    if (endKm < startKm) throw new ApiError(400, 'endKm cannot be less than startKm');
    if (
      fields.distance_km === undefined
      && (fields.start_km !== undefined || fields.end_km !== undefined)
    ) {
      fields.distance_km = endKm - startKm;
    }
    const distanceKm = fields.distance_km ?? Number(current.distance_km);
    const pricePerKm = fields.price_per_km ?? Number(current.price_per_km);
    const extraFee = fields.extra_fee ?? Number(current.extra_fee);
    if (
      fields.total_amount === undefined
      && (
        fields.distance_km !== undefined
        || fields.start_km !== undefined
        || fields.end_km !== undefined
        || fields.price_per_km !== undefined
        || fields.extra_fee !== undefined
      )
    ) {
      fields.total_amount = distanceKm * pricePerKm + extraFee;
    }
    const totalAmount = fields.total_amount ?? Number(current.total_amount);
    const commissionRate = fields.driver_commission_rate ?? Number(current.driver_commission_rate);
    if (
      fields.driver_commission_amount === undefined
      && (fields.total_amount !== undefined || fields.driver_commission_rate !== undefined)
    ) {
      fields.driver_commission_amount = Math.round(totalAmount * commissionRate / 100);
    }
    await lockServiceReferences(client, carId, driverId);
    const startDate = fields.service_date ?? current.service_date;
    const endDate = fields.scheduled_end_at
      ?? current.scheduled_end_at
      ?? new Date(Date.parse(startDate) + 3_600_000).toISOString();
    if (Date.parse(endDate) <= Date.parse(startDate)) {
      throw new ApiError(400, 'scheduledEndAt must be after serviceDate');
    }
    await assertNoServiceOverlap(client, {
      id: req.params.id,
      carId,
      driverId,
      startDate,
      endDate,
      status: current.status,
    });
    const result = await updateByFields(client, 'service_orders', 'id', req.params.id, fields);
    await syncDriverTrips(client, current.driver_id);
    if (driverId !== current.driver_id) await syncDriverTrips(client, driverId);
    await syncDriverStatus(client, current.driver_id);
    if (driverId !== current.driver_id) await syncDriverStatus(client, driverId);
    return result.rows[0];
  });
  res.json({ success: true, data: row });
}));

app.post('/api/service-orders/:id/start', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const row = await withTransaction(async (client) => {
    const currentResult = await client.query('SELECT * FROM service_orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (currentResult.rowCount === 0) throw new ApiError(404, 'Service order not found');
    const current = currentResult.rows[0];
    if (current.status !== 'scheduled') {
      throw new ApiError(409, 'Only scheduled services can be started', 'INVALID_SERVICE_TRANSITION');
    }
    const vehicle = await lockServiceReferences(client, current.car_id, current.driver_id);
    await assertNoServiceOverlap(client, {
      id: current.id,
      carId: current.car_id,
      driverId: current.driver_id,
      startDate: current.service_date,
      endDate: current.scheduled_end_at ?? new Date(Date.parse(current.service_date) + 3_600_000).toISOString(),
      status: 'ongoing',
    });
    const result = await client.query(
      `UPDATE service_orders
       SET status='ongoing', start_km=$2, end_km=$2, updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [current.id, vehicle.current_mileage],
    );
    await syncDriverStatus(client, current.driver_id);
    return result.rows[0];
  });
  res.json({ success: true, data: row });
}));

app.post('/api/service-orders/:id/complete', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const body = requireObjectBody(req);
  const endKm = optionalNumber(body, ['endKm', 'end_km'], { integer: true, min: 0 });
  if (endKm === undefined) throw new ApiError(400, 'endKm is required');
  const row = await withTransaction(async (client) => {
    const currentResult = await client.query('SELECT * FROM service_orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (currentResult.rowCount === 0) throw new ApiError(404, 'Service order not found');
    const current = currentResult.rows[0];
    if (current.status !== 'ongoing') {
      throw new ApiError(409, 'Only ongoing services can be completed', 'INVALID_SERVICE_TRANSITION');
    }
    const vehicle = await lockServiceReferences(client, current.car_id, current.driver_id);
    if (endKm < Number(vehicle.current_mileage) || endKm < Number(current.start_km)) {
      throw new ApiError(409, 'Completion mileage cannot be lower than current mileage', 'VEHICLE_MILEAGE_DECREASE');
    }
    const distanceKm = endKm - Number(current.start_km);
    const pricePerKm = optionalNumber(body, ['pricePerKm', 'price_per_km'], { min: 0 })
      ?? Number(current.price_per_km);
    const extraFee = optionalNumber(body, ['extraFee', 'extra_fee'], { min: 0 })
      ?? Number(current.extra_fee);
    const totalAmount = distanceKm * pricePerKm + extraFee;
    const commissionAmount = Math.round(totalAmount * Number(current.driver_commission_rate) / 100);
    const result = await client.query(
      `UPDATE service_orders
       SET status='completed', end_km=$2, distance_km=$3, price_per_km=$4,
           extra_fee=$5, total_amount=$6, driver_commission_amount=$7,
           completed_at=NOW(), updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [current.id, endKm, distanceKm, pricePerKm, extraFee, totalAmount, commissionAmount],
    );
    await client.query(
      `UPDATE vehicles
       SET current_mileage=GREATEST(current_mileage,$2), updated_at=NOW()
       WHERE plate_number=$1`,
      [current.car_id, endKm],
    );
    await syncDriverTrips(client, current.driver_id);
    await syncDriverStatus(client, current.driver_id);
    return result.rows[0];
  });
  res.json({ success: true, data: row });
}));

app.post('/api/service-orders/:id/cancel', requireRole('admin', 'operations', 'staff'), asyncRoute(async (req, res) => {
  const reason = requiredString(requireObjectBody(req), ['reason'], { max: 2_000 });
  const row = await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE service_orders
       SET status='cancelled',
           notes=concat_ws(E'\\n', NULLIF(notes,''), $2),
           updated_at=NOW()
       WHERE id=$1 AND status IN ('scheduled','ongoing')
       RETURNING *`,
      [req.params.id, `Cancellation: ${reason}`],
    );
    if (result.rowCount === 0) {
      throw new ApiError(409, 'Only scheduled or ongoing services can be cancelled');
    }
    await syncDriverStatus(client, result.rows[0].driver_id);
    return result.rows[0];
  });
  res.json({ success: true, data: row });
}));

app.delete('/api/service-orders/:id', requireRole('admin'), asyncRoute(async (_req, _res) => {
  throw new ApiError(405, 'Service orders must be cancelled to preserve history');
}));

app.get('/api/contracts', asyncRoute(async (_req, res) => {
  const result = await query(
    `SELECT c.*, v.plate_number, v.brand, v.model,
            cust.full_name AS customer_name, cust.phone AS customer_phone
     FROM contracts c
     LEFT JOIN vehicles v ON c.vehicle_id=v.id
     LEFT JOIN customers cust ON c.customer_id=cust.id
     ORDER BY c.created_at DESC`,
  );
  res.json({ success: true, data: result.rows });
}));

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

const DIST_DIR = path.join(process.cwd(), 'dist');
app.use(express.static(DIST_DIR));
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  return res.status(404).send('Frontend build not found');
});

app.use((error, _req, res, _next) => {
  console.error('[API] Request failed', error);
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB limit' : 'Invalid upload request';
    return res.status(400).json({ success: false, error: message });
  }
  if (error instanceof ApiError) {
    return res.status(error.status).json({ success: false, error: error.message, ...(error.code ? { code: error.code } : {}) });
  }
  if (error?.code === '23505') {
    return res.status(409).json({ success: false, error: 'A record with the same unique identifier already exists' });
  }
  if (error?.code === '23P01') {
    return res.status(409).json({ success: false, error: 'Khoảng thời gian đã trùng với một đơn thuê khác', code: 'RENTAL_OVERLAP' });
  }
  if (error?.code === '23503' || error?.code === '23514' || error?.code === '22P02') {
    return res.status(400).json({ success: false, error: 'The request violates a data integrity rule' });
  }
  const message = IS_PRODUCTION ? 'Internal server error' : (error?.message || 'Internal server error');
  return res.status(500).json({ success: false, error: message });
});

export const startServer = async () => {
  await bootstrapAdmin();
  return app.listen(PORT, () => {
    console.log(`Agreen API Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DB: ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'agrenn_sql'}`);
  });
};

const serverModulePath = path.resolve(fileURLToPath(import.meta.url));
export const isServerEntrypoint = ({
  argvPath = process.argv[1],
  pmExecPath = process.env.pm_exec_path,
  modulePath = serverModulePath,
} = {}) => (
  [argvPath, pmExecPath]
    .filter((candidate) => typeof candidate === 'string' && candidate.length > 0)
    .some((candidate) => path.resolve(candidate) === path.resolve(modulePath))
);

if (isServerEntrypoint()) {
  startServer().catch((error) => {
    console.error('[Server] Startup failed', error);
    process.exitCode = 1;
  });
}

export const rentalTestHelpers = {
  assertRentalDates,
  calculateRentalAmounts,
  rentalsOverlap,
  rentalFields,
  rentalDerivedVehicleStatus,
  violationTotal,
};

export const uploadTestHelpers = {
  hasValidFileSignature,
};

export default app;
