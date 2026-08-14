-- Track whether collateral has actually been received independently from rental payment status.
-- Existing rentals are treated as received because the previous workflow required collateral at creation.

ALTER TABLE rentals
    ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(20) NOT NULL DEFAULT 'received';

UPDATE rentals
SET deposit_status = 'received'
WHERE deposit_status IS NULL OR deposit_status NOT IN ('pending', 'received');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rentals_deposit_status_check'
    ) THEN
        ALTER TABLE rentals
            ADD CONSTRAINT rentals_deposit_status_check
            CHECK (deposit_status IN ('pending', 'received')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rentals_deposit_status
    ON rentals(deposit_status, deposit_type, created_at DESC);
