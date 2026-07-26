-- ============================================================
-- AGREEN CAR RENTAL — PostgreSQL Schema
-- Khớp 1:1 với các interface trong src/context/AppContext.tsx
-- An toàn khi chạy lại nhiều lần (idempotent) — dùng được với
-- PostgreSQL Manager của aaPanel mà KHÔNG cần quyền superuser.
-- Yêu cầu: PostgreSQL >= 13
-- ============================================================

-- ------------------------------------------------------------
-- Hàm tự cập nhật updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. USERS (tài khoản quản trị)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash TEXT         NOT NULL,
    full_name     VARCHAR(100) NOT NULL DEFAULT 'Quản trị viên',
    role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
    avatar        TEXT         NOT NULL DEFAULT '',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. SECURITY LOGS (nhật ký bảo mật)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_logs (
    id         TEXT PRIMARY KEY,
    type       VARCHAR(30) NOT NULL,  -- LOGIN_SUCCESS | LOGIN_FAILED | LOCKOUT | PASSWORD_CHANGE
    message    TEXT        NOT NULL,
    username   VARCHAR(50) NOT NULL DEFAULT 'khách',
    ip         VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at DESC);

-- ------------------------------------------------------------
-- 3. LOGIN ATTEMPTS (chống brute-force phía SERVER)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
    ip            VARCHAR(64) PRIMARY KEY,
    failed_count  INT         NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. OWNERS (chủ xe / đối tác ký gửi)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owners (
    id              TEXT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    address         TEXT         NOT NULL DEFAULT '',
    notes           TEXT         NOT NULL DEFAULT '',
    image           TEXT         NOT NULL DEFAULT '',
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 75,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT owners_commission_range CHECK (commission_rate >= 0 AND commission_rate <= 100)
);
CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);

-- ------------------------------------------------------------
-- 5. CARS (đội xe) — khoá chính là BIỂN SỐ, giống frontend
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
    id                   TEXT PRIMARY KEY,          -- biển số, vd '51F-123.45'
    name                 VARCHAR(100) NOT NULL,
    brand                VARCHAR(50)  NOT NULL DEFAULT 'Khác',
    year                 VARCHAR(8)   NOT NULL DEFAULT '',
    seats                INT          NOT NULL DEFAULT 5,
    status               VARCHAR(20)  NOT NULL DEFAULT 'ready',
    color                VARCHAR(40)  NOT NULL DEFAULT '',
    image                TEXT         NOT NULL DEFAULT '',
    km                   INT          NOT NULL DEFAULT 0,
    customer             VARCHAR(100),
    time_remaining       VARCHAR(40),
    owner_phone          VARCHAR(20)  NOT NULL,
    expiry_registration  DATE,
    expiry_insurance     DATE,
    expiry_license       DATE,
    price_per_hour       BIGINT       NOT NULL DEFAULT 0,
    price_per_day        BIGINT       NOT NULL DEFAULT 0,
    price_per_week       BIGINT       NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT cars_status_valid    CHECK (status IN ('ready','rented','maintenance','suspended')),
    CONSTRAINT cars_km_positive     CHECK (km >= 0),
    CONSTRAINT cars_prices_positive CHECK (price_per_hour >= 0 AND price_per_day >= 0 AND price_per_week >= 0)
);
CREATE INDEX IF NOT EXISTS idx_cars_status      ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_owner_phone ON cars(owner_phone);

-- ------------------------------------------------------------
-- 6. CUSTOMERS (khách hàng)
-- Chú ý: active_rentals / total_rentals KHÔNG lưu ở đây —
-- được tính động qua view customers_with_stats để không lệch số.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id             TEXT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    phone          VARCHAR(20)  NOT NULL UNIQUE,
    license        VARCHAR(60)  NOT NULL DEFAULT '',
    cccd           VARCHAR(30)  NOT NULL DEFAULT '',
    address        TEXT         NOT NULL DEFAULT '',
    classification VARCHAR(20)  NOT NULL DEFAULT 'normal',
    notes          TEXT         NOT NULL DEFAULT '',
    status         VARCHAR(20)  NOT NULL DEFAULT 'verified',
    status_text    VARCHAR(60)  NOT NULL DEFAULT 'Đã xác minh',
    image          TEXT         NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_classification_valid CHECK (classification IN ('normal','vip','warning')),
    CONSTRAINT customers_status_valid         CHECK (status IN ('verified','expired'))
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name  ON customers(lower(name));

-- ------------------------------------------------------------
-- 7. RENTALS (đơn thuê / hợp đồng)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rentals (
    id                      TEXT PRIMARY KEY,       -- vd 'RNT-000128'
    car_id                  TEXT         NOT NULL REFERENCES cars(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    customer_name           VARCHAR(100) NOT NULL,
    customer_phone          VARCHAR(20)  NOT NULL,
    start_date              TIMESTAMPTZ  NOT NULL,
    end_date                TIMESTAMPTZ  NOT NULL,
    rental_fee              BIGINT       NOT NULL DEFAULT 0,
    delivery_fee            BIGINT       NOT NULL DEFAULT 0,
    deposit                 BIGINT       NOT NULL DEFAULT 0,
    extra_fee               BIGINT       NOT NULL DEFAULT 0,
    total_amount            BIGINT       NOT NULL DEFAULT 0,
    payment_status          VARCHAR(20)  NOT NULL DEFAULT 'deposit',
    status                  VARCHAR(20)  NOT NULL DEFAULT 'pending',
    start_km                INT          NOT NULL DEFAULT 0,
    end_km                  INT,
    start_fuel              VARCHAR(20)  NOT NULL DEFAULT '8/8',
    end_fuel                VARCHAR(20),
    source                  VARCHAR(20)  NOT NULL DEFAULT 'system',
    file_url                TEXT,
    file_name               VARCHAR(255),
    owner_commission_amount BIGINT       NOT NULL DEFAULT 0,
    condition_images        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    delivered_at            TIMESTAMPTZ,
    returned_at             TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT rentals_payment_status_valid CHECK (payment_status IN ('deposit','paid','debt')),
    CONSTRAINT rentals_status_valid         CHECK (status IN ('pending','active','completed','cancelled')),
    CONSTRAINT rentals_source_valid         CHECK (source IN ('system','uploaded')),
    CONSTRAINT rentals_dates_order          CHECK (end_date >= start_date),
    CONSTRAINT rentals_km_order             CHECK (end_km IS NULL OR end_km >= start_km)
);
CREATE INDEX IF NOT EXISTS idx_rentals_car    ON rentals(car_id);
CREATE INDEX IF NOT EXISTS idx_rentals_phone  ON rentals(customer_phone);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_dates  ON rentals(start_date, end_date);

-- Chặn 2 đơn ĐANG CHẠY trên cùng 1 xe (double-booking) ở tầng DB
CREATE UNIQUE INDEX IF NOT EXISTS idx_rentals_one_active_per_car
    ON rentals(car_id) WHERE status = 'active';

-- ------------------------------------------------------------
-- 8. VIOLATIONS (phạt nguội / hư hỏng gắn với đơn thuê)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS violations (
    id           TEXT PRIMARY KEY,
    rental_id    TEXT        NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    date         DATE        NOT NULL,
    description  TEXT        NOT NULL DEFAULT '',
    amount       BIGINT      NOT NULL DEFAULT 0,
    evidence_url TEXT,
    status       VARCHAR(10) NOT NULL DEFAULT 'unpaid',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT violations_status_valid CHECK (status IN ('paid','unpaid'))
);
CREATE INDEX IF NOT EXISTS idx_violations_rental ON violations(rental_id);

-- ------------------------------------------------------------
-- 9. DRIVERS (tài xế)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
    id              TEXT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    license_number  VARCHAR(40)  NOT NULL DEFAULT '',
    license_class   VARCHAR(10)  NOT NULL DEFAULT 'B2',
    status          VARCHAR(20)  NOT NULL DEFAULT 'available',
    address         TEXT,
    notes           TEXT,
    assigned_car_id TEXT REFERENCES cars(id) ON UPDATE CASCADE ON DELETE SET NULL,
    avatar          TEXT,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 80,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT drivers_status_valid     CHECK (status IN ('available','on_trip','off')),
    CONSTRAINT drivers_commission_range CHECK (commission_rate >= 0 AND commission_rate <= 100)
);

-- ------------------------------------------------------------
-- 10. SERVICE ORDERS (chuyến dịch vụ do tài xế chạy)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_orders (
    id                       TEXT PRIMARY KEY,      -- vd 'SRV-000042'
    car_id                   TEXT         NOT NULL REFERENCES cars(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    driver_id                TEXT         REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name              VARCHAR(100) NOT NULL DEFAULT '',
    driver_phone             VARCHAR(20)  NOT NULL DEFAULT '',
    customer_name            VARCHAR(100) NOT NULL DEFAULT '',
    customer_phone           VARCHAR(20)  NOT NULL DEFAULT '',
    pickup_location          TEXT,
    dropoff_location         TEXT,
    service_date             TIMESTAMPTZ  NOT NULL,
    start_km                 INT          NOT NULL DEFAULT 0,
    end_km                   INT          NOT NULL DEFAULT 0,
    distance_km              INT          NOT NULL DEFAULT 0,
    price_per_km             BIGINT       NOT NULL DEFAULT 0,
    extra_fee                BIGINT       NOT NULL DEFAULT 0,
    total_amount             BIGINT       NOT NULL DEFAULT 0,
    driver_commission_rate   NUMERIC(5,2) NOT NULL DEFAULT 80,
    driver_commission_amount BIGINT       NOT NULL DEFAULT 0,
    payment_status           VARCHAR(10)  NOT NULL DEFAULT 'unpaid',
    status                   VARCHAR(20)  NOT NULL DEFAULT 'completed',
    notes                    TEXT,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT so_payment_status_valid CHECK (payment_status IN ('paid','unpaid')),
    CONSTRAINT so_status_valid         CHECK (status IN ('completed','ongoing','cancelled')),
    CONSTRAINT so_km_order             CHECK (end_km >= start_km),
    CONSTRAINT so_commission_range     CHECK (driver_commission_rate >= 0 AND driver_commission_rate <= 100)
);
CREATE INDEX IF NOT EXISTS idx_service_orders_car    ON service_orders(car_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_driver ON service_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_date   ON service_orders(service_date DESC);

-- ------------------------------------------------------------
-- 11. EXPENSES (sổ chi phí vận hành)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id         TEXT PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    amount     BIGINT       NOT NULL DEFAULT 0,
    category   VARCHAR(50)  NOT NULL DEFAULT 'Khác',
    date       DATE         NOT NULL,
    ref        VARCHAR(100) NOT NULL DEFAULT '',
    location   VARCHAR(200),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_ref      ON expenses(ref);

-- ------------------------------------------------------------
-- 12. IMAGES (thư viện tệp & ảnh dùng chung)
-- File thật nằm trong server/uploads/, DB chỉ lưu đường dẫn
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS images (
    id         TEXT PRIMARY KEY,
    url        TEXT         NOT NULL,
    name       VARCHAR(255) NOT NULL DEFAULT '',
    mime_type  VARCHAR(100) NOT NULL DEFAULT '',
    size_bytes BIGINT       NOT NULL DEFAULT 0,
    used_in    VARCHAR(200),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);

-- ------------------------------------------------------------
-- 13. SETTINGS (cấu hình hệ thống — chỉ 1 dòng)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id             INT PRIMARY KEY DEFAULT 1,
    logo           TEXT        NOT NULL DEFAULT 'Auto',
    logo_history   JSONB       NOT NULL DEFAULT '["Auto"]'::jsonb,
    favicon        TEXT        NOT NULL DEFAULT 'Auto',
    primary_color  VARCHAR(20) NOT NULL DEFAULT '#006837',
    contract_terms TEXT        NOT NULL DEFAULT '',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT settings_singleton CHECK (id = 1)
);

-- ------------------------------------------------------------
-- TRIGGERS updated_at (DROP trước nên chạy lại file này an toàn)
-- ------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
    tbls TEXT[] := ARRAY['users','owners','cars','customers','rentals','violations','drivers','service_orders','expenses','settings'];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- SEQUENCES cho mã đơn dễ đọc (RNT-000001, SRV-000001)
-- Thay cho Date.now().slice(-4) vốn bị trùng mã sau mỗi 10 giây
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS rental_code_seq  START 1;
CREATE SEQUENCE IF NOT EXISTS service_code_seq START 1;

-- ------------------------------------------------------------
-- VIEW: khách hàng kèm số lượt thuê TÍNH ĐỘNG
-- (nguồn sự thật duy nhất -> hết cảnh đếm đôi activeRentals)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW customers_with_stats AS
SELECT
    c.*,
    COALESCE(s.active_rentals, 0)::int AS active_rentals,
    COALESCE(s.total_rentals,  0)::int AS total_rentals
FROM customers c
LEFT JOIN (
    SELECT
        customer_phone,
        COUNT(*) FILTER (WHERE status IN ('pending','active')) AS active_rentals,
        COUNT(*) FILTER (WHERE status <> 'cancelled')          AS total_rentals
    FROM rentals
    GROUP BY customer_phone
) s ON s.customer_phone = c.phone;

-- ------------------------------------------------------------
-- VIEW: tài xế kèm tổng số chuyến TÍNH ĐỘNG
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW drivers_with_stats AS
SELECT
    d.*,
    COALESCE(s.total_trips, 0)::int AS total_trips
FROM drivers d
LEFT JOIN (
    SELECT driver_id, COUNT(*) FILTER (WHERE status <> 'cancelled') AS total_trips
    FROM service_orders
    GROUP BY driver_id
) s ON s.driver_id = d.id;
