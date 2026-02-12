-- ============================================
-- VaxTrace Nigeria - Rollback Initial Schema
-- ============================================
-- Down Migration for: 001_initial_schema.sql
--
-- This migration removes the entire initial schema created in 001_initial_schema.sql
-- WARNING: This will DROP ALL TABLES AND DATA. Use with extreme caution!
--
-- Author: VaxTrace Team
-- Version: 1.0.0
-- ============================================

-- Enable statement timeout for better error handling
SET statement_timeout = '60s';

-- ============================================
-- DROP TABLES IN DEPENDENCY ORDER
-- ============================================

-- Drop tables that depend on other tables first

-- Stock Ledger (depends on stock_snapshots, locations)
DROP TABLE IF EXISTS stock_ledger CASCADE;

-- Stock Snapshots (depends on locations, vaccines)
DROP TABLE IF EXISTS stock_snapshots CASCADE;

-- Alerts (depends on locations, vaccines)
DROP TABLE IF EXISTS alerts CASCADE;

-- Users (depends on locations)
DROP TABLE IF EXISTS users CASCADE;

-- Vaccines
DROP TABLE IF EXISTS vaccines CASCADE;

-- Locations (has self-reference)
DROP TABLE IF EXISTS locations CASCADE;

-- ============================================
-- DROP ENUM TYPES
-- ============================================

-- Drop enums after all tables are dropped
DROP TYPE IF EXISTS stock_status_enum CASCADE;
DROP TYPE IF EXISTS alert_severity_enum CASCADE;
DROP TYPE IF EXISTS alert_type_enum CASCADE;
DROP TYPE IF EXISTS requisition_status_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;

-- ============================================
-- DROP EXTENSIONS
-- ============================================

-- Note: Extensions are typically kept for other schemas
-- Uncomment if you want to remove them completely
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
-- DROP EXTENSION IF EXISTS "postgis" CASCADE;
-- DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;
-- DROP EXTENSION IF EXISTS "pg_stat_statements" CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    remaining_tables INT;
    remaining_enums INT;
BEGIN
    -- Check for remaining tables
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    -- Check for remaining enums
    SELECT COUNT(*) INTO remaining_enums
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Initial Schema Rollback Complete';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'All tables from migration 001 have been dropped';
    RAISE NOTICE 'Remaining tables: %', remaining_tables;
    RAISE NOTICE 'Remaining enums: %', remaining_enums;
    RAISE NOTICE '==========================================';
    
    IF remaining_tables > 0 THEN
        RAISE WARNING 'Some tables remain in the database';
    END IF;
    
    IF remaining_enums > 0 THEN
        RAISE WARNING 'Some enums remain in the database';
    END IF;
END $$;
