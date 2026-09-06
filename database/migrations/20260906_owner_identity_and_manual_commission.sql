-- Preserve manual owner payouts and speed up normalized duplicate checks.
-- No existing owner, customer, rental or financial row is removed or rewritten.

ALTER TABLE rentals
    ADD COLUMN IF NOT EXISTS owner_commission_manual BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_owners_phone_normalized
    ON owners ((CASE
        WHEN length(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) = 11
             AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '84%'
        THEN '0' || substring(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') FROM 3)
        ELSE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')
    END));

CREATE INDEX IF NOT EXISTS idx_customers_phone_normalized
    ON customers ((CASE
        WHEN length(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) = 11
             AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '84%'
        THEN '0' || substring(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') FROM 3)
        ELSE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')
    END));

CREATE INDEX IF NOT EXISTS idx_owners_id_card_normalized
    ON owners ((lower(regexp_replace(COALESCE(id_card, ''), '\s+', '', 'g'))));

CREATE INDEX IF NOT EXISTS idx_customers_id_card_normalized
    ON customers ((lower(regexp_replace(COALESCE(id_card, ''), '\s+', '', 'g'))));

CREATE INDEX IF NOT EXISTS idx_owners_email_normalized
    ON owners ((lower(regexp_replace(COALESCE(email, ''), '\s+', '', 'g'))));

CREATE INDEX IF NOT EXISTS idx_customers_email_normalized
    ON customers ((lower(regexp_replace(COALESCE(email, ''), '\s+', '', 'g'))));
