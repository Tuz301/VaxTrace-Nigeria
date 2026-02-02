-- ============================================
-- VaxTrace Nigeria - Location Seed Data
-- ============================================
-- This seed file populates the locations table with:
-- 1. Nigeria's 6 Geopolitical Zones
-- 2. Nigeria's 36 States + FCT
-- 3. Sample LGAs for demonstration
-- ============================================

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- GEOPOLITICAL ZONES (Level 1)
-- ============================================

INSERT INTO locations (id, code, name, type, geometry, properties) VALUES
-- North Central (6 States + FCT)
(uuid_generate_v4(), 'NG-NC', 'North Central', 'zone', ST_SetSRID(ST_MakePoint(7.5, 9.0), 4326), '{"population": 29600000, "states": 7}'::jsonb),

-- North East (6 States)
(uuid_generate_v4(), 'NG-NE', 'North East', 'zone', ST_SetSRID(ST_MakePoint(11.5, 11.0), 4326), '{"population": 23400000, "states": 6}'::jsonb),

-- North West (7 States)
(uuid_generate_v4(), 'NG-NW', 'North West', 'zone', ST_SetSRID(ST_MakePoint(7.0, 12.0), 4326), '{"population": 44700000, "states": 7}'::jsonb),

-- South East (5 States)
(uuid_generate_v4(), 'NG-SE', 'South East', 'zone', ST_SetSRID(ST_MakePoint(7.5, 6.0), 4326), '{"population": 21600000, "states": 5}'::jsonb),

-- South South (6 States)
(uuid_generate_v4(), 'NG-SS', 'South South', 'zone', ST_SetSRID(ST_MakePoint(6.5, 5.0), 4326), '{"population": 26400000, "states": 6}'::jsonb),

-- South West (6 States)
(uuid_generate_v4(), 'NG-SW', 'South West', 'zone', ST_SetSRID(ST_MakePoint(4.0, 7.5), 4326), '{"population": 47500000, "states": 6}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- STATES AND FCT (Level 2)
-- ============================================

-- Get zone IDs for reference
WITH zone_ids AS (
    SELECT id, code FROM locations WHERE type = 'zone'
),
-- North Central States
north_central AS (
    INSERT INTO locations (code, name, type, parent_id, geometry, properties)
    SELECT 
        code, name, 'state', 
        (SELECT id FROM zone_ids WHERE code = 'NG-NC'),
        geometry, properties
    FROM (VALUES
        ('NG-FC', 'Federal Capital Territory', ST_SetSRID(ST_MakePoint(7.5, 9.1), 4326), '{"capital": "Abuja", "population": 3600000}'::jsonb),
        ('NG-BN', 'Benue', ST_SetSRID(ST_MakePoint(8.5, 7.5), 4326), '{"capital": "Makurdi", "population": 5800000}'::jsonb),
        ('NG-KO', 'Kogi', ST_SetSRID(ST_MakePoint(6.7, 7.8), 4326), '{"capital": "Lokoja", "population": 4100000}'::jsonb),
        ('NG-KW', 'Kwara', ST_SetSRID(ST_MakePoint(5.0, 8.8), 4326), '{"capital": "Ilorin", "population": 3200000}'::jsonb),
        ('NG-NA', 'Nasarawa', ST_SetSRID(ST_MakePoint(8.3, 9.0), 4326), '{"capital": "Lafia", "population": 2500000}'::jsonb),
        ('NG-NI', 'Niger', ST_SetSRID(ST_MakePoint(5.5, 9.8), 4326), '{"capital": "Minna", "population": 5900000}'::jsonb),
        ('NG-PL', 'Plateau', ST_SetSRID(ST_MakePoint(8.9, 9.8), 4326), '{"capital": "Jos", "population": 4300000}'::jsonb)
    ) AS states(code, name, geometry, properties)
    ON CONFLICT (code) DO NOTHING
),
-- North East States
north_east AS (
    INSERT INTO locations (code, name, type, parent_id, geometry, properties)
    SELECT 
        code, name, 'state', 
        (SELECT id FROM zone_ids WHERE code = 'NG-NE'),
        geometry, properties
    FROM (VALUES
        ('NG-AD', 'Adamawa', ST_SetSRID(ST_MakePoint(12.5, 9.3), 4326), '{"capital": "Yola", "population": 4200000}'::jsonb),
        ('NG-BA', 'Bauchi', ST_SetSRID(ST_MakePoint(10.0, 11.7), 4326), '{"capital": "Bauchi", "population": 6600000}'::jsonb),
        ('NG-BO', 'Borno', ST_SetSRID(ST_MakePoint(13.0, 11.8), 4326), '{"capital": "Maiduguri", "population": 5900000}'::jsonb),
        ('NG-GO', 'Gombe', ST_SetSRID(ST_MakePoint(11.2, 10.3), 4326), '{"capital": "Gombe", "population": 3600000}'::jsonb),
        ('NG-TA', 'Taraba', ST_SetSRID(ST_MakePoint(10.5, 8.0), 4326), '{"capital": "Jalingo", "population": 3000000}'::jsonb),
        ('NG-YO', 'Yobe', ST_SetSRID(ST_MakePoint(12.0, 12.5), 4326), '{"capital": "Damaturu", "population": 3200000}'::jsonb)
    ) AS states(code, name, geometry, properties)
    ON CONFLICT (code) DO NOTHING
),
-- North West States
north_west AS (
    INSERT INTO locations (code, name, type, parent_id, geometry, properties)
    SELECT 
        code, name, 'state', 
        (SELECT id FROM zone_ids WHERE code = 'NG-NW'),
        geometry, properties
    FROM (VALUES
        ('NG-KD', 'Kaduna', ST_SetSRID(ST_MakePoint(7.4, 10.5), 4326), '{"capital": "Kaduna", "population": 8300000}'::jsonb),
        ('NG-KT', 'Katsina', ST_SetSRID(ST_MakePoint(7.6, 12.8), 4326), '{"capital": "Katsina", "population": 7600000}'::jsonb),
        ('NG-KE', 'Kebbi', ST_SetSRID(ST_MakePoint(4.2, 12.5), 4326), '{"capital": "Birnin Kebbi", "population": 4400000}'::jsonb),
        ('NG-JG', 'Jigawa', ST_SetSRID(ST_MakePoint(9.5, 12.5), 4326), '{"capital": "Dutse", "population": 5300000}'::jsonb),
        ('NG-KN', 'Kano', ST_SetSRID(ST_MakePoint(8.5, 12.0), 4326), '{"capital": "Kano", "population": 15000000}'::jsonb),
        ('NG-ZM', 'Zamfara', ST_SetSRID(ST_MakePoint(6.7, 12.2), 4326), '{"capital": "Gusau", "population": 4300000}'::jsonb),
        ('NG-SO', 'Sokoto', ST_SetSRID(ST_MakePoint(5.2, 13.0), 4326), '{"capital": "Sokoto", "population": 6800000}'::jsonb)
    ) AS states(code, name, geometry, properties)
    ON CONFLICT (code) DO NOTHING
),
-- South East States
south_east AS (
    INSERT INTO locations (code, name, type, parent_id, geometry, properties)
    SELECT 
        code, name, 'state', 
        (SELECT id FROM zone_ids WHERE code = 'NG-SE'),
        geometry, properties
    FROM (VALUES
        ('NG-AB', 'Abia', ST_SetSRID(ST_MakePoint(7.5, 5.5), 4326), '{"capital": "Umuahia", "population": 3800000}'::jsonb),
        ('NG-AN', 'Anambra', ST_SetSRID(ST_MakePoint(7.0, 6.2), 4326), '{"capital": "Awka", "population": 5600000}'::jsonb),
        ('NG-EB', 'Ebonyi', ST_SetSRID(ST_MakePoint(8.1, 6.3), 4326), '{"capital": "Abakaliki", "population": 3300000}'::jsonb),
        ('NG-EN', 'Enugu', ST_SetSRID(ST_MakePoint(7.5, 6.8), 4326), '{"capital": "Enugu", "population": 4400000}'::jsonb),
        ('NG-IM', 'Imo', ST_SetSRID(ST_MakePoint(7.0, 5.5), 4326), '{"capital": "Owerri", "population": 5400000}'::jsonb)
    ) AS states(code, name, geometry, properties)
    ON CONFLICT (code) DO NOTHING
),
-- South South States
south_south AS (
    INSERT INTO locations (code, name, type, parent_id, geometry, properties)
    SELECT 
        code, name, 'state', 
        (SELECT id FROM zone_ids WHERE code = 'NG-SS'),
        geometry, properties
    FROM (VALUES
        ('NG-AK', 'Akwa Ibom', ST_SetSRID(ST_MakePoint(7.8, 5.0), 4326), '{"capital": "Uyo", "population": 5400000}'::jsonb),
        ('NG-CR', 'Cross River', ST_SetSRID(ST_MakePoint(8.5, 5.8), 4326), '{"capital": "Calabar", "population": 3800000}'::jsonb),
        ('NG-DE', 'Delta', ST_SetSRID(ST_MakePoint(6.0, 5.8), 4326), '{"capital": "Asaba", "population": 5600000}'::jsonb),
        ('NG-ED', 'Edo', ST_SetSRID(ST_MakePoint(6.0, 6.5), 4326), '{"capital": "Benin City", "population": 4700000}'::jsonb),
        ('NG-RI', 'Rivers', ST_SetSRID(ST_MakePoint(6.8, 4.8), 4326), '{"capital": "Port Harcourt", "population": 7300000}'::jsonb),
        ('NG-BY', 'Bayelsa', ST_SetSRID(ST_MakePoint(6.0, 5.0), 4326), '{"capital": "Yenagoa", "population": 2300000}'::jsonb)
    ) AS states(code, name, geometry, properties)
    ON CONFLICT (code) DO NOTHING
),
-- South West States
south_west AS (
    INSERT INTO locations (code, name, type, parent_id, geometry, properties)
    SELECT 
        code, name, 'state', 
        (SELECT id FROM zone_ids WHERE code = 'NG-SW'),
        geometry, properties
    FROM (VALUES
        ('NG-EK', 'Ekiti', ST_SetSRID(ST_MakePoint(5.2, 7.7), 4326), '{"capital": "Ado Ekiti", "population": 3300000}'::jsonb),
        ('NG-LA', 'Lagos', ST_SetSRID(ST_MakePoint(3.4, 6.5), 4326), '{"capital": "Ikeja", "population": 14000000}'::jsonb),
        ('NG-OG', 'Ogun', ST_SetSRID(ST_MakePoint(3.5, 7.2), 4326), '{"capital": "Abeokuta", "population": 5300000}'::jsonb),
        ('NG-ON', 'Ondo', ST_SetSRID(ST_MakePoint(5.0, 7.2), 4326), '{"capital": "Akure", "population": 4700000}'::jsonb),
        ('NG-OS', 'Osun', ST_SetSRID(ST_MakePoint(4.5, 7.5), 4326), '{"capital": "Osogbo", "population": 4700000}'::jsonb),
        ('NG-OY', 'Oyo', ST_SetSRID(ST_MakePoint(3.9, 8.0), 4326), '{"capital": "Ibadan", "population": 7800000}'::jsonb)
    ) AS states(code, name, geometry, properties)
    ON CONFLICT (code) DO NOTHING
)
SELECT 1;

-- ============================================
-- SAMPLE LGAs (Level 3) - Limited sample for demonstration
-- ============================================

-- Sample LGAs for Lagos State
INSERT INTO locations (code, name, type, parent_id, geometry, properties)
SELECT 
    'NG-LA-' || UPPER(LEFT(lga_name, 3)), 
    lga_name, 
    'lga',
    (SELECT id FROM locations WHERE code = 'NG-LA'),
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
    '{"population": ' || (random() * 500000 + 100000)::int || '}'::jsonb
FROM (VALUES
    ('Alimosho', 3.28, 6.58),
    ('Ikeja', 3.35, 6.60),
    ('Eti-Osa', 3.45, 6.43),
    ('Lagos Island', 3.40, 6.45),
    ('Surulere', 3.35, 6.52),
    ('Ikorodu', 3.50, 6.62),
    ('Badagry', 2.88, 6.42)
) AS lgas(lga_name, longitude, latitude)
ON CONFLICT DO NOTHING;

-- Sample LGAs for Kano State
INSERT INTO locations (code, name, type, parent_id, geometry, properties)
SELECT 
    'NG-KN-' || UPPER(LEFT(lga_name, 3)), 
    lga_name, 
    'lga',
    (SELECT id FROM locations WHERE code = 'NG-KN'),
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
    '{"population": ' || (random() * 400000 + 150000)::int || '}'::jsonb
FROM (VALUES
    ('Kano Municipal', 8.52, 12.00),
    ('Nassarawa', 8.55, 12.02),
    ('Fagge', 8.53, 12.05),
    ('Dala', 8.55, 12.00),
    ('Gwale', 8.52, 12.03),
    ('Tarauni', 8.55, 12.03)
) AS lgas(lga_name, longitude, latitude)
ON CONFLICT DO NOTHING;

-- Sample LGAs for Rivers State
INSERT INTO locations (code, name, type, parent_id, geometry, properties)
SELECT 
    'NG-RI-' || UPPER(LEFT(lga_name, 3)), 
    lga_name, 
    'lga',
    (SELECT id FROM locations WHERE code = 'NG-RI'),
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
    '{"population": ' || (random() * 300000 + 100000)::int || '}'::jsonb
FROM (VALUES
    ('Port Harcourt', 7.03, 4.82),
    ('Obio-Akpor', 7.05, 4.85),
    ('Eleme', 7.15, 4.78),
    ('Ikwerre', 6.95, 4.88),
    ('Oyigbo', 7.15, 4.75)
) AS lgas(lga_name, longitude, latitude)
ON CONFLICT DO NOTHING;

-- Sample LGAs for FCT
INSERT INTO locations (code, name, type, parent_id, geometry, properties)
SELECT 
    'NG-FC-' || UPPER(LEFT(lga_name, 3)), 
    lga_name, 
    'lga',
    (SELECT id FROM locations WHERE code = 'NG-FC'),
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
    '{"population": ' || (random() * 200000 + 50000)::int || '}'::jsonb
FROM (VALUES
    ('Abuja Municipal', 7.52, 9.08),
    ('Gwagwalada', 7.03, 8.93),
    ('Kuje', 7.05, 8.88),
    ('Bwari', 7.38, 9.27),
    ('Kwali', 7.00, 8.52)
) AS lgas(lga_name, longitude, latitude)
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE FACILITIES (Level 4) - Limited sample
-- ============================================

-- Sample facilities in Lagos Island LGA
INSERT INTO locations (code, name, type, parent_id, geometry, properties)
SELECT 
    'FAC-' || md5(random()::text),
    facility_name,
    'facility',
    (SELECT id FROM locations WHERE name = 'Lagos Island' AND type = 'lga'),
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
    jsonb_build_object(
        'facility_type', facility_type,
        'ownership', ownership,
        'level', level,
        'has_cold_chain', has_cold_chain,
        'has_solar', has_solar
    )
FROM (VALUES
    ('Lagos Island General Hospital', 3.405, 6.455, 'General Hospital', 'Public', 'Secondary', true, true),
    ('Maroko Primary Health Centre', 3.410, 6.448, 'Primary Health Centre', 'Public', 'Primary', true, false),
    ('Obalende Maternal Centre', 3.398, 6.462, 'Specialist Clinic', 'Public', 'Primary', true, true),
    ('Ikoyi Medical Centre', 3.420, 6.470, 'General Hospital', 'Private', 'Secondary', true, true)
) AS facs(facility_name, longitude, latitude, facility_type, ownership, level, has_cold_chain, has_solar)
ON CONFLICT DO NOTHING;

-- Sample facilities in Kano Municipal LGA
INSERT INTO locations (code, name, type, parent_id, geometry, properties)
SELECT 
    'FAC-' || md5(random()::text),
    facility_name,
    'facility',
    (SELECT id FROM locations WHERE name = 'Kano Municipal' AND type = 'lga'),
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
    jsonb_build_object(
        'facility_type', facility_type,
        'ownership', ownership,
        'level', level,
        'has_cold_chain', has_cold_chain,
        'has_solar', has_solar
    )
FROM (VALUES
    ('Murtala Muhammad Specialist Hospital', 8.525, 12.005, 'Specialist Hospital', 'Public', 'Tertiary', true, true),
    ('Nassarawa PHC', 8.555, 12.025, 'Primary Health Centre', 'Public', 'Primary', true, false),
    ('Kano Dental Clinic', 8.530, 12.010, 'Clinic', 'Private', 'Primary', false, false)
) AS facs(facility_name, longitude, latitude, facility_type, ownership, level, has_cold_chain, has_solar)
ON CONFLICT DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- Total records created:
-- - 6 Geopolitical Zones
-- - 37 States (36 + FCT)
-- - 23 Sample LGAs (across 4 states)
-- - 7 Sample Facilities

-- Verify the seed data
SELECT 
    type,
    COUNT(*) as count
FROM locations
GROUP BY type
ORDER BY type;
