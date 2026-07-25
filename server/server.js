import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
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
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ----------------------------------------------------
// VEHICLES API
// ----------------------------------------------------
app.get('/api/vehicles', async (req, res) => {
  try {
    const result = await query('SELECT * FROM vehicles ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const { plate_number, brand, model, year, color, seats, transmission, fuel_type, daily_rate, monthly_rate, owner_id, status, current_mileage, registration_expiry, insurance_expiry, image_url, notes } = req.body;
    const result = await query(
      `INSERT INTO vehicles (plate_number, brand, model, year, color, seats, transmission, fuel_type, daily_rate, monthly_rate, owner_id, status, current_mileage, registration_expiry, insurance_expiry, image_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [plate_number, brand, model, year || 2024, color, seats || 4, transmission || 'Automatic', fuel_type || 'Gasoline', daily_rate || 0, monthly_rate || 0, owner_id || null, status || 'Available', current_mileage || 0, registration_expiry || null, insurance_expiry || null, image_url || '', notes || '']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.json({ success: true });

    const setClause = keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(', ');
    const values = Object.values(fields);
    values.push(id);

    const result = await query(
      `UPDATE vehicles SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// CUSTOMERS API
// ----------------------------------------------------
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
    const { full_name, phone, email, id_card, driver_license, address, city, status, notes } = req.body;
    const result = await query(
      `INSERT INTO customers (full_name, phone, email, id_card, driver_license, address, city, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [full_name, phone, email || '', id_card || '', driver_license || '', address || '', city || '', status || 'Active', notes || '']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.json({ success: true });

    const setClause = keys.map((key, idx) => `"${key}" = $${idx + 1}`).join(', ');
    const values = Object.values(fields);
    values.push(id);

    const result = await query(
      `UPDATE customers SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// OWNERS API
// ----------------------------------------------------
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
    const { name, phone, email, address, id_card, bank_account, bank_name, notes } = req.body;
    const result = await query(
      `INSERT INTO owners (name, phone, email, address, id_card, bank_account, bank_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, phone, email || '', address || '', id_card || '', bank_account || '', bank_name || '', notes || '']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// CONTRACTS / RENTALS API
// ----------------------------------------------------
app.get('/api/contracts', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, v.plate_number, v.brand, v.model, cust.full_name as customer_name, cust.phone as customer_phone
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

app.post('/api/contracts', async (req, res) => {
  try {
    const { contract_number, vehicle_id, customer_id, start_date, end_date, daily_rate, total_amount, deposit_amount, deposit_type, status, payment_status, start_mileage, notes } = req.body;
    const result = await query(
      `INSERT INTO contracts (contract_number, vehicle_id, customer_id, start_date, end_date, daily_rate, total_amount, deposit_amount, deposit_type, status, payment_status, start_mileage, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [contract_number || `HD-${Date.now()}`, vehicle_id, customer_id, start_date, end_date, daily_rate || 0, total_amount || 0, deposit_amount || 0, deposit_type || 'Cash', status || 'Active', payment_status || 'Unpaid', start_mileage || 0, notes || '']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// EXPENSES API
// ----------------------------------------------------
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
    const { category, amount, expense_date, vehicle_id, description } = req.body;
    const result = await query(
      `INSERT INTO expenses (category, amount, expense_date, vehicle_id, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [category, amount, expense_date || new Date().toISOString().split('T')[0], vehicle_id || null, description || '']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// SERVICE ORDERS API
// ----------------------------------------------------
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
    const { vehicle_id, service_type, garage_name, cost, service_date, status, description } = req.body;
    const result = await query(
      `INSERT INTO service_orders (vehicle_id, service_type, garage_name, cost, service_date, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [vehicle_id, service_type || 'Maintenance', garage_name || '', cost || 0, service_date || new Date().toISOString().split('T')[0], status || 'Completed', description || '']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Car Rental API Server running on port ${PORT}`);
});
