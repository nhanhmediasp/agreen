-- ============================================================
-- PostgreSQL Database Schema for Car Rental Management System
-- Optimized for high performance, compatibility & data integrity
-- Compatible with aaPanel PostgreSQL / VPanel PostgreSQL
-- ============================================================

-- Try loading extensions if user has superuser rights (ignored if fails)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Fallback UUID generator function compatible with all PostgreSQL versions
CREATE OR REPLACE FUNCTION generate_uuid_v4()
RETURNS UUID AS $$
BEGIN
    -- Try native gen_random_uuid() (PostgreSQL 13+)
    RETURN gen_random_uuid();
EXCEPTION WHEN OTHERS THEN
    BEGIN
        -- Try extension uuid_generate_v4() if available
        RETURN uuid_generate_v4();
    EXCEPTION WHEN OTHERS THEN
        -- Pure SQL random UUID fallback
        RETURN cast(md5(random()::text || clock_timestamp()::text) as uuid);
    END;
END;
$$ LANGUAGE plpgsql;

-- 1. USERS / ACCOUNTS TABLE
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

-- 2. OWNERS TABLE (Chủ xe)
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    id_card VARCHAR(20),
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. VEHICLES TABLE (Danh sách Xe)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(30),
    seats INT DEFAULT 4,
    transmission VARCHAR(20) DEFAULT 'Automatic',
    fuel_type VARCHAR(20) DEFAULT 'Gasoline',
    daily_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monthly_rate NUMERIC(12, 2) DEFAULT 0.00,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Available',
    current_mileage INT DEFAULT 0,
    registration_expiry DATE,
    insurance_expiry DATE,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CUSTOMERS TABLE (Khách hàng)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    id_card VARCHAR(20) UNIQUE,
    driver_license VARCHAR(30),
    address TEXT,
    city VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. RENTAL CONTRACTS TABLE (Hợp đồng cho thuê)
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
    start_mileage INT,
    end_mileage INT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SERVICE ORDERS TABLE (Bảo dưỡng & Sửa chữa)
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    garage_name VARCHAR(100),
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    service_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Completed',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. EXPENSES TABLE (Chi phí vận hành)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_id_card ON customers(id_card);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);

CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle ON contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_payment_status ON contracts(payment_status);

CREATE INDEX IF NOT EXISTS idx_service_orders_vehicle ON service_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ============================================================
-- AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_owners_modtime ON owners;
CREATE TRIGGER update_owners_modtime BEFORE UPDATE ON owners FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_modtime ON vehicles;
CREATE TRIGGER update_vehicles_modtime BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_modtime ON customers;
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_modtime ON contracts;
CREATE TRIGGER update_contracts_modtime BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_orders_modtime ON service_orders;
CREATE TRIGGER update_service_orders_modtime BEFORE UPDATE ON service_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_modtime ON expenses;
CREATE TRIGGER update_expenses_modtime BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
