-- ============================================
-- VaxTrace Nigeria - Performance Indexes
-- ============================================
-- 
-- This migration adds critical indexes to improve query performance
-- as data grows. Indexes are added to columns frequently
-- used in WHERE clauses and JOIN operations.
--
-- Author: VaxTrace Team
-- Version: 1.0.0
-- ============================================

-- Enable statement timeout for better error handling
SET statement_timeout = '30s';

-- ============================================
-- ALERTS TABLE INDEXES
-- ============================================

-- Index for filtering active alerts (most common query)
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_at 
ON alerts(resolved_at) 
WHERE resolved_at IS NULL;

-- Composite index for alert filtering by severity and state
CREATE INDEX IF NOT EXISTS idx_alerts_severity_state 
ON alerts(severity, state);

-- Composite index for alert type and facility lookups
CREATE INDEX IF NOT EXISTS idx_alerts_type_facility 
ON alerts(type, facility_id);

-- Index for alert timestamp sorting (newest first)
CREATE INDEX IF NOT EXISTS idx_alerts_created_at 
ON alerts(created_at DESC);

-- ============================================
-- STOCK TABLE INDEXES
-- ============================================

-- Index for stock status filtering (critical for stockouts)
CREATE INDEX IF NOT EXISTS idx_stock_status 
ON stock(stock_status);

-- Composite index for facility stock queries
CREATE INDEX IF NOT EXISTS idx_stock_facility_product 
ON stock(facility_id, product_code);

-- Index for expiry date sorting (expiring soonest first)
CREATE INDEX IF NOT EXISTS idx_stock_expiry_date 
ON stock(lot_expiry_date);

-- Index for vaccine code lookups
CREATE INDEX IF NOT EXISTS idx_stock_vaccine_code 
ON stock(vaccine_code);

-- ============================================
-- FACILITIES TABLE INDEXES
-- ============================================

-- Index for facility state filtering (very common)
CREATE INDEX IF NOT EXISTS idx_facilities_state 
ON facilities(state);

-- Index for facility LGA filtering
CREATE INDEX IF NOT EXISTS idx_facilities_lga 
ON facilities(lga);

-- Index for facility type filtering
CREATE INDEX IF NOT EXISTS idx_facilities_type 
ON facilities(type);

-- Composite index for location-based queries
CREATE INDEX IF NOT EXISTS idx_facilities_state_lga 
ON facilities(state, lga);

-- ============================================
-- LOCATIONS TABLE INDEXES
-- ============================================

-- Index for state filtering
CREATE INDEX IF NOT EXISTS idx_locations_state 
ON locations(state);

-- Index for LGA filtering within state
CREATE INDEX IF NOT EXISTS idx_locations_state_lga 
ON locations(state, lga);

-- ============================================
-- TRANSFERS TABLE INDEXES
-- ============================================

-- Index for source facility lookups
CREATE INDEX IF NOT EXISTS idx_transfers_source_facility 
ON transfers(source_facility_id);

-- Index for target facility lookups
CREATE INDEX IF NOT EXISTS idx_transfers_target_facility 
ON transfers(target_facility_id);

-- Index for transfer status filtering
CREATE INDEX IF NOT EXISTS idx_transfers_status 
ON transfers(status);

-- Index for transfer date sorting
CREATE INDEX IF NOT EXISTS idx_transfers_created_at 
ON transfers(created_at DESC);

-- ============================================
-- DELIVERIES TABLE INDEXES
-- ============================================

-- Index for QR code lookups (very common)
CREATE INDEX IF NOT EXISTS idx_deliveries_qr_code 
ON deliveries(qr_code_id);

-- Index for transfer ID lookups
CREATE INDEX IF NOT EXISTS idx_deliveries_transfer_id 
ON deliveries(transfer_id);

-- Index for delivery status filtering
CREATE INDEX IF NOT EXISTS idx_deliveries_status 
ON deliveries(status);

-- ============================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================

-- Index for user action filtering (security audits)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON audit_logs(user_id, action);

-- Index for timestamp sorting (recentest first)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

-- Composite index for resource filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource_type, resource_id);

-- ============================================
-- COMMENTS/NOTES
-- ============================================

-- Analyze query patterns before adding indexes
-- Use EXPLAIN ANALYZE to verify index usage
-- Example: EXPLAIN ANALYZE SELECT * FROM alerts WHERE severity = 'CRITICAL';

-- Monitor index usage with:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE schemaname = 'public';

-- Reindex fragmented indexes
-- REINDEX TABLE alerts;

-- Update table statistics for query planner
-- ANALYZE alerts;
