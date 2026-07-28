-- Idempotent production migration for existing Agreen databases.
-- Back up the database before applying. This file never deletes business rows.

CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(50) DEFAULT '',
    license_class VARCHAR(20) DEFAULT 'B2',
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    total_trips INT NOT NULL DEFAULT 0,
    assigned_car_id VARCHAR(20),
    avatar TEXT DEFAULT '',
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE rentals
    ADD COLUMN IF NOT EXISTS rental_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS extra_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'deposit',
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS start_km INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS end_km INT,
    ADD COLUMN IF NOT EXISTS start_fuel VARCHAR(20) DEFAULT 'full',
    ADD COLUMN IF NOT EXISTS end_fuel VARCHAR(20),
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS owner_commission_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS condition_images TEXT DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS violations JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE service_orders
    ADD COLUMN IF NOT EXISTS pickup_location TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS dropoff_location TEXT DEFAULT '';

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS vehicle_id UUID,
    ADD COLUMN IF NOT EXISTS ref VARCHAR(100) DEFAULT '';

UPDATE service_orders SET driver_id = NULL WHERE driver_id = '';
ALTER TABLE service_orders ALTER COLUMN driver_id DROP DEFAULT;

DO $$
BEGIN
    IF (
        SELECT data_type = 'uuid'
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'expenses'
          AND column_name = 'vehicle_id'
    ) THEN
        UPDATE expenses e
        SET vehicle_id = v.id
        FROM vehicles v
        WHERE e.vehicle_id IS NULL AND e.ref = v.plate_number;
    ELSE
        UPDATE expenses e
        SET vehicle_id = v.id::text
        FROM vehicles v
        WHERE e.vehicle_id IS NULL AND e.ref = v.plate_number;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_valid_dates') THEN
        ALTER TABLE rentals
            ADD CONSTRAINT rentals_valid_dates CHECK (end_date > start_date) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_car_plate_fk') THEN
        ALTER TABLE rentals
            ADD CONSTRAINT rentals_car_plate_fk
            FOREIGN KEY (car_id) REFERENCES vehicles(plate_number)
            ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_customer_phone_fk') THEN
        ALTER TABLE rentals
            ADD CONSTRAINT rentals_customer_phone_fk
            FOREIGN KEY (customer_phone) REFERENCES customers(phone)
            ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_assigned_car_fk') THEN
        ALTER TABLE drivers
            ADD CONSTRAINT drivers_assigned_car_fk
            FOREIGN KEY (assigned_car_id) REFERENCES vehicles(plate_number)
            ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_car_plate_fk') THEN
        ALTER TABLE service_orders
            ADD CONSTRAINT service_orders_car_plate_fk
            FOREIGN KEY (car_id) REFERENCES vehicles(plate_number)
            ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_driver_fk') THEN
        ALTER TABLE service_orders
            ADD CONSTRAINT service_orders_driver_fk
            FOREIGN KEY (driver_id) REFERENCES drivers(id)
            ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;
    END IF;

    IF (
        SELECT data_type = 'uuid'
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'expenses'
          AND column_name = 'vehicle_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expenses_vehicle_uuid_fk'
    ) THEN
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_vehicle_uuid_fk
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
            ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_driver ON service_orders(driver_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_overlapping_rentals()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('pending', 'active') THEN
        PERFORM pg_advisory_xact_lock(hashtext(NEW.car_id));
        IF EXISTS (
            SELECT 1
            FROM rentals existing
            WHERE existing.car_id = NEW.car_id
              AND existing.id <> NEW.id
              AND existing.status IN ('pending', 'active')
              AND NEW.start_date < existing.end_date
              AND NEW.end_date > existing.start_date
        ) THEN
            RAISE EXCEPTION 'Rental schedule overlaps an existing booking for vehicle %', NEW.car_id
                USING ERRCODE = '23P01';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_rental_overlap ON rentals;
CREATE TRIGGER prevent_rental_overlap
BEFORE INSERT OR UPDATE OF car_id, start_date, end_date, status ON rentals
FOR EACH ROW EXECUTE PROCEDURE prevent_overlapping_rentals();

DROP TRIGGER IF EXISTS update_drivers_modtime ON drivers;
CREATE TRIGGER update_drivers_modtime
BEFORE UPDATE ON drivers
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
