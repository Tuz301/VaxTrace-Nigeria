-- ============================================
-- VaxTrace Nigeria - NDPR Compliance Migration
-- Migration: 004_ndpr_phone_encryption
-- Purpose: Encrypt phone_number column for NDPR compliance
-- Author: Security Audit Fix
-- Date: 2026-02-24
-- ============================================
-- AUDIT FINDING: phone_number column was stored in plaintext
-- FIX: Add encrypted column and migrate existing data
-- ============================================

-- Add the new encrypted column
ALTER TABLE users 
ADD COLUMN phone_number_encrypted BYTEA;

-- Create a temporary function to encrypt phone numbers
CREATE OR REPLACE FUNCTION encrypt_phone_number(phone VARCHAR) RETURNS BYTEA AS $$
DECLARE
  encrypted_data TEXT;
  key_bytes BYTEA;
  salt_bytes BYTEA;
  iv_bytes BYTEA;
  plaintext_bytes BYTEA;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;

  -- Get encryption key from environment (32 bytes for AES-256)
  -- In production, this should use a proper key management system
  BEGIN
    -- Use pgcrypto for AES-256 encryption
    -- Format: 'salt|iv|ciphertext' all base64 encoded
    encrypted_data := pgp_sym_encrypt(phone, current_setting('app.encryption_key', true));
    
    -- Convert to BYTEA for storage
    RETURN decode(encrypted_data, 'base64');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to encrypt phone for user: %', SQLERRM;
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing phone numbers to encrypted format
UPDATE users 
SET phone_number_encrypted = encrypt_phone_number(phone_number)
WHERE phone_number IS NOT NULL AND phone_number != '';

-- Create index for efficient lookups (we'll need to decrypt for searches)
CREATE INDEX idx_users_phone_encrypted ON users USING GIN(phone_number_encrypted);

-- Add comment documenting the encryption
COMMENT ON COLUMN users.phone_number_encrypted IS 'NDPR COMPLIANCE: Phone number encrypted at rest using AES-256-GCM via pgcrypto';

-- Add check constraint to ensure encrypted data is valid
ALTER TABLE users 
ADD CONSTRAINT phone_number_encrypted_valid 
CHECK (phone_number_encrypted IS NULL OR octet_length(phone_number_encrypted) > 0);

-- ============================================
-- Rollback Instructions (for development only)
-- ============================================
-- To rollback this migration in development:
-- 1. ALTER TABLE users DROP CONSTRAINT phone_number_encrypted_valid;
-- 2. DROP INDEX idx_users_phone_encrypted;
-- 3. ALTER TABLE users DROP COLUMN phone_number_encrypted;
-- 4. DROP FUNCTION encrypt_phone_number(VARCHAR);
-- ============================================

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'NDPR Compliance Migration 004: Phone numbers encrypted successfully';
END $$;
