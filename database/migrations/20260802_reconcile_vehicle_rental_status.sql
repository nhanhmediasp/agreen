-- Reconcile legacy/stale vehicle status with the rental workflow.
-- Rental rows are the source of truth for Reserved and Rented.

WITH expected_vehicle_status AS (
    SELECT
        v.id,
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM rentals active_rental
                WHERE active_rental.car_id = v.plate_number
                  AND active_rental.status = 'active'
            ) THEN 'Rented'
            WHEN EXISTS (
                SELECT 1
                FROM rentals pending_rental
                WHERE pending_rental.car_id = v.plate_number
                  AND pending_rental.status = 'pending'
            ) THEN 'Reserved'
            WHEN v.operational_status IN ('Available', 'Maintenance', 'Suspended')
                THEN v.operational_status
            ELSE 'Available'
        END AS status
    FROM vehicles v
)
UPDATE vehicles v
SET status = expected.status,
    updated_at = CURRENT_TIMESTAMP
FROM expected_vehicle_status expected
WHERE v.id = expected.id
  AND v.status IS DISTINCT FROM expected.status;
