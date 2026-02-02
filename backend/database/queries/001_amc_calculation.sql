-- ============================================
-- VaxTrace Nigeria - AMC Calculation Queries
-- ============================================
-- 
-- Average Monthly Consumption (AMC) is a critical metric for:
-- 1. Calculating Months of Stock (MOS)
-- 2. Triggering replenishment alerts
-- 3. Powering the "Crystal Ball" predictive analytics
-- 
-- These queries implement the WHO-recommended methodology:
-- - AMC = Total Consumption / Number of Months
-- - Excludes stockout months from calculation
-- - Uses weighted average for seasonal variations
-- ============================================

-- ============================================
-- 1. BASIC AMC CALCULATION (Last 3 Months)
-- ============================================
-- This calculates AMC for each facility-vaccine combination
-- based on the last 3 months of consumption data.

WITH monthly_consumption AS (
    SELECT 
        sl.facility_id,
        sl.vaccine_id,
        DATE_TRUNC('month', sl.snapshot_date) AS month,
        -- Consumption = (Opening Balance + Received) - Closing Balance
        SUM(
            COALESCE(sl.quantity_on_hand, 0) -
            COALESCE(
                LAG(sl.quantity_on_hand) OVER (
                    PARTITION BY sl.facility_id, sl.vaccine_id 
                    ORDER BY sl.snapshot_date
                ), 
                sl.quantity_on_hand
            )
        ) FILTER (
            WHERE COALESCE(
                LAG(sl.quantity_on_hand) OVER (
                    PARTITION BY sl.facility_id, sl.vaccine_id 
                    ORDER BY sl.snapshot_date
                ), 
                sl.quantity_on_hand
            ) > sl.quantity_on_hand  -- Only count decreases (consumption)
        ) AS monthly_consumption
    FROM stock_ledger sl
    WHERE sl.snapshot_date >= CURRENT_DATE - INTERVAL '3 months'
        AND sl.snapshot_date < CURRENT_DATE
    GROUP BY 
        sl.facility_id,
        sl.vaccine_id,
        DATE_TRUNC('month', sl.snapshot_date)
)
SELECT 
    f.name AS facility_name,
    f.code AS facility_code,
    v.name AS vaccine_name,
    v.code AS vaccine_code,
    COUNT(*) AS months_included,
    ROUND(AVG(monthly_consumption), 2) AS amc_3_month,
    ROUND(STDDEV(monthly_consumption), 2) AS consumption_std_dev,
    ROUND(MIN(monthly_consumption), 2) AS min_monthly_consumption,
    ROUND(MAX(monthly_consumption), 2) AS max_monthly_consumption
FROM monthly_consumption mc
JOIN locations f ON mc.facility_id = f.id
JOIN vaccines v ON mc.vaccine_id = v.id
GROUP BY f.name, f.code, v.name, v.code
HAVING COUNT(*) >= 2  -- Require at least 2 months of data
ORDER BY f.name, v.name;

-- ============================================
-- 2. AMC WITH SEASONAL ADJUSTMENT (Last 12 Months)
-- ============================================
-- For vaccines with seasonal patterns (e.g., during campaign periods),
-- we use a 12-month window to get a more representative AMC.

WITH monthly_consumption AS (
    SELECT 
        sl.facility_id,
        sl.vaccine_id,
        DATE_TRUNC('month', sl.snapshot_date) AS month,
        EXTRACT(MONTH FROM sl.snapshot_date) AS calendar_month,
        -- Calculate consumption from ledger
        SUM(
            COALESCE(sl.quantity_on_hand, 0) -
            COALESCE(
                LAG(sl.quantity_on_hand) OVER (
                    PARTITION BY sl.facility_id, sl.vaccine_id 
                    ORDER BY sl.snapshot_date
                ), 
                sl.quantity_on_hand
            )
        ) FILTER (
            WHERE COALESCE(
                LAG(sl.quantity_on_hand) OVER (
                    PARTITION BY sl.facility_id, sl.vaccine_id 
                    ORDER BY sl.snapshot_date
                ), 
                sl.quantity_on_hand
            ) > sl.quantity_on_hand
        ) AS monthly_consumption,
        -- Flag stockout months
        COUNT(*) FILTER (
            WHERE sl.quantity_on_hand = 0
        ) OVER (
            PARTITION BY sl.facility_id, sl.vaccine_id, 
            DATE_TRUNC('month', sl.snapshot_date)
        ) AS stockout_days
    FROM stock_ledger sl
    WHERE sl.snapshot_date >= CURRENT_DATE - INTERVAL '12 months'
        AND sl.snapshot_date < CURRENT_DATE
    GROUP BY 
        sl.facility_id,
        sl.vaccine_id,
        DATE_TRUNC('month', sl.snapshot_date),
        EXTRACT(MONTH FROM sl.snapshot_date)
),
valid_months AS (
    -- Exclude months with significant stockouts (>7 days)
    SELECT * FROM monthly_consumption
    WHERE COALESCE(stockout_days, 0) <= 7
        AND monthly_consumption > 0
)
SELECT 
    f.name AS facility_name,
    v.name AS vaccine_name,
    COUNT(*) AS months_included,
    ROUND(AVG(monthly_consumption), 2) AS amc_12_month,
    -- Seasonal variation
    ROUND(MAX(monthly_consumption) / NULLIF(MIN(monthly_consumption), 0), 2) AS seasonal_variation_ratio,
    -- Peak consumption month
    calendar_month AS peak_month
FROM valid_months mc
JOIN locations f ON mc.facility_id = f.id
JOIN vaccines v ON mc.vaccine_id = v.id
GROUP BY f.name, v.name, calendar_month
HAVING COUNT(*) >= 6  -- Require at least 6 months of data
ORDER BY amc_12_month DESC
LIMIT 1;

-- ============================================
-- 3. AGGREGATED AMC BY LGA/STATE
-- ============================================
-- For higher-level reporting, we aggregate AMC across facilities.

WITH facility_amc AS (
    SELECT 
        f.parent_id AS lga_id,
        sl.vaccine_id,
        DATE_TRUNC('month', sl.snapshot_date) AS month,
        -- Calculate consumption
        SUM(
            COALESCE(sl.quantity_on_hand, 0) -
            COALESCE(
                LAG(sl.quantity_on_hand) OVER (
                    PARTITION BY sl.facility_id, sl.vaccine_id 
                    ORDER BY sl.snapshot_date
                ), 
                sl.quantity_on_hand
            )
        ) FILTER (
            WHERE COALESCE(
                LAG(sl.quantity_on_hand) OVER (
                    PARTITION BY sl.facility_id, sl.vaccine_id 
                    ORDER BY sl.snapshot_date
                ), 
                sl.quantity_on_hand
            ) > sl.quantity_on_hand
        ) AS monthly_consumption
    FROM stock_ledger sl
    JOIN locations f ON sl.facility_id = f.id
    WHERE sl.snapshot_date >= CURRENT_DATE - INTERVAL '3 months'
        AND sl.snapshot_date < CURRENT_DATE
        AND f.type = 'facility'
    GROUP BY 
        f.parent_id,
        sl.vaccine_id,
        DATE_TRUNC('month', sl.snapshot_date)
)
SELECT 
    lga.name AS lga_name,
    state.name AS state_name,
    v.name AS vaccine_name,
    COUNT(*) AS facilities_reporting,
    ROUND(SUM(monthly_consumption), 0) AS total_monthly_consumption,
    ROUND(AVG(monthly_consumption), 2) AS avg_consumption_per_facility,
    ROUND(STDDEV(monthly_consumption), 2) AS consumption_std_dev
FROM facility_amc mc
JOIN locations lga ON mc.lga_id = lga.id
JOIN locations state ON lga.parent_id = state.id
JOIN vaccines v ON mc.vaccine_id = v.id
GROUP BY lga.name, state.name, v.name
ORDER BY state_name, lga_name, v.name;

-- ============================================
-- 4. AMC WITH MOS CALCULATION (Real-time Dashboard)
-- ============================================
-- This query combines AMC with current stock levels to calculate
-- Months of Stock (MOS) for the dashboard ticker.

WITH amc_calculation AS (
    SELECT 
        sl.facility_id,
        sl.vaccine_id,
        -- AMC from last 3 months
        ROUND(AVG(
            (LAG(sl.quantity_on_hand) OVER (
                PARTITION BY sl.facility_id, sl.vaccine_id 
                ORDER BY sl.snapshot_date
            ) - sl.quantity_on_hand)
        ), 2) AS amc
    FROM stock_ledger sl
    WHERE sl.snapshot_date >= CURRENT_DATE - INTERVAL '3 months'
        AND sl.snapshot_date < CURRENT_DATE
    GROUP BY sl.facility_id, sl.vaccine_id
),
current_stock AS (
    SELECT 
        facility_id,
        vaccine_id,
        quantity_on_hand
    FROM stock_snapshots_v2
    WHERE snapshot_date = CURRENT_DATE
)
SELECT 
    f.name AS facility_name,
    v.name AS vaccine_name,
    cs.quantity_on_hand AS current_stock,
    amc.amc AS average_monthly_consumption,
    -- Months of Stock calculation
    CASE 
        WHEN amc.amc > 0 THEN 
            ROUND((cs.quantity_on_hand::DECIMAL / amc.amc), 2)
        ELSE NULL
    END AS months_of_stock,
    -- Stock status (Stoplight system)
    CASE 
        WHEN cs.quantity_on_hand = 0 THEN 'STOCKOUT'
        WHEN amc.amc IS NULL THEN 'UNKNOWN'
        WHEN (cs.quantity_on_hand::DECIMAL / amc.amc) < 1 THEN 'CRITICAL'
        WHEN (cs.quantity_on_hand::DECIMAL / amc.amc) < 3 THEN 'UNDERSTOCKED'
        WHEN (cs.quantity_on_hand::DECIMAL / amc.amc) > 6 THEN 'OVERSTOCKED'
        ELSE 'OPTIMAL'
    END AS stock_status
FROM current_stock cs
JOIN locations f ON cs.facility_id = f.id
JOIN vaccines v ON cs.vaccine_id = v.id
LEFT JOIN amc_calculation amc ON cs.facility_id = amc.facility_id 
    AND cs.vaccine_id = amc.vaccine_id
ORDER BY months_of_stock ASC NULLS LAST;

-- ============================================
-- 5. AMC FOR REPLENISHMENT PLANNING
-- ============================================
-- Identifies facilities that need replenishment based on AMC.

WITH amc_calculation AS (
    SELECT 
        sl.facility_id,
        sl.vaccine_id,
        ROUND(AVG(
            (LAG(sl.quantity_on_hand) OVER (
                PARTITION BY sl.facility_id, sl.vaccine_id 
                ORDER BY sl.snapshot_date
            ) - sl.quantity_on_hand)
        ), 2) AS amc
    FROM stock_ledger sl
    WHERE sl.snapshot_date >= CURRENT_DATE - INTERVAL '3 months'
        AND sl.snapshot_date < CURRENT_DATE
    GROUP BY sl.facility_id, sl.vaccine_id
),
current_stock AS (
    SELECT 
        facility_id,
        vaccine_id,
        quantity_on_hand
    FROM stock_snapshots_v2
    WHERE snapshot_date = CURRENT_DATE
),
replenishment_analysis AS (
    SELECT 
        cs.facility_id,
        cs.vaccine_id,
        cs.quantity_on_hand AS current_stock,
        amc.amc,
        amc.amc * 3 AS min_stock_level,  -- 3 months minimum
        amc.amc * 6 AS max_stock_level,  -- 6 months maximum
        -- Calculate suggested replenishment
        CASE 
            WHEN cs.quantity_on_hand < (amc.amc * 3) THEN
                CEIL((amc.amc * 4.5) - cs.quantity_on_hand)  -- Replenish to 4.5 months
            ELSE 0
        END AS suggested_replenishment_qty
    FROM current_stock cs
    JOIN amc_calculation amc ON cs.facility_id = amc.facility_id 
        AND cs.vaccine_id = amc.vaccine_id
    WHERE amc.amc > 0
)
SELECT 
    f.name AS facility_name,
    lga.name AS lga_name,
    state.name AS state_name,
    v.name AS vaccine_name,
    ra.current_stock,
    ra.amc AS average_monthly_consumption,
    ra.min_stock_level,
    ra.max_stock_level,
    ra.suggested_replenishment_qty,
    -- Urgency level
    CASE 
        WHEN ra.current_stock = 0 THEN 'STOCKOUT - IMMEDIATE'
        WHEN ra.current_stock < (ra.amc * 1) THEN 'CRITICAL'
        WHEN ra.current_stock < (ra.amc * 2) THEN 'HIGH'
        WHEN ra.current_stock < (ra.amc * 3) THEN 'MEDIUM'
        ELSE 'LOW'
    END AS urgency_level
FROM replenishment_analysis ra
JOIN locations f ON ra.facility_id = f.id
JOIN locations lga ON f.parent_id = lga.id
JOIN locations state ON lga.parent_id = state.id
JOIN vaccines v ON ra.vaccine_id = v.id
WHERE ra.suggested_replenishment_qty > 0
ORDER BY 
    CASE 
        WHEN ra.current_stock = 0 THEN 1
        WHEN ra.current_stock < (ra.amc * 1) THEN 2
        WHEN ra.current_stock < (ra.amc * 2) THEN 3
        WHEN ra.current_stock < (ra.amc * 3) THEN 4
        ELSE 5
    END,
    ra.suggested_replenishment_qty DESC;

-- ============================================
-- 6. STORED PROCEDURE: UPDATE AMC
-- ============================================
-- This stored procedure can be called periodically to update
-- the AMC values in the stock_snapshots table.

CREATE OR REPLACE FUNCTION update_amc_values()
RETURNS TABLE(
    facility_id UUID,
    vaccine_id UUID,
    amc DECIMAL,
    months_of_stock DECIMAL
) AS $$
DECLARE
    facility_record RECORD;
    vaccine_record RECORD;
    calculated_amc DECIMAL;
    calculated_mos DECIMAL;
    current_stock INT;
BEGIN
    -- Loop through all facility-vaccine combinations
    FOR facility_record IN 
        SELECT DISTINCT facility_id FROM stock_snapshots_v2 
        WHERE snapshot_date = CURRENT_DATE
    LOOP
        FOR vaccine_record IN 
            SELECT DISTINCT vaccine_id FROM stock_snapshots_v2 
            WHERE facility_id = facility_record.facility_id 
                AND snapshot_date = CURRENT_DATE
        LOOP
            -- Get current stock
            SELECT quantity_on_hand INTO current_stock
            FROM stock_snapshots_v2
            WHERE facility_id = facility_record.facility_id
                AND vaccine_id = vaccine_record.vaccine_id
                AND snapshot_date = CURRENT_DATE;
            
            -- Calculate AMC (last 3 months)
            SELECT ROUND(AVG(
                (LAG(quantity_on_hand) OVER (
                    PARTITION BY facility_id, vaccine_id 
                    ORDER BY snapshot_date
                ) - quantity_on_hand)
            ), 2) INTO calculated_amc
            FROM stock_ledger
            WHERE facility_id = facility_record.facility_id
                AND vaccine_id = vaccine_record.vaccine_id
                AND snapshot_date >= CURRENT_DATE - INTERVAL '3 months'
                AND snapshot_date < CURRENT_DATE;
            
            -- Calculate MOS
            IF calculated_amc > 0 AND current_stock > 0 THEN
                calculated_mos := ROUND((current_stock::DECIMAL / calculated_amc), 2);
            ELSE
                calculated_mos := NULL;
            END IF;
            
            -- Update stock_snapshots_v2
            UPDATE stock_snapshots_v2
            SET 
                average_monthly_consumption = calculated_amc,
                months_of_stock = calculated_mos
            WHERE facility_id = facility_record.facility_id
                AND vaccine_id = vaccine_record.vaccine_id
                AND snapshot_date = CURRENT_DATE;
            
            -- Return result
            RETURN QUERY SELECT 
                facility_record.facility_id,
                vaccine_record.vaccine_id,
                calculated_amc,
                calculated_mos;
        END LOOP;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- To run the AMC update procedure:
-- SELECT * FROM update_amc_values();

-- To get facilities needing replenishment:
-- SELECT * FROM replenishment_analysis WHERE suggested_replenishment_qty > 0;

-- To get dashboard ticker data:
-- SELECT * FROM amc_with_mos_calculation ORDER BY months_of_stock ASC;
