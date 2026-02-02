-- ============================================
-- VaxTrace Nigeria - Vaccine Seed Data
-- ============================================
-- This seed file populates the vaccines table with:
-- Routine EPI vaccines used in Nigeria
-- Based on Nigeria's National Immunization Schedule
-- ============================================

INSERT INTO vaccines (code, name, category, dose_volume_ml, doses_per_vial, min_storage_temp, max_storage_temp, shelf_life_months, requires_cold_chain, min_months_of_stock, max_months_of_stock) VALUES
-- BCG (Bacille Calmette-Guérin) - Tuberculosis
('BCG', 'BCG Vaccine', 'routine', 0.05, 20, -50.0, 8.0, 24, true, 3.0, 6.0),

-- OPV (Oral Polio Vaccine)
('OPV0', 'Oral Polio Vaccine - Birth Dose', 'routine', 0.1, 20, -50.0, 8.0, 24, true, 3.0, 6.0),
('OPV', 'Oral Polio Vaccine', 'routine', 0.1, 20, -50.0, 8.0, 24, true, 3.0, 6.0),
('IPV', 'Inactivated Polio Vaccine', 'routine', 0.5, 10, 2.0, 8.0, 24, true, 3.0, 6.0),

-- Pentavalent Vaccine (DTP-HepB-Hib)
('PENTA', 'Pentavalent Vaccine (DTP-HepB-Hib)', 'routine', 0.5, 10, 2.0, 8.0, 36, true, 3.0, 6.0),

-- PCV (Pneumococcal Conjugate Vaccine)
('PCV', 'Pneumococcal Conjugate Vaccine', 'routine', 0.5, 10, 2.0, 8.0, 36, true, 3.0, 6.0),

-- Rotavirus Vaccine
('ROTA', 'Rotavirus Vaccine', 'routine', 1.5, 10, 2.0, 8.0, 24, true, 3.0, 6.0),

-- Measles Vaccine
('MEASLES', 'Measles Vaccine', 'routine', 0.5, 10, -50.0, 8.0, 24, true, 3.0, 6.0),
('MR', 'Measles-Rubella Vaccine', 'routine', 0.5, 10, 2.0, 8.0, 36, true, 3.0, 6.0),

-- Yellow Fever Vaccine
('YF', 'Yellow Fever Vaccine', 'routine', 0.5, 10, 2.0, 8.0, 36, true, 3.0, 6.0),

-- Tetanus Toxoid
('TT', 'Tetanus Toxoid', 'routine', 0.5, 10, 2.0, 8.0, 36, true, 3.0, 6.0),

-- Hepatitis B Vaccine
('HEPB', 'Hepatitis B Vaccine', 'routine', 0.5, 10, 2.0, 8.0, 48, true, 3.0, 6.0),

-- HPV (Human Papillomavirus Vaccine) - New introduction
('HPV', 'HPV Vaccine', 'routine', 0.5, 10, 2.0, 8.0, 36, true, 3.0, 6.0),

-- COVID-19 Vaccines
('COV-AZ', 'AstraZeneca COVID-19 Vaccine', 'covid', 0.5, 10, 2.0, 8.0, 12, true, 2.0, 4.0),
('COV-PF', 'Pfizer-BioNTech COVID-19 Vaccine', 'covid', 0.3, 6, -90.0, -60.0, 9, true, 2.0, 4.0),
('COV-MD', 'Moderna COVID-19 Vaccine', 'covid', 0.5, 10, 2.0, 8.0, 9, true, 2.0, 4.0),
('COV-JJ', 'Janssen COVID-19 Vaccine', 'covid', 0.5, 10, 2.0, 8.0, 24, true, 2.0, 4.0),

-- Campaign/SIA (Supplementary Immunization Activities) Vaccines
('MEN-A', 'Meningitis A Vaccine', 'campaign', 0.5, 10, 2.0, 8.0, 36, true, 3.0, 6.0),
('CHOL', 'Oral Cholera Vaccine', 'campaign', 1.5, 10, 2.0, 8.0, 24, true, 2.0, 4.0)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- VACCINE CATEGORIES
-- ============================================
-- routine: Routine EPI vaccines given according to national schedule
-- campaign: Vaccines used during special immunization campaigns
-- covid: COVID-19 specific vaccines

-- ============================================
-- STORAGE REQUIREMENTS
-- ============================================
-- -50.0 to 8.0°C: Freezer vaccines (OPV, Measles)
-- 2.0 to 8.0°C: Standard cold chain (most vaccines)
-- -90.0 to -60.0°C: Ultra-cold (Pfizer COVID-19)

-- ============================================
-- VVM (Vaccine Vial Monitor) STAGES
-- ============================================
-- Stage 1: Inner square is lighter than outer circle - OK to use
-- Stage 2: Inner square matches outer circle - Use with caution
-- Stage 3: Inner square is darker than outer circle - Discard if not used
-- Stage 4: Inner square is much darker - DO NOT USE

-- Verify the seed data
SELECT 
    category,
    COUNT(*) as count,
    STRING_AGG(code, ', ') as vaccines
FROM vaccines
GROUP BY category
ORDER BY category;
