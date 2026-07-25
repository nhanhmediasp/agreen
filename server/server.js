import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// ============================================================
// FILE UPLOAD SYSTEM (MULTER)
// ============================================================
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve uploaded files statically via Express
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${basename}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    res.json({
      success: true,
      data: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all uploaded media files
app.get('/api/uploads', (req, res) => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      return res.json({ success: true, data: [] });
    }
    const files = fs.readdirSync(UPLOAD_DIR);
    const mediaFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf'].includes(ext);
      })
      .map((file, index) => ({
        id: `upload-${index}-${file}`,
        url: `/uploads/${file}`,
        name: file,
        usedIn: null
      }));
    res.json({ success: true, data: mediaFiles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete an uploaded file
app.delete('/api/uploads/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
  }
});

// ============================================================
// DASHBOARD STATS
// ============================================================
app.get('/api/stats', async (req, res) => {
  try {
    const [vehicles, customers, activeRentals, monthlyRevenue] = await Promise.all([
      query('SELECT COUNT(*) as total, SUM(CASE WHEN status=\'Available\' THEN 1 ELSE 0 END) as available, SUM(CASE WHEN status=\'Rented\' THEN 1 ELSE 0 END) as rented FROM vehicles'),
      query('SELECT COUNT(*) as total FROM customers'),
      query('SELECT COUNT(*) as total FROM rentals WHERE status IN (\'active\',\'pending\')'),
      query("SELECT COALESCE(SUM(total_amount),0) as total FROM rentals WHERE status='completed' AND created_at >= date_trunc('month', CURRENT_DATE)")
    ]);
    res.json({
      success: true,
      data: {
        vehicles: vehicles.rows[0],
        customers: customers.rows[0],
        activeRentals: activeRentals.rows[0].total,
        monthlyRevenue: monthlyRevenue.rows[0].total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// VEHICLES
// ============================================================
app.get('/api/vehicles', async (req, res) => {
  try {
    const result = await query(`
      SELECT v.*, o.name as owner_name, o.phone as owner_phone
      FROM vehicles v
      LEFT JOIN owners o ON v.owner_id = o.id
      ORDER BY v.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const { plate_number, brand, model, year, color, seats, transmission, fuel_type, daily_rate, hourly_rate, weekly_rate, owner_id, status, current_mileage, registration_expiry, insurance_expiry, license_expiry, image_url, notes } = req.body;
    const result = await query(
      `INSERT INTO vehicles (plate_number, brand, model, year, color, seats, transmission, fuel_type, daily_rate, hourly_rate, weekly_rate, owner_id, status, current_mileage, registration_expiry, insurance_expiry, license_expiry, image_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (plate_number) DO UPDATE SET
         brand=$2, model=$3, year=$4, color=$5, seats=$6, transmission=$7, fuel_type=$8,
         daily_rate=$9, hourly_rate=$10, weekly_rate=$11, owner_id=$12, status=$13,
         current_mileage=$14, registration_expiry=$15, insurance_expiry=$16,
         license_expiry=$17, image_url=$18, notes=$19, updated_at=NOW()
       RETURNING *`,
      [
        plate_number, brand, model || '', Number(year)||2024, color||'Trắng', Number(seats)||4,
        transmission||'Automatic', fuel_type||'Gasoline',
        Number(daily_rate)||0, Number(hourly_rate)||0, Number(weekly_rate)||0,
        owner_id||null, status||'Available', Number(current_mileage)||0,
        registration_expiry||null, insurance_expiry||null, license_expiry||null,
        image_url||'', notes||''
      ]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const allowed = ['brand','model','year','color','seats','transmission','fuel_type','daily_rate','hourly_rate','weekly_rate','owner_id','status','current_mileage','registration_expiry','insurance_expiry','license_expiry','image_url','notes'];
    const fields = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (Object.keys(fields).length === 0) return res.json({ success: true });
    const keys = Object.keys(fields);
    const setClause = keys.map((k, i) => `"${k}"=$${i+1}`).join(', ');
    const values = [...Object.values(fields), req.params.id];
    const result = await query(`UPDATE vehicles SET ${setClause}, updated_at=NOW() WHERE plate_number=$${values.length} OR id::text=$${values.length} RETURNING *`, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await query('DELETE FROM vehicles WHERE plate_number=$1 OR id::text=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CUSTOMERS
// ============================================================
app.get('/api/customers', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { full_name, phone, email, id_card, driver_license, address, city, classification, status, notes, image_url } = req.body;
    const result = await query(
      `INSERT INTO customers (full_name, phone, email, id_card, driver_license, address, city, classification, status, notes, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (phone) DO UPDATE SET
         full_name=$1, email=$3, id_card=$4, driver_license=$5, address=$6, city=$7,
         classification=$8, status=$9, notes=$10, image_url=$11, updated_at=NOW()
       RETURNING *`,
      [full_name, phone, email||'', id_card||'', driver_license||'', address||'', city||'', classification||'normal', status||'Active', notes||'', image_url||'']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const allowed = ['full_name','phone','email','id_card','driver_license','address','city','classification','status','notes','image_url','active_rentals','total_rentals'];
    const fields = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (Object.keys(fields).length === 0) return res.json({ success: true });
    const keys = Object.keys(fields);
    const setClause = keys.map((k,i) => `"${k}"=$${i+1}`).join(', ');
    const values = [...Object.values(fields), req.params.id];
    const result = await query(`UPDATE customers SET ${setClause}, updated_at=NOW() WHERE id::text=$${values.length} RETURNING *`, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await query('DELETE FROM customers WHERE id::text=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// OWNERS
// ============================================================
app.get('/api/owners', async (req, res) => {
  try {
    const result = await query('SELECT * FROM owners ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/owners', async (req, res) => {
  try {
    const { name, phone, email, address, id_card, bank_account, bank_name, commission_rate, notes, image_url } = req.body;
    const result = await query(
      `INSERT INTO owners (name, phone, email, address, id_card, bank_account, bank_name, commission_rate, notes, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, phone, email||'', address||'', id_card||'', bank_account||'', bank_name||'', Number(commission_rate)||0, notes||'', image_url||'']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/owners/:id', async (req, res) => {
  try {
    const allowed = ['name','phone','email','address','id_card','bank_account','bank_name','commission_rate','notes','image_url'];
    const fields = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (Object.keys(fields).length === 0) return res.json({ success: true });
    const keys = Object.keys(fields);
    const setClause = keys.map((k,i) => `"${k}"=$${i+1}`).join(', ');
    const values = [...Object.values(fields), req.params.id];
    const result = await query(`UPDATE owners SET ${setClause}, updated_at=NOW() WHERE id::text=$${values.length} RETURNING *`, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/owners/:id', async (req, res) => {
  try {
    await query('DELETE FROM owners WHERE id::text=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// RENTALS (Đơn thuê xe – dữ liệu quan trọng nhất)
// ============================================================
app.get('/api/rentals', async (req, res) => {
  try {
    const result = await query('SELECT * FROM rentals ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/rentals', async (req, res) => {
  try {
    const r = req.body;
    const result = await query(
      `INSERT INTO rentals (id, car_id, customer_name, customer_phone, start_date, end_date,
        rental_fee, delivery_fee, deposit, extra_fee, total_amount, payment_status, status,
        start_km, end_km, start_fuel, end_fuel, source, file_url, file_name,
        owner_commission_amount, condition_images, notes, delivered_at, returned_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       ON CONFLICT (id) DO UPDATE SET
         status=EXCLUDED.status, payment_status=EXCLUDED.payment_status,
         end_km=EXCLUDED.end_km, end_fuel=EXCLUDED.end_fuel,
         extra_fee=EXCLUDED.extra_fee, total_amount=EXCLUDED.total_amount,
         condition_images=EXCLUDED.condition_images, notes=EXCLUDED.notes,
         returned_at=EXCLUDED.returned_at, updated_at=NOW()
       RETURNING *`,
      [
        r.id || `HD-${Date.now()}`, r.carId, r.customerName, r.customerPhone,
        r.startDate, r.endDate,
        Number(r.rentalFee)||0, Number(r.deliveryFee)||0, Number(r.deposit)||0,
        Number(r.extraFee)||0, Number(r.totalAmount)||0,
        r.paymentStatus||'deposit', r.status||'pending',
        Number(r.startKm)||0, r.endKm||null,
        r.startFuel||'full', r.endFuel||null,
        r.source||'system', r.fileUrl||'', r.fileName||'',
        Number(r.ownerCommissionAmount)||0,
        JSON.stringify(r.conditionImages||[]),
        r.notes||'', r.deliveredAt||null, r.returnedAt||null
      ]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/rentals/:id', async (req, res) => {
  try {
    const allowed = ['status','payment_status','end_km','end_fuel','extra_fee','total_amount','condition_images','notes','delivered_at','returned_at'];
    const r = req.body;
    const fields = Object.fromEntries(Object.entries({
      status: r.status,
      payment_status: r.paymentStatus,
      end_km: r.endKm,
      end_fuel: r.endFuel,
      extra_fee: r.extraFee,
      total_amount: r.totalAmount,
      condition_images: r.conditionImages ? JSON.stringify(r.conditionImages) : undefined,
      notes: r.notes,
      delivered_at: r.deliveredAt,
      returned_at: r.returnedAt
    }).filter(([,v]) => v !== undefined));

    if (Object.keys(fields).length === 0) return res.json({ success: true });
    const keys = Object.keys(fields);
    const setClause = keys.map((k,i) => `"${k}"=$${i+1}`).join(', ');
    const values = [...Object.values(fields), req.params.id];
    const result = await query(`UPDATE rentals SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/rentals/:id', async (req, res) => {
  try {
    await query('DELETE FROM rentals WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// EXPENSES
// ============================================================
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { id, title, category, amount, expense_date, vehicle_id, ref, location, description } = req.body;
    const result = await query(
      `INSERT INTO expenses (id, title, category, amount, expense_date, vehicle_id, ref, location, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [id||`EXP-${Date.now()}`, title||'', category||'Other', Number(amount)||0, expense_date||new Date().toISOString().split('T')[0], vehicle_id||null, ref||'', location||'', description||'']
    );
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await query('DELETE FROM expenses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// SERVICE ORDERS
// ============================================================
app.get('/api/service-orders', async (req, res) => {
  try {
    const result = await query('SELECT * FROM service_orders ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/service-orders', async (req, res) => {
  try {
    const s = req.body;
    const result = await query(
      `INSERT INTO service_orders (id, car_id, driver_id, driver_name, driver_phone,
        customer_name, customer_phone, service_date, start_km, end_km, distance_km,
        price_per_km, extra_fee, total_amount, driver_commission_rate,
        driver_commission_amount, payment_status, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        s.id||`SRV-${Date.now()}`, s.carId, s.driverId||'', s.driverName||'', s.driverPhone||'',
        s.customerName||'', s.customerPhone||'', s.serviceDate||new Date().toISOString(),
        Number(s.startKm)||0, Number(s.endKm)||0, Number(s.distanceKm)||0,
        Number(s.pricePerKm)||0, Number(s.extraFee)||0, Number(s.totalAmount)||0,
        Number(s.driverCommissionRate)||0, Number(s.driverCommissionAmount)||0,
        s.paymentStatus||'unpaid', s.status||'completed', s.notes||''
      ]
    );
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/service-orders/:id', async (req, res) => {
  try {
    await query('DELETE FROM service_orders WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CONTRACTS (Hợp đồng chính thức)
// ============================================================
app.get('/api/contracts', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, v.plate_number, v.brand, v.model,
             cust.full_name as customer_name, cust.phone as customer_phone
      FROM contracts c
      LEFT JOIN vehicles v ON c.vehicle_id = v.id
      LEFT JOIN customers cust ON c.customer_id = cust.id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ADMIN CREDENTIALS ENDPOINTS
// ============================================================
const CREDENTIALS_FILE = path.join(process.cwd(), 'server', 'credentials.json');

const getCredentials = () => {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read credentials file', err);
  }
  return { username: 'admin', password: 'agreen2024' };
};

const saveCredentials = (creds) => {
  try {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write credentials file', err);
    return false;
  }
};

app.get('/api/credentials', (req, res) => {
  const creds = getCredentials();
  res.json({ success: true, data: creds });
});

app.post('/api/credentials', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }
  const success = saveCredentials({ username, password });
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save credentials on server' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Agreen API Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB: ${process.env.DB_HOST||'127.0.0.1'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'agrenn_sql'}`);
});
