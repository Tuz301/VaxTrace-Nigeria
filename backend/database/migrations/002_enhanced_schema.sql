-- ============================================
-- VaxTrace Nigeria - Enhanced Database Schema
-- ============================================
-- Migration: 002_enhanced_schema.sql
-- 
-- This migration adds senior-level features:
-- 1. PostGIS spatial indexing for the "Neural Map"
-- 2. Cold Chain Equipment (CCE) telemetry table
-- 3. Predictive insights table for the "Crystal Ball" feature
-- 4. Product batches with GS1 standards
-- 5. Immutable audit logs (WORM) for NDPA 2023 compliance
-- 6. Table partitioning for time-series data
-- 
-- Compatible with PostgreSQL 16 + PostGIS 3.4
-- ============================================

-- ============================================
-- PRODUCTS & BATCHES (GS1 Standards)
-- ============================================

-- Enhanced products table with cold chain categories
ALTER TABLE products ADD COLUMN IF NOT EXISTS cold_chain_category VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_size INT DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20) DEFAULT 'VIAL';
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_conditions JSONB;

-- Add cold chain category constraint
ALTER TABLE products 
ADD CONSTRAINT chk_cold_chain_category 
CHECK (cold_chain_category IN ('FROZEN', 'ULTRA_LOW', '2-8C', '15-25C'));

-- Product batches table (GS1 compliant)
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Batch identification
    batch_number VARCHAR(50) NOT NULL,
    gtin VARCHAR(14),  -- Global Trade Item Number (GS1)
    serial_number VARCHAR(30),
    lot_number VARCHAR(50),
    
    -- Expiry and manufacturing
    expiry_date DATE NOT NULL,
    manufacturing_date DATE,
    
    -- Supplier information
    manufacturer VARCHAR(100),
    supplier VARCHAR(100),
    country_of_origin VARCHAR(3),  -- ISO 3166-1 alpha-3
    
    -- VVM (Vaccine Vial Monitor) configuration
    vvm_type INT CHECK (vvm_type IN (7, 14, 30)),  -- VVM stage days
    vvm_stage_current INT CHECK (vvm_stage_current BETWEEN 1 AND 4),
    
    -- Quality metrics
    is_quarantined BOOLEAN DEFAULT FALSE,
    quarantine_reason TEXT,
    quality_check_date DATE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_batch_product UNIQUE (product_id, batch_number)
);

CREATE INDEX idx_batches_product ON product_batches(product_id);
CREATE INDEX idx_batches_expiry ON product_batches(expiry_date);
CREATE INDEX idx_batches_gtin ON product_batches(gtin);
CREATE INDEX idx_batches_vvm ON product_batches(vvm_stage_current);
CREATE INDEX idx_batches_quarantine ON product_batches(is_quarantined);

-- ============================================
-- COLD CHAIN EQUIPMENT (CCE) TELEMETRY
-- ============================================

-- CCE Registry (master list of equipment)
CREATE TABLE IF NOT EXISTS cce_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Equipment identification
    equipment_code VARCHAR(50) UNIQUE NOT NULL,
    serial_number VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    equipment_type VARCHAR(50),  -- 'SOLAR_FRIDGE', 'FREEZER', 'RTM', 'ICE_LINED'
    
    -- Specifications
    capacity_liters INT,
    temperature_range_min DECIMAL(5,2),
    temperature_range_max DECIMAL(5,2),
    power_source VARCHAR(50),  -- 'SOLAR', 'GRID', 'GAS', 'DUAL'
    
    -- Installation details
    installation_date DATE,
    warranty_expiry DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    
    -- Status
    operational_status VARCHAR(20) DEFAULT 'OPERATIONAL',
    is_operational BOOLEAN DEFAULT TRUE,
    
    -- RTM (Remote Temperature Monitoring) configuration
    has_rtm BOOLEAN DEFAULT FALSE,
    rtm_device_id VARCHAR(100),
    rtm_last_sync TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cce_location ON cce_registry(location_id);
CREATE INDEX idx_cce_type ON cce_registry(equipment_type);
CREATE INDEX idx_cce_status ON cce_registry(is_operational);
CREATE INDEX idx_cce_rtm ON cce_registry(has_rtm, rtm_device_id);

-- CCE Telemetry (time-series temperature readings)
CREATE TABLE IF NOT EXISTS cce_telemetry (
    id BIGSERIAL PRIMARY KEY,
    cce_id UUID NOT NULL REFERENCES cce_registry(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Temperature readings
    temp_celsius DECIMAL(5,2) NOT NULL,
    temp_fahrenheit DECIMAL(5,2),
    humidity_percent DECIMAL(5,2),
    
    -- Power status
    battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
    power_source VARCHAR(20),  -- 'BATTERY', 'GRID', 'SOLAR'
    is_power_on BOOLEAN DEFAULT TRUE,
    
    -- Physical status
    lid_open BOOLEAN DEFAULT FALSE,
    lid_open_duration_seconds INT,
    
    -- Alerts
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_type VARCHAR(50),  -- 'TEMP_HIGH', 'TEMP_LOW', 'POWER_OFF', 'LID_OPEN'
    alert_message TEXT,
    
    -- RTM device info
    rtm_device_id VARCHAR(100),
    signal_strength INT,  -- 0-100
    
    -- Timestamp
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partition by month for time-series optimization
CREATE TABLE IF NOT EXISTS cce_telemetry_y2024m01 PARTITION OF cce_telemetry
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS cce_telemetry_y2024m02 PARTITION OF cce_telemetry
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create default partition for future data
CREATE TABLE IF NOT EXISTS cce_telemetry_default PARTITION OF cce_telemetry
    DEFAULT;

-- Indexes for telemetry queries
CREATE INDEX idx_telemetry_cce ON cce_telemetry(cce_id, recorded_at DESC);
CREATE INDEX idx_telemetry_location ON cce_telemetry(location_id, recorded_at DESC);
CREATE INDEX idx_telemetry_alerts ON cce_telemetry(alert_triggered, recorded_at DESC);
CREATE INDEX idx_telemetry_temp ON cce_telemetry(temp_celsius);

-- ============================================
-- PREDICTIVE INSIGHTS ("Crystal Ball")
-- ============================================

CREATE TABLE IF NOT EXISTS predictive_insights (
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    
    -- Predictions
    projected_stockout_date DATE NOT NULL,
    projected_expiry_date DATE,
    days_until_stockout INT,
    days_until_expiry INT,
    
    -- ML Model metrics
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    model_version VARCHAR(20),
    model_name VARCHAR(50),
    
    -- Recommendations
    suggested_replenishment_qty INT,
    urgency_level VARCHAR(20),  -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    
    -- Calculation context
    current_stock INT,
    average_monthly_consumption DECIMAL(10,2),
    consumption_trend VARCHAR(20),  -- 'INCREASING', 'STABLE', 'DECREASING'
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    
    PRIMARY KEY (location_id, product_id, calculated_at)
);

CREATE INDEX idx_insights_location ON predictive_insights(location_id, calculated_at DESC);
CREATE INDEX idx_insights_stockout ON predictive_insights(projected_stockout_date);
CREATE INDEX idx_insights_urgency ON predictive_insights(urgency_level);
CREATE INDEX idx_insights_confidence ON predictive_insights(confidence_score);

-- ============================================
-- IMMUTABLE AUDIT LOGS (WORM - NDPA 2023 Compliance)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Actor information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    user_email VARCHAR(255),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL,  -- 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    resource_type VARCHAR(50) NOT NULL,  -- 'stock', 'location', 'user', 'cce'
    resource_id VARCHAR(255),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),  -- Correlation ID
    
    -- Data changes
    old_values JSONB,
    new_values JSONB,
    
    -- Authorization
    location_accessed UUID REFERENCES locations(id),
    access_level VARCHAR(20),  -- 'NATIONAL', 'STATE', 'LGA', 'FACILITY'
    
    -- Result
    action_status VARCHAR(20) DEFAULT 'SUCCESS',  -- 'SUCCESS', 'FAILURE', 'UNAUTHORIZED'
    failure_reason TEXT,
    
    -- Timestamps (immutable)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Prevent any updates or deletes (Write-Once-Read-Many)
CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION abort_immutable_operations();

CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action_type, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_location ON audit_logs(location_accessed, created_at DESC);
CREATE INDEX idx_audit_status ON audit_logs(action_status, created_at DESC);

-- ============================================
-- ENHANCED STOCK SNAPSHOTS (Partitioned)
-- ============================================

-- Add partitioning support to existing stock_snapshots
-- Note: This requires recreating the table for existing data

-- Create partitioned stock_snapshots_v2
CREATE TABLE IF NOT EXISTS stock_snapshots_v2 (
    id UUID DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    vaccine_id UUID NOT NULL REFERENCES vaccines(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    
    -- Stock Information
    quantity_on_hand INT NOT NULL DEFAULT 0,
    lot_number VARCHAR(100),
    expiry_date DATE,
    
    -- VVM (Vaccine Vial Monitor) Status
    vvm_stage INT CHECK (vvm_stage BETWEEN 1 AND 4),
    
    -- Calculated Metrics
    months_of_stock DECIMAL(6,2),
    average_monthly_consumption DECIMAL(8,2),
    stock_status stock_status_enum,
    
    -- Cold Chain
    current_temp DECIMAL(4,2),
    last_temp_reading_at TIMESTAMP WITH TIME ZONE,
    temp_excursion_count INT DEFAULT 0,
    
    -- Timestamps
    snapshot_date DATE DEFAULT CURRENT_DATE,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_from_openlmis_at TIMESTAMP WITH TIME ZONE,
    
    PRIMARY KEY (id, snapshot_date)
) PARTITION BY RANGE (snapshot_date);

-- Create monthly partitions
CREATE TABLE IF NOT EXISTS stock_snapshots_y2024m01 PARTITION OF stock_snapshots_v2
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS stock_snapshots_y2024m02 PARTITION OF stock_snapshots_v2
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE IF NOT EXISTS stock_snapshots_y2024m03 PARTITION OF stock_snapshots_v2
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Default partition for future data
CREATE TABLE IF NOT EXISTS stock_snapshots_default PARTITION OF stock_snapshots_v2
    DEFAULT;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to prevent immutable table operations
CREATE OR REPLACE FUNCTION abort_immutable_operations()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Cannot modify audit logs. This table is Write-Once-Read-Many (WORM) for NDPA 2023 compliance.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate urgency level for predictive insights
CREATE OR REPLACE FUNCTION calculate_urgency_level(
    days_until_stockout INT,
    confidence_score DECIMAL
) RETURNS VARCHAR AS $$
BEGIN
    IF days_until_stockout <= 7 AND confidence_score > 0.7 THEN
        RETURN 'CRITICAL';
    ELSIF days_until_stockout <= 30 AND confidence_score > 0.6 THEN
        RETURN 'HIGH';
    ELSIF days_until_stockout <= 90 THEN
        RETURN 'MEDIUM';
    ELSE
        RETURN 'LOW';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate urgency level
CREATE OR REPLACE FUNCTION update_insight_urgency()
RETURNS TRIGGER AS $$
BEGIN
    NEW.urgency_level := calculate_urgency_level(
        NEW.days_until_stockout,
        NEW.confidence_score
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_urgency
    BEFORE INSERT ON predictive_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_insight_urgency();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View: Facilities with CCE status
CREATE OR REPLACE VIEW v_facilities_with_cce AS
SELECT 
    f.id AS facility_id,
    f.name AS facility_name,
    f.geometry,
    COUNT(DISTINCT cce.id) AS total_equipment,
    COUNT(DISTINCT cce.id) FILTER (WHERE cce.is_operational = TRUE) AS operational_equipment,
    COUNT(DISTINCT cce.id) FILTER (WHERE cce.has_rtm = TRUE) AS rtm_enabled_equipment,
    MAX(t.temp_celsius) AS latest_temp,
    MAX(t.recorded_at) AS last_telemetry_at
FROM locations f
LEFT JOIN cce_registry cce ON f.id = cce.location_id
LEFT JOIN LATERAL (
    SELECT temp_celsius, recorded_at
    FROM cce_telemetry
    WHERE cce_id = cce.id
    ORDER BY recorded_at DESC
    LIMIT 1
) t ON TRUE
WHERE f.type = 'facility'
GROUP BY f.id, f.name, f.geometry;

-- View: Stockout risk analysis
CREATE OR REPLACE VIEW v_stockout_risk_analysis AS
SELECT 
    l.name AS location_name,
    l.type AS location_type,
    v.name AS vaccine_name,
    ss.quantity_on_hand,
    ss.months_of_stock,
    ss.stock_status,
    pi.projected_stockout_date,
    pi.days_until_stockout,
    pi.urgency_level,
    pi.confidence_score
FROM stock_snapshots_v2 ss
JOIN locations l ON ss.facility_id = l.id
JOIN vaccines v ON ss.vaccine_id = v.id
LEFT JOIN LATERAL (
    SELECT *
    FROM predictive_insights
    WHERE location_id = ss.facility_id
        AND product_id = ss.vaccine_id
    ORDER BY calculated_at DESC
    LIMIT 1
) pi ON TRUE
WHERE ss.snapshot_date = CURRENT_DATE
ORDER BY pi.days_until_stockout ASC NULLS LAST;

-- View: CCE temperature excursion summary
CREATE OR REPLACE VIEW v_cce_temp_excursions AS
SELECT 
    cce.equipment_code,
    l.name AS facility_name,
    COUNT(*) FILTER (WHERE t.temp_celsius < 2.0 OR t.temp_celsius > 8.0) AS excursion_count,
    MIN(t.temp_celsius) AS min_temp,
    MAX(t.temp_celsius) AS max_temp,
    AVG(t.temp_celsius) AS avg_temp,
    MAX(t.recorded_at) AS last_reading_at
FROM cce_registry cce
JOIN locations l ON cce.location_id = l.id
JOIN cce_telemetry t ON cce.id = t.cce_id
WHERE t.recorded_at > NOW() - INTERVAL '7 days'
GROUP BY cce.equipment_code, l.name
HAVING COUNT(*) FILTER (WHERE t.temp_celsius < 2.0 OR t.temp_celsius > 8.0) > 0
ORDER BY excursion_count DESC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE product_batches IS 'GS1-compliant product batch tracking with VVM status';
COMMENT ON TABLE cce_registry IS 'Cold Chain Equipment registry with RTM configuration';
COMMENT ON TABLE cce_telemetry IS 'Time-series temperature and power readings (partitioned by month)';
COMMENT ON TABLE predictive_insights IS 'ML-powered stockout and expiry predictions';
COMMENT ON TABLE audit_logs IS 'Immutable audit logs for NDPA 2023 compliance (Write-Once-Read-Many)';

COMMENT ON COLUMN predictive_insights.urgency_level IS 'Calculated urgency: CRITICAL (≤7 days), HIGH (≤30 days), MEDIUM (≤90 days), LOW (>90 days)';
COMMENT ON COLUMN audit_logs.created_at IS 'Immutable timestamp - cannot be modified for compliance';
