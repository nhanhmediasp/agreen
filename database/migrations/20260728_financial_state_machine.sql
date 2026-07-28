-- Financial ledger and workflow hardening for existing Agreen PostgreSQL databases.
-- Create a backup and verify this migration on staging before production use.
-- This migration is additive and does not delete or rewrite business records.

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS operational_status VARCHAR(20) NOT NULL DEFAULT 'Available';

UPDATE vehicles
SET operational_status = status
WHERE status IN ('Maintenance', 'Suspended')
  AND operational_status = 'Available';

ALTER TABLE rentals
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pricing_days INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE service_orders
    ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS rental_payments (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    rental_id VARCHAR(50) NOT NULL REFERENCES rentals(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    payment_type VARCHAR(30) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT NOT NULL DEFAULT '',
    idempotency_key VARCHAR(100),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rental_payments_type_check CHECK (
        payment_type IN (
            'deposit', 'deposit_application', 'balance',
            'deposit_refund', 'surcharge', 'refund'
        )
    ),
    CONSTRAINT rental_payments_status_check CHECK (
        status IN ('pending', 'completed', 'void')
    ),
    CONSTRAINT rental_payments_idempotency_unique UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS owner_payouts (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,
    note TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT owner_payouts_valid_period CHECK (period_end > period_start),
    CONSTRAINT owner_payouts_status_check CHECK (
        status IN ('draft', 'confirmed', 'cancelled')
    )
);

CREATE TABLE IF NOT EXISTS service_order_payments (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    service_order_id VARCHAR(50) NOT NULL REFERENCES service_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    payment_type VARCHAR(20) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT NOT NULL DEFAULT '',
    idempotency_key VARCHAR(100),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_order_payments_type_check CHECK (
        payment_type IN ('payment', 'refund')
    ),
    CONSTRAINT service_order_payments_status_check CHECK (
        status IN ('pending', 'completed', 'void')
    ),
    CONSTRAINT service_order_payments_idempotency_unique UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS owner_payout_items (
    id UUID PRIMARY KEY DEFAULT generate_uuid_v4(),
    payout_id UUID NOT NULL REFERENCES owner_payouts(id) ON DELETE CASCADE,
    rental_id VARCHAR(50) NOT NULL REFERENCES rentals(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'included',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT owner_payout_items_status_check CHECK (status IN ('included', 'released'))
);

CREATE INDEX IF NOT EXISTS idx_rental_payments_rental
    ON rental_payments(rental_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_rental_payments_status
    ON rental_payments(status);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_owner_period
    ON owner_payouts(owner_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_service_order_payments_order
    ON service_order_payments(service_order_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_owner_payout_items_payout
    ON owner_payout_items(payout_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_payout_items_unpaid_rental
    ON owner_payout_items(rental_id)
    WHERE status = 'included';
CREATE INDEX IF NOT EXISTS idx_service_orders_schedule
    ON service_orders(service_date, scheduled_end_at);

DROP TRIGGER IF EXISTS update_rental_payments_modtime ON rental_payments;
CREATE TRIGGER update_rental_payments_modtime
BEFORE UPDATE ON rental_payments
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_owner_payouts_modtime ON owner_payouts;
CREATE TRIGGER update_owner_payouts_modtime
BEFORE UPDATE ON owner_payouts
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_order_payments_modtime ON service_order_payments;
CREATE TRIGGER update_service_order_payments_modtime
BEFORE UPDATE ON service_order_payments
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
