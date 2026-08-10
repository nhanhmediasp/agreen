-- Track cash deposits and motorcycle collateral separately.
-- This migration is additive and keeps existing rentals as cash deposits.

ALTER TABLE rentals
    ADD COLUMN IF NOT EXISTS deposit_type VARCHAR(20) NOT NULL DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS deposit_vehicle_plate VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS deposit_vehicle_brand VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS deposit_vehicle_model VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS deposit_vehicle_color VARCHAR(30) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS deposit_vehicle_note TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS deposit_returned_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deposit_return_note TEXT NOT NULL DEFAULT '';

UPDATE rentals
SET deposit_type = 'cash'
WHERE deposit_type IS NULL OR deposit_type = '';

ALTER TABLE rentals
    DROP CONSTRAINT IF EXISTS rentals_deposit_type_check;

ALTER TABLE rentals
    ADD CONSTRAINT rentals_deposit_type_check
    CHECK (deposit_type IN ('cash', 'motorbike'));

CREATE INDEX IF NOT EXISTS idx_rentals_deposit_type
    ON rentals(deposit_type, deposit_returned_at);
