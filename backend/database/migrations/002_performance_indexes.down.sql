-- ============================================
-- VaxTrace Nigeria - Rollback Performance Indexes
-- ============================================
-- Down Migration for: 002_performance_indexes.sql
--
-- This migration removes the performance indexes added in 002_performance_indexes.sql
-- Use this to rollback the migration if needed.
--
-- Author: VaxTrace Team
-- Version: 1.0.0
-- ============================================

-- Enable statement timeout for better error handling
SET statement_timeout = '30s';

-- ============================================
-- DROP ALERTS TABLE INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_alerts_resolved_at;
DROP INDEX IF EXISTS idx_alerts_severity_state;
DROP INDEX IF EXISTS idx_alerts_type_facility;
DROP INDEX IF EXISTS idx_alerts_created_at;

-- ============================================
-- DROP STOCK TABLE INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_stock_status;
DROP INDEX IF EXISTS idx_stock_facility_product;
DROP INDEX IF EXISTS idx_stock_expiry_date;
DROP INDEX IF EXISTS idx_stock_vaccine_code;

-- ============================================
-- DROP FACILITIES TABLE INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_facilities_state;
DROP INDEX IF EXISTS idx_facilities_lga;
DROP INDEX IF EXISTS idx_facilities_type;
DROP INDEX IF EXISTS idx_facilities_state_lga;

-- ============================================
-- DROP LOCATIONS TABLE INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_locations_state;
DROP INDEX IF EXISTS idx_locations_state_lga;

-- ============================================
-- DROP TRANSFERS TABLE INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_transfers_source_facility;
DROP INDEX IF EXISTS idx_transfers_target_facility;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    dropped_count INT := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Performance Indexes Rollback Complete';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Indexes from migration 002 have been dropped';
    RAISE NOTICE '==========================================';
END $$;
