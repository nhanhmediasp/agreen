import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import app, { isServerEntrypoint, rentalTestHelpers } from '../server/server.js';
import { authTestHelpers, passwordValidationError } from '../server/auth.js';

const USER_DATE = new Date('2026-07-28T00:00:00.000Z');
const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  username: 'admin',
  role: 'admin',
  is_active: true,
  updated_at: USER_DATE,
};
const CSRF_TOKEN = 'test_csrf_token_abcdefghijklmnopqrstuvwxyz_123456';

let server;
let baseUrl;
let originalQuery;
let originalGetClient;

const result = (rows = []) => ({ rows, rowCount: rows.length });
const authCookie = () => (
  `agreen_session=${encodeURIComponent(authTestHelpers.signToken(USER))}; `
  + `agreen_csrf=${encodeURIComponent(CSRF_TOKEN)}`
);

const jsonRequest = (path, {
  method = 'GET',
  body,
  cookie = authCookie(),
  origin,
  csrfToken = CSRF_TOKEN,
} = {}) => fetch(`${baseUrl}${path}`, {
  method,
  headers: {
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(cookie ? { Cookie: cookie } : {}),
    ...(origin === null ? {} : { Origin: origin || baseUrl }),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const authQuery = async (sql) => {
  if (sql.includes('FROM users WHERE id::text')) return result([USER]);
  throw new Error(`Unexpected pool query in test: ${sql}`);
};

const transactionClient = (handler) => ({
  query: handler,
  release() {},
});

before(async () => {
  originalQuery = app.locals.dbQuery;
  originalGetClient = app.locals.getDbClient;
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  app.locals.dbQuery = originalQuery;
  app.locals.getDbClient = originalGetClient;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('unauthenticated administrative API request returns 401', async () => {
  const response = await jsonRequest('/api/vehicles', { cookie: '' });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'Authentication required',
  });
});

test('reports summary is read-only and returns the normalized financial sections', async () => {
  const queries = [];
  app.locals.dbQuery = async (sql, params = []) => {
    queries.push({ sql, params });
    if (sql.includes('FROM users WHERE id::text')) return result([USER]);
    if (sql.includes('WITH rental_payment_totals')) return result([{
      rental_revenue: '1000000',
      service_revenue: '250000',
      receivables: '300000',
      collected_revenue: '950000',
      cash_in: '1150000',
      deposits_held: '500000',
      deposit_refunded: '0',
      motorcycle_collateral_held: '1',
      operating_expenses: '100000',
      owner_payouts: '200000',
      driver_commissions: '25000',
    }]);
    if (sql.includes('WITH events')) return result([{ bucket: '2026-08-24 00:00:00', revenue: '1250000' }]);
    if (sql.includes('SELECT category, SUM(amount)')) return result([{ category: 'Bảo dưỡng', amount: '100000' }]);
    if (sql.includes('WITH rental_metrics')) return result([{ id: '51A-123.45', name: 'Toyota Vios', revenue: '1250000', utilization_rate: '42.5', profit: '925000' }]);
    if (sql.includes('WITH customers')) return result([{ name: 'Nguyễn Văn A', phone: '0900000000', orders: '2', revenue: '1250000' }]);
    if (sql.includes('WITH vehicle_statuses')) return result([{ total: '3', available: '1', reserved: '1', rented: '1', maintenance: '0', suspended: '0' }]);
    throw new Error(`Unexpected reports query: ${sql}`);
  };

  const response = await jsonRequest('/api/reports/summary?start=2026-08-01T00:00:00.000Z&end=2026-09-01T00:00:00.000Z&groupBy=day');
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(payload.data.summary.revenue, 1250000);
  assert.equal(payload.data.summary.total_costs, 325000);
  assert.equal(payload.data.summary.profit, 925000);
  assert.equal(payload.data.fleet.total, 3);
  assert.equal(queries.some(({ sql }) => /\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(sql)), false);
});

test('public lookup rejects enumeration input and uses exact approved-field lookup', async () => {
  let queryCount = 0;
  app.locals.dbQuery = async (sql, params) => {
    queryCount += 1;
    assert.doesNotMatch(sql, /\bLIKE\b/i);
    assert.doesNotMatch(sql, /current_mileage|registration_expiry/i);
    assert.match(sql, /FROM rentals active_rental/i);
    assert.match(sql, /active_rental\.status='active'/i);
    assert.deepEqual(params, ['51A12345']);
    return result([{
      plate_number: '51A-123.45',
      brand: 'Toyota',
      model: 'Vios',
      year: 2024,
      color: 'White',
      seats: 5,
      status: 'Available',
      image_url: '/uploads/car.jpg',
    }]);
  };

  const enumerationResponse = await jsonRequest('/api/public/vehicles/search', {
    method: 'POST',
    cookie: '',
    body: { plate: '5' },
  });
  assert.equal(enumerationResponse.status, 400);
  assert.equal(queryCount, 0);

  const exactResponse = await jsonRequest('/api/public/vehicles/search', {
    method: 'POST',
    cookie: '',
    body: { plate: '51A-123.45' },
  });
  assert.equal(exactResponse.status, 200);
  const exactPayload = await exactResponse.json();
  assert.equal(queryCount, 1);
  assert.deepEqual(Object.keys(exactPayload.data[0]).sort(), [
    'brand',
    'color',
    'image_url',
    'model',
    'plate_number',
    'seats',
    'status',
    'year',
  ]);
});

test('vehicle list derives rental status and active customer from open rentals', async () => {
  let vehicleSql = '';
  app.locals.dbQuery = async (sql) => {
    if (sql.includes('FROM users WHERE id::text')) return result([USER]);
    vehicleSql = sql;
    return result([{
      id: 'vehicle-1',
      plate_number: '51A-123.45',
      status: 'Available',
      operational_status: 'Available',
      active_rental_id: null,
      active_customer_name: null,
      active_customer_phone: null,
    }]);
  };

  const response = await jsonRequest('/api/vehicles');
  assert.equal(response.status, 200);
  assert.match(vehicleSql, /FROM rentals active_rental/i);
  assert.match(vehicleSql, /FROM rentals pending_rental/i);
  assert.match(vehicleSql, /LEFT JOIN LATERAL/i);
  assert.match(vehicleSql, /AS status/i);
  assert.equal((await response.json()).data[0].status, 'Available');
});

test('CSRF rejects cross-origin or missing-token mutations and accepts a valid request', async () => {
  let authenticationQueries = 0;
  app.locals.dbQuery = async (sql) => {
    if (sql.includes('FROM users WHERE id::text')) {
      authenticationQueries += 1;
      return result([USER]);
    }
    throw new Error(`Unexpected CSRF pool query: ${sql}`);
  };

  const crossOriginResponse = await jsonRequest('/api/vehicles/51A-123.45', {
    method: 'PUT',
    origin: 'https://attacker.example',
    body: { color: 'Black' },
  });
  assert.equal(crossOriginResponse.status, 403);
  assert.equal(authenticationQueries, 0);

  const missingTokenResponse = await jsonRequest('/api/vehicles/51A-123.45', {
    method: 'PUT',
    csrfToken: '',
    body: { color: 'Black' },
  });
  assert.equal(missingTokenResponse.status, 403);
  assert.equal((await missingTokenResponse.json()).code, 'CSRF_TOKEN_INVALID');

  const statements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql) => {
    statements.push(sql);
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('FROM vehicles') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: '51A-123.45',
        status: 'Available',
        current_mileage: 50_000,
      }]);
    }
    if (sql.includes('SELECT status FROM rentals')) return result([]);
    if (sql.includes('UPDATE vehicles SET')) {
      return result([{ plate_number: '51A-123.45', color: 'Black' }]);
    }
    throw new Error(`Unexpected valid CSRF query: ${sql}`);
  });

  const acceptedResponse = await jsonRequest('/api/vehicles/51A-123.45', {
    method: 'PUT',
    body: { color: 'Black' },
  });
  assert.equal(acceptedResponse.status, 200);
  assert.equal(statements.at(-1), 'COMMIT');
});

test('vehicle update rejects direct rental-derived statuses and mileage decreases', async () => {
  app.locals.dbQuery = authQuery;

  const statusStatements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql) => {
    statusStatements.push(sql);
    if (['BEGIN', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('FROM vehicles') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: '51A-123.45',
        status: 'Rented',
        operational_status: 'Available',
        current_mileage: 50_000,
      }]);
    }
    if (sql.includes('SELECT status FROM rentals')) return result([{ status: 'active' }]);
    throw new Error(`Unexpected vehicle status query: ${sql}`);
  });
  const statusResponse = await jsonRequest('/api/vehicles/51A-123.45', {
    method: 'PUT',
    body: { status: 'Rented' },
  });
  assert.equal(statusResponse.status, 409);
  assert.equal((await statusResponse.json()).code, 'VEHICLE_STATUS_CONFLICT');
  assert.equal(statusStatements.includes('ROLLBACK'), true);
  assert.equal(statusStatements.some((sql) => sql.includes('UPDATE vehicles SET')), false);

  const mileageStatements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql) => {
    mileageStatements.push(sql);
    if (['BEGIN', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('FROM vehicles') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: '51A-123.45',
        status: 'Available',
        operational_status: 'Available',
        current_mileage: 50_000,
      }]);
    }
    if (sql.includes('SELECT status FROM rentals')) return result([]);
    throw new Error(`Unexpected vehicle mileage query: ${sql}`);
  });
  const mileageResponse = await jsonRequest('/api/vehicles/51A-123.45', {
    method: 'PUT',
    body: { currentMileage: 49_999 },
  });
  assert.equal(mileageResponse.status, 409);
  assert.equal((await mileageResponse.json()).code, 'VEHICLE_MILEAGE_DECREASE');
  assert.equal(mileageStatements.includes('ROLLBACK'), true);
  assert.equal(mileageStatements.some((sql) => sql.includes('UPDATE vehicles SET')), false);
});

test('vehicle update changes the plate and keeps linked expense references in sync', async () => {
  app.locals.dbQuery = authQuery;
  const statements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql, params = []) => {
    statements.push({ sql, params });
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('FROM vehicles') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: '51A-123.45',
        status: 'Available',
        operational_status: 'Available',
        current_mileage: 50_000,
      }]);
    }
    if (sql.includes('SELECT status FROM rentals')) return result([]);
    if (sql.startsWith('UPDATE vehicles SET')) {
      return result([{ id: 'vehicle-1', plate_number: '51A-999.99' }]);
    }
    if (sql.startsWith('UPDATE expenses')) return result([]);
    throw new Error(`Unexpected vehicle plate query: ${sql}`);
  });

  const response = await jsonRequest('/api/vehicles/51A-123.45', {
    method: 'PUT',
    body: { plateNumber: ' 51a-999.99 ' },
  });
  assert.equal(response.status, 200);
  const vehicleUpdate = statements.find(({ sql }) => sql.startsWith('UPDATE vehicles SET'));
  assert.match(vehicleUpdate.sql, /"plate_number"/);
  assert.equal(vehicleUpdate.params.includes('51A-999.99'), true);
  const expenseUpdate = statements.find(({ sql }) => sql.startsWith('UPDATE expenses'));
  assert.deepEqual(expenseUpdate.params, ['51A-999.99', 'vehicle-1', '51A-123.45']);
  assert.equal(statements.at(-1).sql, 'COMMIT');
});

test('upload rejects and removes a fake JPEG whose bytes do not match its MIME type', async () => {
  app.locals.dbQuery = authQuery;
  const uploadsDirectory = new URL('../public/uploads/', import.meta.url);
  const before = new Set(await fs.readdir(uploadsDirectory));
  const formData = new FormData();
  formData.append(
    'file',
    new Blob(['this is not a jpeg'], { type: 'image/jpeg' }),
    'fake.jpg',
  );

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: {
      Cookie: authCookie(),
      Origin: baseUrl,
      'X-CSRF-Token': CSRF_TOKEN,
    },
    body: formData,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_FILE_SIGNATURE');
  const afterFiles = await fs.readdir(uploadsDirectory);
  assert.deepEqual(new Set(afterFiles), before);
});

test('login upgrades legacy SHA-256 and admin can change password with the old password', async () => {
  const legacyPassword = 'LegacyPass!123';
  const nextPassword = 'NextSecure!456';
  const legacyHash = crypto.createHash('sha256').update(legacyPassword).digest('hex');
  let storedHash = legacyHash;
  let changedHash = '';

  app.locals.dbQuery = async (sql, params = []) => {
    if (sql.includes('FROM users WHERE username = $1')) {
      return result([{ ...USER, password_hash: storedHash }]);
    }
    if (sql.includes('WHERE id = $2 RETURNING id, username, role, updated_at')) {
      storedHash = params[0];
      return result([USER]);
    }
    if (sql.includes('SELECT id, password_hash FROM users')) {
      return result([{ id: USER.id, password_hash: storedHash }]);
    }
    if (sql.includes('FROM users WHERE id::text = $1')) return result([USER]);
    if (sql.includes('WHERE username = $2 RETURNING id')) {
      changedHash = params[0];
      return result([{ id: USER.id }]);
    }
    throw new Error(`Unexpected auth query: ${sql}`);
  };

  const loginResponse = await jsonRequest('/api/auth/login', {
    method: 'POST',
    cookie: '',
    body: { username: USER.username, password: legacyPassword },
  });
  assert.equal(loginResponse.status, 200);
  const loginPayload = await loginResponse.json();
  const setCookie = loginResponse.headers.get('set-cookie');
  assert.match(setCookie, /agreen_session=/);
  assert.match(setCookie, /agreen_csrf=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.notEqual(storedHash, legacyHash);
  assert.equal(await bcrypt.compare(legacyPassword, storedHash), true);

  const sessionValue = setCookie.match(/agreen_session=([^;,]+)/)?.[1];
  const loginCookie = `agreen_session=${sessionValue}; agreen_csrf=${loginPayload.data.csrfToken}`;
  const changeResponse = await jsonRequest('/api/auth/change-password', {
    method: 'POST',
    cookie: loginCookie,
    csrfToken: loginPayload.data.csrfToken,
    body: {
      username: USER.username,
      oldPassword: legacyPassword,
      newPassword: nextPassword,
    },
  });
  assert.equal(changeResponse.status, 200);
  assert.equal(await bcrypt.compare(nextPassword, changedHash), true);
  assert.match(changeResponse.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(passwordValidationError('weak'), 'Mật khẩu mới phải có ít nhất 12 ký tự');

  const logoutResponse = await jsonRequest('/api/auth/logout', {
    method: 'POST',
    cookie: loginCookie,
    csrfToken: loginPayload.data.csrfToken,
  });
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get('set-cookie'), /Max-Age=0/);
});

test('overlapping rental request returns 409 and rolls back', async () => {
  app.locals.dbQuery = authQuery;
  const statements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql) => {
    statements.push(sql);
    if (sql === 'BEGIN' || sql === 'ROLLBACK') return result();
    if (sql.includes('FROM vehicles v') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: '51A-123.45',
        status: 'Reserved',
        operational_status: 'Available',
        current_mileage: 50_000,
        daily_rate: 500_000,
        owner_commission_rate: 70,
      }]);
    }
    if (sql.includes('FROM customers WHERE phone')) return result([{ id: 'customer-1' }]);
    if (sql.includes('SELECT id FROM rentals')) return result([{ id: 'RNT-existing' }]);
    throw new Error(`Unexpected overlap query: ${sql}`);
  });

  const response = await jsonRequest('/api/rentals', {
    method: 'POST',
    body: {
      id: 'RNT-new',
      carId: '51A-123.45',
      customerName: 'Test Customer',
      customerPhone: '0900000000',
      startDate: '2026-08-01T08:00:00.000Z',
      endDate: '2026-08-03T08:00:00.000Z',
      status: 'pending',
    },
  });
  const payload = await response.json();
  assert.equal(response.status, 409);
  assert.equal(payload.code, 'RENTAL_OVERLAP');
  assert.equal(statements.includes('ROLLBACK'), true);
  assert.equal(statements.includes('COMMIT'), false);
});

test('return and cancel rental synchronize vehicle mileage/status and customer counters', async () => {
  app.locals.dbQuery = authQuery;
  const currentRental = {
    id: 'RNT-1',
    car_id: '51A-123.45',
    customer_phone: '0900000000',
    start_date: '2026-08-01T08:00:00.000Z',
    end_date: '2026-08-03T08:00:00.000Z',
    status: 'active',
    rental_fee: 1_000_000,
    delivery_fee: 100_000,
    extra_fee: 0,
    discount_amount: 0,
    start_km: 50_000,
    end_km: null,
    violations: [{ amount: 200_000 }],
  };

  const completeStatements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql, params = []) => {
    completeStatements.push({ sql, params });
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('SELECT * FROM rentals WHERE id=$1 FOR UPDATE')) return result([currentRental]);
    if (sql.includes('FROM vehicles v') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: currentRental.car_id,
        operational_status: 'Available',
        current_mileage: 50_000,
        daily_rate: 500_000,
        owner_commission_rate: 70,
      }]);
    }
    if (sql.includes('FROM customers WHERE phone')) return result([{ id: 'customer-1' }]);
    if (sql.startsWith('UPDATE rentals')) {
      return result([{ ...currentRental, status: 'completed', end_km: 55_000, total_amount: 1_350_000 }]);
    }
    if (sql.includes('SELECT status FROM rentals')) return result([]);
    if (sql.startsWith('UPDATE vehicles')) return result([{ id: 'vehicle-1' }]);
    if (sql.startsWith('UPDATE customers')) return result([{ id: 'customer-1' }]);
    throw new Error(`Unexpected complete query: ${sql}`);
  });

  const completeResponse = await jsonRequest('/api/rentals/RNT-1/complete', {
    method: 'POST',
    body: { endKm: 55_000, endFuel: 'full', extraFee: 50_000 },
  });
  assert.equal(completeResponse.status, 200);
  const updateRentalStatement = completeStatements.find(({ sql }) => sql.startsWith('UPDATE rentals'));
  assert.equal(updateRentalStatement.params.includes(1_350_000), true);
  assert.equal(completeStatements.some(({ sql }) => sql.startsWith('UPDATE vehicles')), true);
  assert.equal(completeStatements.some(({ sql }) => sql.startsWith('UPDATE customers')), true);
  assert.equal(completeStatements.at(-1).sql, 'COMMIT');

  const deleteStatements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql) => {
    deleteStatements.push(sql);
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('SELECT * FROM rentals WHERE id=$1 FOR UPDATE')) return result([currentRental]);
    if (sql.includes('FROM vehicles v') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: currentRental.car_id,
        operational_status: 'Available',
        current_mileage: 50_000,
        daily_rate: 500_000,
        owner_commission_rate: 70,
      }]);
    }
    if (sql.includes('FROM customers WHERE phone')) return result([{ id: 'customer-1' }]);
    if (sql.startsWith('UPDATE rentals')) return result([{ ...currentRental, status: 'cancelled' }]);
    if (sql.includes('SELECT status FROM rentals')) return result([]);
    if (sql.startsWith('UPDATE vehicles')) return result([{ id: 'vehicle-1' }]);
    if (sql.startsWith('UPDATE customers')) return result([{ id: 'customer-1' }]);
    throw new Error(`Unexpected delete query: ${sql}`);
  });

  const deleteResponse = await jsonRequest('/api/rentals/RNT-1/cancel', {
    method: 'POST',
    body: { reason: 'Customer request' },
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteStatements.some((sql) => sql.startsWith('UPDATE vehicles')), true);
  assert.equal(deleteStatements.some((sql) => sql.startsWith('UPDATE customers')), true);
  assert.equal(deleteStatements.at(-1), 'COMMIT');
});

test('rental deposit receipt status can be updated without changing pricing', async () => {
  app.locals.dbQuery = authQuery;
  const currentRental = {
    id: 'RNT-DEPOSIT',
    car_id: '51A-123.45',
    customer_phone: '0900000000',
    start_date: '2026-08-01T08:00:00.000Z',
    end_date: '2026-08-03T08:00:00.000Z',
    status: 'active',
    rental_fee: 1_000_000,
    delivery_fee: 0,
    extra_fee: 0,
    discount_amount: 0,
    violations: [],
    deposit_status: 'pending',
  };
  const statements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql, params = []) => {
    statements.push({ sql, params });
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('SELECT * FROM rentals WHERE id=$1 FOR UPDATE')) return result([currentRental]);
    if (sql.includes('FROM vehicles v') && sql.includes('FOR UPDATE')) {
      return result([{
        id: 'vehicle-1',
        plate_number: currentRental.car_id,
        operational_status: 'Available',
        current_mileage: 50_000,
        daily_rate: 500_000,
        owner_commission_rate: 70,
      }]);
    }
    if (sql.includes('FROM customers WHERE phone')) return result([{ id: 'customer-1' }]);
    if (sql.includes('SELECT id FROM rentals')) return result([]);
    if (sql.startsWith('UPDATE rentals SET')) {
      return result([{ ...currentRental, deposit_status: 'received' }]);
    }
    if (sql.includes('SELECT status FROM rentals')) return result([{ status: 'active' }]);
    if (sql.startsWith('UPDATE vehicles')) return result([{ id: 'vehicle-1' }]);
    if (sql.startsWith('UPDATE customers')) return result([{ id: 'customer-1' }]);
    throw new Error(`Unexpected deposit status query: ${sql}`);
  });

  const response = await jsonRequest('/api/rentals/RNT-DEPOSIT', {
    method: 'PUT',
    body: { depositStatus: 'received' },
  });
  assert.equal(response.status, 200);
  const rentalUpdate = statements.find(({ sql }) => sql.startsWith('UPDATE rentals SET'));
  assert.match(rentalUpdate.sql, /"deposit_status"/);
  assert.doesNotMatch(rentalUpdate.sql, /pricing_days|rental_fee|total_amount/);
  assert.equal(rentalUpdate.params.includes('received'), true);
  assert.equal(statements.at(-1).sql, 'COMMIT');
});

test('marking a cash deposit returned records the refund and completion timestamp', async () => {
  app.locals.dbQuery = authQuery;
  const currentRental = {
    id: 'RNT-RETURN-DEPOSIT',
    car_id: '51A-123.45',
    customer_phone: '0900000000',
    deposit_type: 'cash',
    deposit_status: 'received',
    deposit_returned_at: null,
    total_amount: 2_000_000,
  };
  const statements = [];
  app.locals.getDbClient = async () => transactionClient(async (sql, params = []) => {
    statements.push({ sql, params });
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('SELECT * FROM rentals WHERE id=$1 FOR UPDATE')) return result([currentRental]);
    if (sql.includes('AS held_deposit') && sql.includes('GROUP BY r.id, r.deposit_type')) {
      return result([{ deposit_type: 'cash', held_deposit: 5_000_000 }]);
    }
    if (sql.startsWith('INSERT INTO rental_payments')) return result([{ id: 'payment-1' }]);
    if (sql.includes('AS applied') && sql.includes('AS held_deposit')) {
      return result([{ total_amount: 2_000_000, applied: 0, held_deposit: 0 }]);
    }
    if (sql.startsWith('UPDATE rentals SET payment_status')) return result([{ id: currentRental.id }]);
    if (sql.startsWith('UPDATE rentals') && sql.includes("deposit_status='received'")) {
      return result([{
        ...currentRental,
        deposit_returned_at: '2026-08-14T08:00:00.000Z',
      }]);
    }
    throw new Error(`Unexpected returned deposit query: ${sql}`);
  });

  const response = await jsonRequest('/api/rentals/RNT-RETURN-DEPOSIT/deposit-state', {
    method: 'PUT',
    body: {
      depositState: 'returned',
      returnedAt: '2026-08-14T08:00:00.000Z',
      note: 'Đã trả cọc cho khách',
    },
  });
  assert.equal(response.status, 200);
  const refundInsert = statements.find(({ sql }) => sql.startsWith('INSERT INTO rental_payments'));
  assert.match(refundInsert.sql, /'deposit_refund'/);
  assert.equal(refundInsert.params.includes(5_000_000), true);
  const finalUpdate = statements.find(({ sql }) => (
    sql.startsWith('UPDATE rentals') && sql.includes("deposit_status='received'")
  ));
  assert.match(finalUpdate.sql, /deposit_returned_at/);
  assert.equal(finalUpdate.params.includes('2026-08-14T08:00:00.000Z'), true);
  assert.equal(statements.at(-1).sql, 'COMMIT');
});

test('expense and scheduled service-order PUT endpoints persist editable fields', async () => {
  const expenseStatements = [];
  app.locals.dbQuery = async (sql, params = []) => {
    if (sql.includes('FROM users WHERE id::text')) return result([USER]);
    expenseStatements.push({ sql, params });
    if (sql.includes('SELECT id FROM vehicles')) {
      return result([{ id: '22222222-2222-4222-8222-222222222222' }]);
    }
    if (sql.startsWith('UPDATE expenses SET')) {
      return result([{
        id: 'EXP-1',
        title: 'Fuel',
        amount: 500_000,
        category: 'fuel',
        expense_date: '2026-07-28',
        ref: '51A-123.45',
        location: 'HCM',
      }]);
    }
    throw new Error(`Unexpected expense query: ${sql}`);
  };

  const expenseResponse = await jsonRequest('/api/expenses/EXP-1', {
    method: 'PUT',
    body: {
      title: 'Fuel',
      amount: 500_000,
      category: 'fuel',
      date: '2026-07-28',
      ref: '51A-123.45',
      location: 'HCM',
    },
  });
  assert.equal(expenseResponse.status, 200);
  const expenseUpdate = expenseStatements.find(({ sql }) => sql.startsWith('UPDATE expenses SET'));
  assert.match(expenseUpdate.sql, /"title"/);
  assert.match(expenseUpdate.sql, /"expense_date"/);
  assert.match(expenseUpdate.sql, /"vehicle_id"/);
  assert.equal(expenseUpdate.params.includes('22222222-2222-4222-8222-222222222222'), true);

  app.locals.dbQuery = authQuery;
  const serviceStatements = [];
  const currentService = {
    id: 'SRV-1',
    car_id: '51A-123.45',
    driver_id: 'DRV-1',
    status: 'scheduled',
    service_date: '2026-08-01T08:00:00.000Z',
    scheduled_end_at: '2026-08-01T10:00:00.000Z',
    start_km: 10_000,
    end_km: 10_100,
    distance_km: 100,
    price_per_km: 10_000,
    extra_fee: 0,
    total_amount: 1_000_000,
    driver_commission_rate: 70,
  };
  app.locals.getDbClient = async () => transactionClient(async (sql, params = []) => {
    serviceStatements.push({ sql, params });
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return result();
    if (sql.includes('SELECT * FROM service_orders')) return result([currentService]);
    if (sql.includes('FROM vehicles WHERE')) {
      return result([{
        id: 'vehicle-1',
        operational_status: 'Available',
        current_mileage: 10_000,
      }]);
    }
    if (sql.includes('FROM drivers WHERE')) return result([{ id: 'DRV-1', status: 'available' }]);
    if (sql.includes('SELECT id FROM rentals')) return result([]);
    if (sql.includes('SELECT id FROM service_orders')) return result([]);
    if (sql.startsWith('UPDATE service_orders SET')) {
      return result([{
        ...currentService,
        pickup_location: 'Quận 1',
        dropoff_location: 'Thủ Đức',
      }]);
    }
    if (sql.startsWith('UPDATE drivers')) return result([{ id: 'DRV-1' }]);
    throw new Error(`Unexpected service query: ${sql}`);
  });

  const serviceResponse = await jsonRequest('/api/service-orders/SRV-1', {
    method: 'PUT',
    body: {
      pickupLocation: 'Quận 1',
      dropoffLocation: 'Thủ Đức',
    },
  });
  assert.equal(serviceResponse.status, 200);
  const serviceUpdate = serviceStatements.find(({ sql }) => sql.startsWith('UPDATE service_orders SET'));
  assert.match(serviceUpdate.sql, /"pickup_location"/);
  assert.match(serviceUpdate.sql, /"dropoff_location"/);
  assert.equal(serviceStatements.at(-1).sql, 'COMMIT');
});

test('rental overlap helper treats touching intervals as non-overlapping', () => {
  assert.equal(
    rentalTestHelpers.rentalsOverlap(
      '2026-08-01T00:00:00Z',
      '2026-08-03T00:00:00Z',
      '2026-08-02T00:00:00Z',
      '2026-08-04T00:00:00Z',
    ),
    true,
  );
  assert.equal(
    rentalTestHelpers.rentalsOverlap(
      '2026-08-01T00:00:00Z',
      '2026-08-03T00:00:00Z',
      '2026-08-03T00:00:00Z',
      '2026-08-04T00:00:00Z',
    ),
    false,
  );
});

test('rental pricing accepts a custom rental fee and includes it in the total', () => {
  const pricing = rentalTestHelpers.calculateRentalAmounts({
    startDate: '2026-08-01T08:00:00.000Z',
    endDate: '2026-08-03T08:00:00.000Z',
    dailyRate: 500_000,
    rentalFeeOverride: 750_000,
    deliveryFee: 100_000,
    extraFee: 50_000,
  });

  assert.equal(pricing.pricingDays, 2);
  assert.equal(pricing.rentalFee, 750_000);
  assert.equal(pricing.totalAmount, 900_000);
});

test('server entrypoint detection supports direct Node and PM2 execution', () => {
  const modulePath = '/srv/agreen/server/server.js';
  assert.equal(isServerEntrypoint({
    argvPath: modulePath,
    pmExecPath: undefined,
    modulePath,
  }), true);
  assert.equal(isServerEntrypoint({
    argvPath: '/usr/lib/node_modules/pm2/lib/ProcessContainerFork.js',
    pmExecPath: modulePath,
    modulePath,
  }), true);
  assert.equal(isServerEntrypoint({
    argvPath: '/srv/agreen/tests/api.integration.test.js',
    pmExecPath: undefined,
    modulePath,
  }), false);
});

test('frontend rental mapper preserves status and supports JSONB arrays, strings and objects', async () => {
  const { mapRentalFromDB } = await import('../src/context/rentalMapper.ts');
  const base = {
    id: 'RNT-map',
    car_id: '51A-123.45',
    start_date: '2026-08-01T00:00:00Z',
    end_date: '2026-08-02T00:00:00Z',
    payment_status: 'deposit',
    deposit_status: 'pending',
    status: 'active',
    source: 'system',
  };

  const fromArray = mapRentalFromDB({
    ...base,
    violations: [{ id: 'V1', amount: 100_000 }],
  });
  assert.equal(fromArray.status, 'active');
  assert.equal(fromArray.depositStatus, 'pending');
  assert.equal(fromArray.violations.length, 1);

  const fromString = mapRentalFromDB({
    ...base,
    violations: JSON.stringify([{ id: 'V2', amount: 200_000 }]),
  });
  assert.equal(fromString.violations[0].id, 'V2');

  const fromObject = mapRentalFromDB({
    ...base,
    violations: { id: 'V3', amount: 300_000 },
  });
  assert.equal(fromObject.violations[0].id, 'V3');
});
