-- ============================================
-- VaxTrace Nigeria - Advanced Performance Indexes
-- ============================================
-- Migration: 003_advanced_indexes.sql
--
-- This migration adds advanced indexes for optimal query performance
-- as data grows. Includes:
-- 1. Composite indexes for common JOIN operations
-- 2. Partial indexes for filtered queries
-- 3. Covering indexes to avoid table lookups
-- 4. JSONB indexes for efficient metadata queries
-- 5. Time-series indexes for analytics queries
--
-- Author: VaxTrace Team
-- Version: 1.0.0
-- ============================================

-- Enable statement timeout for better error handling
SET statement_timeout = '30s';

-- ============================================
-- STOCK_SNAPSHOTS TABLE - Advanced Indexes
-- ============================================

-- Composite index for facility stock status queries (most common dashboard query)
-- Covers: WHERE facility_id = ? AND stock_status = ? ORDER BY snapshot_date DESC
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_facility_status_date
ON stock_snapshots(facility_id, stock_status, snapshot_date DESC);

-- Partial index for active stockouts only (reduces index size)
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_stockouts
ON stock_snapshots(facility_id, vaccine_id, snapshot_date DESC)
WHERE stock_status = 'stockout';

-- Covering index for stock detail queries (avoids table lookup)
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_facility_vaccine_covering
ON stock_snapshots(facility_id, vaccine_id)
INCLUDE (quantity_on_hand, months_of_stock, stock_status, snapshot_date);

-- Index for VVM stage filtering (cold chain monitoring)
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_vvm_stage
ON stock_snapshots(vvm_stage)
WHERE vvm_stage IS NOT NULL;

-- Composite index for expiry monitoring
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_expiry_facility
ON stock_snapshots(expiry_date, facility_id)
WHERE expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '90 days';

-- Partial index for temperature excursions
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_temp_excursions
ON stock_snapshots(facility_id, temp_excursion_count)
WHERE temp_excursion_count > 0;

-- ============================================
-- ALERTS TABLE - Advanced Indexes
-- ============================================

-- Covering index for active alerts dashboard (avoids table lookup)
CREATE INDEX IF NOT EXISTS idx_alerts_active_covering
ON alerts(resolved_at IS NULL, severity, created_at DESC)
INCLUDE (type, facility_id, state, message);

-- Partial index for critical alerts only
CREATE INDEX IF NOT EXISTS idx_alerts_critical
ON alerts(facility_id, created_at DESC)
WHERE severity = 'critical' AND resolved_at IS NULL;

-- Composite index for alert analytics queries
CREATE INDEX IF NOT EXISTS idx_alerts_type_date
ON alerts(type, created_at DESC);

-- Index for alert resolution tracking
CREATE INDEX IF NOT EXISTS idx_alerts_resolved
ON alerts(resolved_at DESC)
WHERE resolved_at IS NOT NULL;

-- Partial index for state-level alert aggregation
CREATE INDEX IF NOT EXISTS idx_alerts_state_active
ON alerts(state, severity, type)
WHERE resolved_at IS NULL;

-- ============================================
-- LOCATIONS TABLE - Advanced Indexes
-- ============================================

-- Composite index for location hierarchy queries
CREATE INDEX IF NOT EXISTS idx_locations_type_parent_active
ON locations(type, parent_id)
WHERE is_active = true;

-- Covering index for location lookups
CREATE INDEX IF NOT EXISTS idx_locations_code_covering
ON locations(code)
INCLUDE (name, type, parent_id, properties);

-- Partial index for facilities only (excludes zones, states, LGAs)
CREATE INDEX IF NOT EXISTS idx_locations_facilities
ON locations(parent_id)
WHERE type = 'facility' AND is_active = true;

-- Index for OpenLMIS synchronization
CREATE INDEX IF NOT EXISTS idx_locations_openlmis_active
ON locations(openlmis_id)
WHERE openlmis_id IS NOT NULL AND is_active = true;

-- ============================================
-- VACCINES TABLE - Advanced Indexes
-- ============================================

-- Covering index for vaccine lookups
CREATE INDEX IF NOT EXISTS idx_vaccines_code_covering
ON vaccines(code)
INCLUDE (name, category, min_months_of_stock, max_months_of_stock);

-- Partial index for active vaccines only
CREATE INDEX IF NOT EXISTS idx_vaccines_active
ON vaccines(category, is_active)
WHERE is_active = true;

-- ============================================
-- USERS TABLE - Advanced Indexes
-- ============================================

-- Covering index for user authentication
CREATE INDEX IF NOT EXISTS idx_users_email_covering
ON users(email)
INCLUDE (role, assigned_location_id, is_active);

-- Partial index for active users only
CREATE INDEX IF NOT EXISTS idx_users_active_location
ON users(assigned_location_id, role)
WHERE is_active = true;

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_users_last_login
ON users(last_login_at DESC)
WHERE last_login_at IS NOT NULL;

-- ============================================
-- AUDIT LOGS TABLE - Advanced Indexes
-- ============================================

-- Composite index for audit log queries (time-series pattern)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timestamp
ON audit_logs(entity_type, entity_id, created_at DESC);

-- Partial index for recent audit logs (last 90 days)
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
ON audit_logs(created_at DESC, entity_type, action)
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

-- Covering index for audit log lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp
ON audit_logs(user_id, created_at DESC)
INCLUDE (entity_type, action, changes);

-- ============================================
-- TRANSFERS TABLE - Advanced Indexes
-- ============================================

-- Composite index for active transfer queries
CREATE INDEX IF NOT EXISTS idx_transfers_active
ON transfers(source_facility_id, target_facility_id, created_at DESC)
WHERE status IN ('pending', 'in_transit');

-- Covering index for transfer details
CREATE INDEX IF NOT EXISTS idx_transfers_status_date
ON transfers(status, created_at DESC)
INCLUDE (source_facility_id, target_facility_id, vaccine_id, quantity);

-- Index for transfer completion tracking
CREATE INDEX IF NOT EXISTS idx_transfers_completed
ON transfers(target_facility_id, completed_at DESC)
WHERE completed_at IS NOT NULL;

-- ============================================
-- DELIVERIES TABLE - Advanced Indexes
-- ============================================

-- Composite index for active deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_active
ON deliveries(facility_id, status, created_at DESC)
WHERE status IN ('pending', 'in_transit', 'delivered');

-- Partial index for pending deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_pending
ON deliveries(facility_id, estimated_delivery_date)
WHERE status = 'pending';

-- Covering index for delivery tracking
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_covering
ON deliveries(tracking_number)
INCLUDE (facility_id, status, vaccine_id, quantity, created_at);

-- ============================================
-- PREDICTIVE INSIGHTS TABLE - Advanced Indexes
-- ============================================

-- Composite index for insight queries
CREATE INDEX IF NOT EXISTS idx_predictive_insights_facility_type
ON predictive_insights(facility_id, insight_type, created_at DESC);

-- Partial index for active insights only
CREATE INDEX IF NOT EXISTS idx_predictive_insights_active
ON predictive_insights(insight_type, severity)
WHERE is_active = true AND valid_until > CURRENT_TIMESTAMP;

-- Covering index for insight lookups
CREATE INDEX IF NOT EXISTS idx_predictive_insights_covering
ON predictive_insights(facility_id, created_at DESC)
INCLUDE (insight_type, severity, confidence, recommendations);

-- ============================================
-- CCE TELEMETRY TABLE - Advanced Indexes
-- ============================================

-- Time-series index for temperature readings
CREATE INDEX IF NOT EXISTS idx_cce_telemetry_equipment_timestamp
ON cce_telemetry(equipment_id, recorded_at DESC);

-- Partial index for recent telemetry (last 7 days)
CREATE INDEX IF NOT EXISTS idx_cce_telemetry_recent
ON cce_telemetry(equipment_id, recorded_at DESC)
WHERE recorded_at > CURRENT_TIMESTAMP - INTERVAL '7 days';

-- Index for temperature excursion detection
CREATE INDEX IF NOT EXISTS idx_cce_telemetry_excursions
ON cce_telemetry(equipment_id, recorded_at DESC)
WHERE temperature_out_of_range = true;

-- ============================================
-- PRODUCT BATCHES TABLE - Advanced Indexes
-- ============================================

-- Composite index for batch queries
CREATE INDEX IF NOT EXISTS idx_product_batches_product_expiry
ON product_batches(product_id, expiry_date);

-- Partial index for expiring batches (within 90 days)
CREATE INDEX IF NOT EXISTS idx_product_batches_expiring_soon
ON product_batches(product_id, expiry_date)
WHERE expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND is_quarantined = false;

-- Covering index for batch lookups
CREATE INDEX IF NOT EXISTS idx_product_batches_gtin_covering
ON product_batches(gtin)
INCLUDE (product_id, batch_number, expiry_date, vvm_stage_current);

-- Partial index for quarantined batches
CREATE INDEX IF NOT EXISTS idx_product_batches_quarantined
ON product_batches(product_id, is_quarantined, quality_check_date)
WHERE is_quarantined = true;

-- ============================================
-- BRIN INDEXES FOR TIME-SERIES DATA
-- ============================================

-- BRIN indexes are smaller and more efficient for large time-series tables
-- They're perfect for append-only data like logs and metrics

CREATE INDEX IF NOT EXISTS idx_audit_logs_brin_timestamp
ON audit_logs USING BRIN(created_at);

CREATE INDEX IF NOT EXISTS idx_cce_telemetry_brin_timestamp
ON cce_telemetry USING BRIN(recorded_at);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_brin_date
ON stock_snapshots USING BRIN(snapshot_date);

-- ============================================
-- INDEX STATISTICS UPDATE
-- ============================================

-- Update statistics for better query planning
ANALYZE stock_snapshots;
ANALYZE alerts;
ANALYZE locations;
ANALYZE users;
ANALYZE audit_logs;
ANALYZE transfers;
ANALYZE deliveries;
ANALYZE predictive_insights;
ANALYZE cce_telemetry;
ANALYZE product_batches;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Display created indexes
DO $$
DECLARE
    index_record RECORD;
    index_count INT := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Advanced Performance Indexes Created';
    RAISE NOTICE '==========================================';
    
    FOR index_record IN 
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND indexname LIKE 'idx_%'
            AND indexname NOT IN (
                SELECT indexname FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname LIKE 'idx_%'
                LIMIT 50  -- Exclude indexes from previous migrations
            )
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '✓ Created: % on table %', index_record.indexname, index_record.tablename;
        index_count := index_count + 1;
    END LOOP;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total indexes created: %', index_count;
    RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- PERFORMANCE NOTES
-- ============================================

/*
 * INDEX MAINTENANCE:
 * 
 * 1. Monitor index usage with:
 *    SELECT * FROM pg_stat_user_indexes;
 * 
 * 2. Find unused indexes:
 *    SELECT schemaname, tablename, indexname
 *    FROM pg_stat_user_indexes
 *    WHERE idx_scan = 0
 *    AND indexname NOT LIKE '%_pkey';
 * 
 * 3. Reindex fragmented indexes:
 *    REINDEX INDEX CONCURRENTLY idx_name;
 * 
 * 4. Update statistics regularly:
 *    ANALYZE table_name;
 * 
 * PARTIAL INDEXES:
 * - Smaller size = better cache efficiency
 * - Use WHERE clauses for filtered data
 * - Perfect for status-based queries (active, pending, etc.)
 * 
 * COVERING INDEXES (INCLUDE):
 * - Avoid table lookups entirely
 * - Include frequently accessed columns
 * - Great for dashboard queries
 * 
 * COMPOSITE INDEXES:
 * - Order matters: most selective column first
 * - Consider query patterns
 * - Test with EXPLAIN ANALYZE
 * 
 * BRIN INDEXES:
 * - Best for time-series/append-only data
 * - Very small size (100x smaller than B-tree)
 * - Use for tables > 1GB with time-based queries
 */
