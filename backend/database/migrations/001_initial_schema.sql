-- ============================================
-- VaxTrace Nigeria - Initial Database Schema
-- ============================================
-- This migration creates the core database schema for VaxTrace Nigeria.
-- Includes: locations, stock_snapshots, alerts, stock_ledger, logistics_metrics
-- Compatible with PostgreSQL 16 + PostGIS 3.4
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For AES-256 encryption
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================
-- ENUMS
-- ============================================

-- Stock Status Enum (Stoplight System)
CREATE TYPE stock_status_enum AS ENUM (
    'optimal',      -- Green: 3-6 months of stock
    'understocked', -- Yellow: Below min but not zero
    'stockout',     -- Red: Zero stock
    'overstocked'   -- Blue: Above max (risk of expiry)
);

-- Alert Severity Enum
CREATE TYPE alert_severity_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Alert Type Enum
CREATE TYPE alert_type_enum AS ENUM (
    'stockout',
    'near_expiry',
    'temperature_excursion',
    'vvm_stage_3',
    'vvm_stage_4',
    'power_outage',
    'delivery_delay',
    'reconciliation_mismatch'
);

-- Requisition Status Enum (matches OpenLMIS)
CREATE TYPE requisition_status_enum AS ENUM (
    'initiated',
    'submitted',
    'authorized',
    'approved',
    'released',
    'shipped',
    'received',
    'rejected'
);

-- User Role Enum (RBAC)
CREATE TYPE user_role_enum AS ENUM (
    'nphcda_director',        -- National level
    'state_cold_chain_officer', -- State level
    'lga_logistics_officer',   -- LGA level
    'facility_in_charge',      -- Facility level
    'system_admin'
);

-- ============================================
-- LOCATIONS TABLE
-- ============================================
-- Hierarchical geographic structure: Zone > State > LGA > Facility
-- Uses PostGIS for geospatial queries and mapping

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'NG-AB', 'NG-AB-ABA'
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'zone', 'state', 'lga', 'facility'
    parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    geometry GEOMETRY(POINT, 4326),  -- Lat/long for mapping
    properties JSONB,  -- Additional metadata (population, catchment area, etc.)
    
    -- OpenLMIS Reference
    openlmis_id VARCHAR(255) UNIQUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT valid_type CHECK (type IN ('zone', 'state', 'lga', 'facility'))
);

-- Indexes for location queries
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_locations_openlmis ON locations(openlmis_id);
CREATE INDEX idx_locations_geometry ON locations USING GIST(geometry);
CREATE INDEX idx_locations_properties ON locations USING GIN(properties);

-- ============================================
-- VACCINES TABLE
-- ============================================
-- Reference table for vaccine types

CREATE TABLE vaccines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'BCG', 'OPV', 'PENTA'
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),  -- 'routine', 'campaign', 'covid'
    dose_volume_ml DECIMAL(5,2),
    doses_per_vial INT,
    min_storage_temp DECIMAL(4,2),  -- Celsius
    max_storage_temp DECIMAL(4,2),  -- Celsius
    shelf_life_months INT,
    requires_cold_chain BOOLEAN DEFAULT TRUE,
    
    -- Thresholds for alerts
    min_months_of_stock DECIMAL(4,1) DEFAULT 3.0,
    max_months_of_stock DECIMAL(4,1) DEFAULT 6.0,
    
    -- OpenLMIS Reference
    openlmis_product_id VARCHAR(255) UNIQUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_vaccines_code ON vaccines(code);
CREATE INDEX idx_vaccines_category ON vaccines(category);

-- ============================================
-- USERS TABLE
-- ============================================
-- User accounts with role-based access control

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    
    -- Encrypted fields (AES-256)
    full_name_encrypted BYTEA,  -- Encrypted at rest
    national_id_encrypted BYTEA, -- Encrypted at rest
    
    -- Authentication
    auth_provider VARCHAR(50) DEFAULT 'auth0',  -- 'auth0', 'firebase', 'local'
    auth_provider_id VARCHAR(255) UNIQUE,  -- External ID from auth provider
    
    -- Role and Location
    role user_role_enum NOT NULL,
    assigned_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Permissions
    permissions JSONB DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);
CREATE INDEX idx_users_location ON users(assigned_location_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_permissions ON users USING GIN(permissions);

-- ============================================
-- STOCK SNAPSHOTS TABLE
-- ============================================
-- Current stock levels at facilities (real-time view)

CREATE TABLE stock_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    vaccine_id UUID NOT NULL REFERENCES vaccines(id) ON DELETE CASCADE,
    
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
    current_temp DECIMAL(4,2),  -- Current temperature in Celsius
    last_temp_reading_at TIMESTAMP WITH TIME ZONE,
    temp_excursion_count INT DEFAULT 0,
    
    -- Timestamps
    snapshot_date DATE DEFAULT CURRENT_DATE,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_from_openlmis_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_daily_snapshot UNIQUE (facility_id, vaccine_id, lot_number, snapshot_date)
);

CREATE INDEX idx_stock_facility ON stock_snapshots(facility_id);
CREATE INDEX idx_stock_vaccine ON stock_snapshots(vaccine_id);
CREATE INDEX idx_stock_status ON stock_snapshots(stock_status);
CREATE INDEX idx_stock_expiry ON stock_snapshots(expiry_date);
CREATE INDEX idx_stock_vvm ON stock_snapshots(vvm_stage);
CREATE INDEX idx_stock_date ON stock_snapshots(snapshot_date);

-- ============================================
-- STOCK LEDGER TABLE
-- ============================================
-- Historical stock tracking for trend analytics and ML predictions

CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    lga_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    state_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    vaccine_id UUID NOT NULL REFERENCES vaccines(id) ON DELETE CASCADE,
    
    -- Stock Information
    quantity_on_hand INT NOT NULL,
    vvm_stage INT CHECK (vvm_stage BETWEEN 1 AND 4),
    
    -- Transaction Details
    transaction_type VARCHAR(50),  -- 'receipt', 'issue', 'adjustment', 'loss'
    transaction_reference VARCHAR(255),
    
    -- Timestamp
    snapshot_date DATE NOT NULL,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_ledger_entry UNIQUE (facility_id, vaccine_id, snapshot_date, transaction_reference)
);

CREATE INDEX idx_ledger_facility ON stock_ledger(facility_id);
CREATE INDEX idx_ledger_lga ON stock_ledger(lga_id);
CREATE INDEX idx_ledger_state ON stock_ledger(state_id);
CREATE INDEX idx_ledger_vaccine ON stock_ledger(vaccine_id);
CREATE INDEX idx_ledger_date ON stock_ledger(snapshot_date);
CREATE INDEX idx_ledger_transaction ON stock_ledger(transaction_type);

-- ============================================
-- LOGISTICS METRICS TABLE
-- ============================================
-- Performance metrics for supply chain analytics

CREATE TABLE logistics_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    lga_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    state_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    vaccine_id UUID REFERENCES vaccines(id) ON DELETE SET NULL,
    
    -- Metrics
    lead_time_days DECIMAL(5,2),
    wastage_rate_pct DECIMAL(5,2),
    stockout_duration_days INT,
    order_fill_rate_pct DECIMAL(5,2),
    on_time_delivery_pct DECIMAL(5,2),
    
    -- Period
    metric_period_start DATE NOT NULL,
    metric_period_end DATE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_metric_period UNIQUE (facility_id, vaccine_id, metric_period_start, metric_period_end)
);

CREATE INDEX idx_metrics_facility ON logistics_metrics(facility_id);
CREATE INDEX idx_metrics_lga ON logistics_metrics(lga_id);
CREATE INDEX idx_metrics_state ON logistics_metrics(state_id);
CREATE INDEX idx_metrics_period ON logistics_metrics(metric_period_start, metric_period_end);

-- ============================================
-- ALERTS TABLE
-- ============================================
-- System-generated alerts for stockouts, expiry, temperature issues, etc.

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    lga_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    state_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    vaccine_id UUID REFERENCES vaccines(id) ON DELETE SET NULL,
    
    -- Alert Details
    alert_type alert_type_enum NOT NULL,
    severity alert_severity_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Alert Data (JSON for flexibility)
    data JSONB DEFAULT '{}',
    
    -- Status
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels VARCHAR(50)[],  -- ['sms', 'whatsapp', 'email']
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_facility ON alerts(facility_id);
CREATE INDEX idx_alerts_lga ON alerts(lga_id);
CREATE INDEX idx_alerts_state ON alerts(state_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(is_acknowledged, is_resolved);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_data ON alerts USING GIN(data);

-- ============================================
-- REQUISITIONS TABLE
-- ============================================
-- Track orders from OpenLMIS (Initiated → Received)

CREATE TABLE requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    openlmis_requisition_id VARCHAR(255) UNIQUE NOT NULL,
    facility_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    lga_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    state_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Requisition Details
    status requisition_status_enum NOT NULL,
    program VARCHAR(100),  -- e.g., 'ESS', 'EPI'
    emergency BOOLEAN DEFAULT FALSE,
    
    -- Dates
    created_date DATE,
    submitted_date DATE,
    approved_date DATE,
    shipped_date DATE,
    received_date DATE,
    
    -- Calculated Lead Time
    lead_time_days INT,
    
    -- Sync Status
    synced_from_openlmis_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_requisitions_openlmis ON requisitions(openlmis_requisition_id);
CREATE INDEX idx_requisitions_facility ON requisitions(facility_id);
CREATE INDEX idx_requisitions_status ON requisitions(status);
CREATE INDEX idx_requisitions_dates ON requisitions(created_date DESC);

-- ============================================
-- REQUISITION LINE ITEMS TABLE
-- ============================================
-- Individual vaccine items within a requisition

CREATE TABLE requisition_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_id UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
    vaccine_id UUID NOT NULL REFERENCES vaccines(id) ON DELETE CASCADE,
    
    -- Quantities
    requested_quantity INT NOT NULL,
    approved_quantity INT,
    received_quantity INT,
    
    -- Stock Information
    beginning_balance INT,
    total_received_quantity INT,
    total_consumed_quantity INT,
    losses_adjustments INT,
    stock_on_hand INT,
    quantity_issued INT,
    
    -- Calculated Fields
    average_monthly_consumption INT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_items_requisition ON requisition_line_items(requisition_id);
CREATE INDEX idx_line_items_vaccine ON requisition_line_items(vaccine_id);

-- ============================================
-- SYNC LOG TABLE
-- ============================================
-- Track all synchronization events with OpenLMIS

CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(50) NOT NULL,  -- 'full', 'delta', 'webhook'
    source VARCHAR(50) DEFAULT 'openlmis',
    
    -- Sync Details
    entities_synced INT DEFAULT 0,
    entities_failed INT DEFAULT 0,
    entities_updated INT DEFAULT 0,
    
    -- Status
    status VARCHAR(50) NOT NULL,  -- 'pending', 'running', 'completed', 'failed'
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vaccines_updated_at BEFORE UPDATE ON vaccines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requisitions_updated_at BEFORE UPDATE ON requisitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_items_updated_at BEFORE UPDATE ON requisition_line_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at BEFORE UPDATE ON logistics_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS
-- ============================================

-- View for current stock status by facility
CREATE VIEW v_current_stock_status AS
SELECT 
    f.id AS facility_id,
    f.name AS facility_name,
    f.geometry,
    lga.name AS lga_name,
    state.name AS state_name,
    v.code AS vaccine_code,
    v.name AS vaccine_name,
    ss.quantity_on_hand,
    ss.months_of_stock,
    ss.stock_status,
    ss.vvm_stage,
    ss.expiry_date,
    ss.snapshot_time
FROM locations f
JOIN stock_snapshots ss ON f.id = ss.facility_id
JOIN vaccines v ON ss.vaccine_id = v.id
LEFT JOIN locations lga ON f.parent_id = lga.id
LEFT JOIN locations state ON lga.parent_id = state.id
WHERE ss.snapshot_date = CURRENT_DATE
  AND f.type = 'facility'
  AND f.is_active = TRUE;

-- View for active alerts
CREATE VIEW v_active_alerts AS
SELECT 
    a.id,
    a.alert_type,
    a.severity,
    a.title,
    a.description,
    f.name AS facility_name,
    f.geometry,
    lga.name AS lga_name,
    state.name AS state_name,
    v.name AS vaccine_name,
    a.is_acknowledged,
    a.is_resolved,
    a.created_at
FROM alerts a
JOIN locations f ON a.facility_id = f.id
LEFT JOIN locations lga ON a.lga_id = lga.id
LEFT JOIN locations state ON a.state_id = state.id
LEFT JOIN vaccines v ON a.vaccine_id = v.id
WHERE a.is_resolved = FALSE
ORDER BY a.created_at DESC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE locations IS 'Hierarchical geographic structure: Zone > State > LGA > Facility';
COMMENT ON TABLE stock_snapshots IS 'Current stock levels at facilities (real-time view)';
COMMENT ON TABLE stock_ledger IS 'Historical stock tracking for trend analytics and ML predictions';
COMMENT ON TABLE logistics_metrics IS 'Performance metrics for supply chain analytics';
COMMENT ON TABLE alerts IS 'System-generated alerts for stockouts, expiry, temperature issues';
COMMENT ON TABLE requisitions IS 'Track orders from OpenLMIS (Initiated → Received)';
COMMENT ON TABLE sync_logs IS 'Track all synchronization events with OpenLMIS';

COMMENT ON COLUMN stock_snapshots.stock_status IS 'Stoplight system: optimal (green), understocked (yellow), stockout (red), overstocked (blue)';
COMMENT ON COLUMN stock_snapshots.vvm_stage IS 'Vaccine Vial Monitor: 1 (OK), 2, 3 (Use with caution), 4 (Do not use)';
COMMENT ON COLUMN alerts.severity IS 'Alert severity: low, medium, high, critical';
