-- ============================================================
-- PostgreSQL Database Schema for Car Rental Management System
-- Compatible with aaPanel PostgreSQL (non-superuser account)
-- Version 2.0 – Production Ready
-- ============================================================

-- Safe extension loading (ignored if user has no superuser rights)
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "pg_trgm"; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Universal UUID generator: works on PostgreSQL 13+ without any extension
CREATE OR REPLACE FUNCTION generate_uuid_v4()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
EXCEPTION WHEN OTHERS THEN
    RETURN cast(md5(random()::text || clock_timestamp()::text) as uuid);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USERS / ACCOUNTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. OWNERS TABLE (Chủ xe ký gửi)
-- ============================================================
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    address TEXT DEFAULT '',
    id_card VARCHAR(20) DEFAULT '',
    bank_account VARCHAR(50) DEFAULT '',
    bank_name VARCHAR(100) DEFAULT '',
    commission_rate NUMERIC(5,2) DEFAULT 0.00,
    notes TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. VEHICLES TABLE (Đội xe)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL DEFAULT 2024,
    color VARCHAR(30) DEFAULT 'Trắng',
    seats INT DEFAULT 4,
    transmission VARCHAR(20) DEFAULT 'Automatic',
    fuel_type VARCHAR(20) DEFAULT 'Gasoline',
    daily_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(12, 2) DEFAULT 0.00,
    weekly_rate NUMERIC(12, 2) DEFAULT 0.00,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Available',
    current_mileage INT DEFAULT 0,
    registration_expiry DATE,
    insurance_expiry DATE,
    license_expiry DATE,
    image_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. CUSTOMERS TABLE (Khách hàng)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) DEFAULT '',
    id_card VARCHAR(20) DEFAULT '',
    driver_license VARCHAR(30) DEFAULT '',
    address TEXT DEFAULT '',
    city VARCHAR(50) DEFAULT '',
    classification VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'Active',
    notes TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    active_rentals INT DEFAULT 0,
    total_rentals INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. RENTALS TABLE (Đơn thuê xe – Source of Truth)
-- ============================================================
CREATE TABLE IF NOT EXISTS rentals (
    id VARCHAR(50) PRIMARY KEY,
    car_id VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    rental_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(12,2) DEFAULT 0,
    deposit NUMERIC(12,2) DEFAULT 0,
    extra_fee NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'deposit',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    start_km INT DEFAULT 0,
    end_km INT,
    start_fuel VARCHAR(20) DEFAULT 'full',
    end_fuel VARCHAR(20),
    source VARCHAR(20) DEFAULT 'system',
    file_url TEXT DEFAULT '',
    file_name VARCHAR(255) DEFAULT '',
    owner_commission_amount NUMERIC(12,2) DEFAULT 0,
    condition_images TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    delivered_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. EXPENSES TABLE (Chi phí vận hành)
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title VARCHAR(200) NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    ref VARCHAR(100) DEFAULT '',
    location VARCHAR(200) DEFAULT '',
    description TEXT DEFAULT '',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. CONTRACTS TABLE (Hợp đồng chính thức)
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_return_date TIMESTAMP WITH TIME ZONE,
    daily_rate NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    deposit_amount NUMERIC(12, 2) DEFAULT 0.00,
    deposit_type VARCHAR(50) DEFAULT 'Cash',
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Unpaid',
    start_mileage INT DEFAULT 0,
    end_mileage INT,
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. SERVICE ORDERS TABLE (Đơn dịch vụ / Tài xế)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_orders (
    id VARCHAR(50) PRIMARY KEY,
    car_id VARCHAR(20) NOT NULL,
    driver_id VARCHAR(50) DEFAULT '',
    driver_name VARCHAR(100) DEFAULT '',
    driver_phone VARCHAR(20) DEFAULT '',
    customer_name VARCHAR(100) DEFAULT '',
    customer_phone VARCHAR(20) DEFAULT '',
    service_date TIMESTAMP WITH TIME ZONE NOT NULL,
    start_km INT DEFAULT 0,
    end_km INT DEFAULT 0,
    distance_km INT DEFAULT 0,
    price_per_km NUMERIC(12,2) DEFAULT 0,
    extra_fee NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    driver_commission_rate NUMERIC(5,2) DEFAULT 0,
    driver_commission_amount NUMERIC(12,2) DEFAULT 0,
    payment_status VARCHAR(30) DEFAULT 'unpaid',
    status VARCHAR(30) DEFAULT 'completed',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_id_card ON customers(id_card);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);

CREATE INDEX IF NOT EXISTS idx_rentals_car_id ON rentals(car_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle ON contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_service_orders_car ON service_orders(car_id);

-- ============================================================
-- AUTO UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_owners_modtime ON owners;
CREATE TRIGGER update_owners_modtime BEFORE UPDATE ON owners FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_modtime ON vehicles;
CREATE TRIGGER update_vehicles_modtime BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_modtime ON customers;
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_rentals_modtime ON rentals;
CREATE TRIGGER update_rentals_modtime BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_modtime ON contracts;
CREATE TRIGGER update_contracts_modtime BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_modtime ON expenses;
CREATE TRIGGER update_expenses_modtime BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_orders_modtime ON service_orders;
CREATE TRIGGER update_service_orders_modtime BEFORE UPDATE ON service_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
