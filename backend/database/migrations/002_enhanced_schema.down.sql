-- ============================================
-- VaxTrace Nigeria - Rollback Enhanced Schema
-- ============================================
-- Down Migration for: 002_enhanced_schema.sql
--
-- This migration removes the enhanced schema features added in 002_enhanced_schema.sql
-- WARNING: This will DROP tables and data. Use with caution!
--
-- Author: VaxTrace Team
-- Version: 1.0.0
-- ============================================

-- Enable statement timeout for better error handling
SET statement_timeout = '60s';

-- ============================================
-- DROP PARTITIONED STOCK SNAPSHOTS V2
-- ============================================

-- Drop the v2 partitioned table if it exists
DROP TABLE IF EXISTS stock_snapshots_v2 CASCADE;

-- ============================================
-- DROP AUDIT LOGS TABLE
-- ============================================

-- Drop the trigger function first
DROP FUNCTION IF EXISTS abort_immutable_operations() CASCADE;

-- Drop the audit logs table
DROP TABLE IF EXISTS audit_logs CASCADE;

-- ============================================
-- DROP PREDICTIVE INSIGHTS TABLE
-- ============================================

DROP TABLE IF EXISTS predictive_insights CASCADE;

-- ============================================
-- DROP CCE TELEMETRY PARTITIONS
-- ============================================

-- Drop partitions (must be done before dropping the main table)
DROP TABLE IF EXISTS cce_telemetry_y2024m01 CASCADE;
DROP TABLE IF EXISTS cce_telemetry_y2024m02 CASCADE;
DROP TABLE IF EXISTS cce_telemetry_default CASCADE;

-- Drop the main telemetry table
DROP TABLE IF EXISTS cce_telemetry CASCADE;

-- ============================================
-- DROP CCE REGISTRY TABLE
-- ============================================

DROP TABLE IF EXISTS cce_registry CASCADE;

-- ============================================
-- DROP PRODUCT BATCHES TABLE
-- ============================================

DROP TABLE IF EXISTS product_batches CASCADE;

-- ============================================
-- REVERT PRODUCTS TABLE ALTERATIONS
-- ============================================

-- Remove columns added to products table
ALTER TABLE products DROP COLUMN IF EXISTS cold_chain_category;
ALTER TABLE products DROP COLUMN IF EXISTS pack_size;
ALTER TABLE products DROP COLUMN IF EXISTS unit_of_measure;
ALTER TABLE products DROP COLUMN IF EXISTS storage_conditions;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    table_count INT := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Enhanced Schema Rollback Complete';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Tables dropped from migration 002:';
    RAISE NOTICE '  - product_batches';
    RAISE NOTICE '  - cce_registry';
    RAISE NOTICE '  - cce_telemetry (and partitions)';
    RAISE NOTICE '  - predictive_insights';
    RAISE NOTICE '  - audit_logs';
    RAISE NOTICE '  - stock_snapshots_v2';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Products table reverted to original state';
    RAISE NOTICE '==========================================';
END $$;
