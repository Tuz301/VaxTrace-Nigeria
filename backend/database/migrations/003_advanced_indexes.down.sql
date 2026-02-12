-- ============================================
-- VaxTrace Nigeria - Rollback Advanced Indexes
-- ============================================
-- Down Migration for: 003_advanced_indexes.sql
--
-- This migration removes the advanced performance indexes added in 003_advanced_indexes.sql
-- Use this to rollback the migration if needed.
--
-- Author: VaxTrace Team
-- Version: 1.0.0
-- ============================================

-- Enable statement timeout for better error handling
SET statement_timeout = '30s';

-- ============================================
-- DROP STOCK_SNAPSHOTS TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_stock_snapshots_facility_status_date;
DROP INDEX IF EXISTS idx_stock_snapshots_stockouts;
DROP INDEX IF EXISTS idx_stock_snapshots_facility_vaccine_covering;
DROP INDEX IF EXISTS idx_stock_snapshots_vvm_stage;
DROP INDEX IF EXISTS idx_stock_snapshots_expiry_facility;
DROP INDEX IF EXISTS idx_stock_snapshots_temp_excursions;
DROP INDEX IF EXISTS idx_stock_snapshots_brin_date;

-- ============================================
-- DROP ALERTS TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_alerts_active_covering;
DROP INDEX IF EXISTS idx_alerts_critical;
DROP INDEX IF EXISTS idx_alerts_type_date;
DROP INDEX IF EXISTS idx_alerts_resolved;
DROP INDEX IF EXISTS idx_alerts_state_active;

-- ============================================
-- DROP LOCATIONS TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_locations_type_parent_active;
DROP INDEX IF EXISTS idx_locations_code_covering;
DROP INDEX IF EXISTS idx_locations_facilities;
DROP INDEX IF EXISTS idx_locations_openlmis_active;

-- ============================================
-- DROP VACCINES TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_vaccines_code_covering;
DROP INDEX IF EXISTS idx_vaccines_active;

-- ============================================
-- DROP USERS TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_users_email_covering;
DROP INDEX IF EXISTS idx_users_active_location;
DROP INDEX IF EXISTS idx_users_last_login;

-- ============================================
-- DROP AUDIT LOGS TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_audit_logs_entity_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_recent;
DROP INDEX IF EXISTS idx_audit_logs_user_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_brin_timestamp;

-- ============================================
-- DROP TRANSFERS TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_transfers_active;
DROP INDEX IF EXISTS idx_transfers_status_date;
DROP INDEX IF EXISTS idx_transfers_completed;

-- ============================================
-- DROP DELIVERIES TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_deliveries_active;
DROP INDEX IF EXISTS idx_deliveries_pending;
DROP INDEX IF EXISTS idx_deliveries_tracking_covering;

-- ============================================
-- DROP PREDICTIVE INSIGHTS TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_predictive_insights_facility_type;
DROP INDEX IF EXISTS idx_predictive_insights_active;
DROP INDEX IF EXISTS idx_predictive_insights_covering;

-- ============================================
-- DROP CCE TELEMETRY TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_cce_telemetry_equipment_timestamp;
DROP INDEX IF EXISTS idx_cce_telemetry_recent;
DROP INDEX IF EXISTS idx_cce_telemetry_excursions;
DROP INDEX IF EXISTS idx_cce_telemetry_brin_timestamp;

-- ============================================
-- DROP PRODUCT BATCHES TABLE - Advanced Indexes
-- ============================================

DROP INDEX IF EXISTS idx_product_batches_product_expiry;
DROP INDEX IF EXISTS idx_product_batches_expiring_soon;
DROP INDEX IF EXISTS idx_product_batches_gtin_covering;
DROP INDEX IF EXISTS idx_product_batches_quarantined;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    dropped_count INT := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Advanced Indexes Rollback Complete';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Indexes from migration 003 have been dropped';
    RAISE NOTICE '==========================================';
END $$;
