-- ============================================
-- VaxTrace Nigeria - NDPR Compliance Rollback
-- Migration: 004_ndpr_phone_encryption (DOWN)
-- Purpose: Rollback phone number encryption
-- WARNING: Only use in development - NEVER in production
-- ============================================

-- Drop the constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS phone_number_encrypted_valid;

-- Drop the index
DROP INDEX IF EXISTS idx_users_phone_encrypted;

-- Drop the encrypted column
ALTER TABLE users DROP COLUMN IF EXISTS phone_number_encrypted;

-- Drop the encryption function
DROP FUNCTION IF EXISTS encrypt_phone_number(VARCHAR);

-- ============================================
-- Rollback notification
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'NDPR Compliance Migration 004 ROLLED BACK: Phone encryption removed';
  RAISE WARNING 'This should NEVER be done in production!';
END $$;
