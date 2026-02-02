/**
 * VaxTrace Nigeria - AES-256 Encryption Utilities
 * 
 * This module provides encryption/decryption utilities for data at rest
 * using AES-256-GCM (Galois/Counter Mode) for authenticated encryption.
 * 
 * Features:
 * - AES-256-GCM encryption (256-bit key, 96-bit IV, 128-bit auth tag)
 * - PBKDF2 key derivation from environment variable
 * - Automatic IV generation and storage alongside ciphertext
 * - Authenticated encryption (prevents tampering)
 * - Compatible with Node.js crypto module
 * 
 * Security Considerations:
 * - Never log or expose encryption keys
 * - Use different keys for different data types if possible
 * - Rotate keys periodically (implement key versioning)
 * - Store encryption keys securely (use KMS in production)
 * 
 * NDPR Compliance:
 * - Encrypts sensitive data at rest (full names, national IDs)
 * - Meets Nigeria Data Protection Regulation requirements
 */

import crypto from 'crypto';

// ============================================
// CONSTANTS
// ============================================

/**
 * Encryption algorithm: AES-256-GCM
 * - 256-bit key (32 bytes)
 * - 96-bit IV (12 bytes) - recommended for GCM
 * - 128-bit authentication tag (16 bytes) - automatically appended
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 64;
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum

// ============================================
// TYPES
// ============================================

export interface EncryptedData {
  /** The encrypted data (base64 encoded) */
  ciphertext: string;
  /** The initialization vector used (base64 encoded) */
  iv: string;
  /** The authentication tag (base64 encoded) */
  authTag: string;
  /** Key version for future key rotation support */
  keyVersion: number;
}

export interface EncryptionResult {
  /** The encrypted data object */
  data: EncryptedData;
  /** The hex string of the ciphertext (for database BYTEA storage) */
  hex: string;
}

// ============================================
// KEY DERIVATION
// ============================================

/**
 * Derives a cryptographic key from the environment variable
 * using PBKDF2 (Password-Based Key Derivation Function 2)
 * 
 * @param password - The encryption password from environment
 * @param salt - The salt for key derivation (hex string)
 * @returns Buffer containing the derived key
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  if (!password || password.length < 32) {
    throw new Error(
      'Encryption password must be at least 32 characters long. ' +
      'Please set ENCRYPTION_KEY in your .env file.'
    );
  }

  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Gets or generates the master encryption salt
 * In production, this should be stored securely (e.g., in a KMS)
 */
function getMasterSalt(): Buffer {
  const saltFromEnv = process.env.ENCRYPTION_SALT;
  
  if (saltFromEnv) {
    return Buffer.from(saltFromEnv, 'hex');
  }
  
  // For development: generate a consistent salt
  // In production, ALWAYS provide ENCRYPTION_SALT in environment
  const defaultSalt = crypto.randomBytes(SALT_LENGTH);
  console.warn(
    '⚠️  WARNING: Using randomly generated salt. ' +
    'Set ENCRYPTION_SALT in .env for production to maintain data consistency.'
  );
  return defaultSalt;
}

// ============================================
// ENCRYPTION
// ============================================

/**
 * Encrypts sensitive data using AES-256-GCM
 * 
 * @param plaintext - The sensitive data to encrypt (string)
 * @param keyVersion - The key version (for future rotation support)
 * @returns EncryptionResult containing encrypted data and hex representation
 * 
 * @example
 * ```ts
 * const result = encrypt('John Doe', 1);
 * // Store result.hex in database BYTEA column
 * // Or store JSON string of result.data
 * ```
 */
export function encrypt(plaintext: string, keyVersion: number = 1): EncryptionResult {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty or null value');
  }

  // Get encryption key
  const salt = getMasterSalt();
  const key = deriveKey(getEncryptionPassword(), salt);

  // Generate random IV (never reuse an IV with the same key)
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the data
  let ciphertext = cipher.update(plaintext, 'utf8', 'binary');
  ciphertext += cipher.final('binary');

  // Get authentication tag (prevents tampering)
  const authTag = cipher.getAuthTag();

  // Create encrypted data object
  const encryptedData: EncryptedData = {
    ciphertext: Buffer.from(ciphertext, 'binary').toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion,
  };

  // Create hex representation for database BYTEA storage
  // Format: iv(12) + authTag(16) + ciphertext
  const hex = Buffer.concat([
    iv,
    authTag,
    Buffer.from(ciphertext, 'binary'),
  ]).toString('hex');

  return {
    data: encryptedData,
    hex,
  };
}

/**
 * Encrypts an object by converting it to JSON first
 * 
 * @param obj - The object to encrypt
 * @param keyVersion - The key version
 * @returns EncryptionResult
 */
export function encryptObject<T extends Record<string, any>>(
  obj: T,
  keyVersion: number = 1
): EncryptionResult {
  return encrypt(JSON.stringify(obj), keyVersion);
}

// ============================================
// DECRYPTION
// ============================================

/**
 * Decrypts data that was encrypted using the encrypt function
 * 
 * @param hexData - The hex string containing iv + authTag + ciphertext
 * @returns The decrypted plaintext string
 * 
 * @example
 * ```ts
 * const decrypted = decrypt(hexFromDatabase);
 * console.log(decrypted); // 'John Doe'
 * ```
 */
export function decrypt(hexData: string): string {
  if (!hexData) {
    throw new Error('Cannot decrypt empty or null value');
  }

  // Get encryption key
  const salt = getMasterSalt();
  const key = deriveKey(getEncryptionPassword(), salt);

  // Parse the hex data
  const buffer = Buffer.from(hexData, 'hex');

  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }

  // Extract IV, auth tag, and ciphertext
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext.toString('utf8');
}

/**
 * Decrypts data from EncryptedData object format
 * 
 * @param encryptedData - The EncryptedData object
 * @returns The decrypted plaintext string
 */
export function decryptFromObject(encryptedData: EncryptedData): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty or null EncryptedData');
  }

  // Get encryption key
  const salt = getMasterSalt();
  const key = deriveKey(getEncryptionPassword(), salt);

  // Parse base64 components
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext.toString('utf8');
}

/**
 * Decrypts an object that was encrypted using encryptObject
 * 
 * @param hexData - The hex string containing encrypted object
 * @returns The decrypted object
 */
export function decryptObject<T = any>(hexData: string): T {
  const decrypted = decrypt(hexData);
  return JSON.parse(decrypted) as T;
}

// ============================================
// DATABASE HELPERS
// ============================================

/**
 * Encrypts a field for database storage
 * Returns a Buffer suitable for PostgreSQL BYTEA columns
 * 
 * @param plaintext - The data to encrypt
 * @returns Buffer for database storage
 */
export function encryptForDatabase(plaintext: string): Buffer {
  const result = encrypt(plaintext);
  return Buffer.from(result.hex, 'hex');
}

/**
 * Decrypts a field from database BYTEA column
 * 
 * @param buffer - The Buffer from database
 * @returns Decrypted plaintext string
 */
export function decryptFromDatabase(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) {
    return '';
  }
  return decrypt(buffer.toString('hex'));
}

// ============================================
// UTILITIES
// ============================================

/**
 * Gets the encryption password from environment
 * Throws error if not set
 */
function getEncryptionPassword(): string {
  const password = process.env.ENCRYPTION_KEY;
  
  if (!password) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Please set a 32+ character encryption key in your .env file.'
    );
  }
  
  if (password.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be at least 32 characters long. ' +
      `Current length: ${password.length}`
    );
  }
  
  return password;
}

/**
 * Generates a cryptographically secure random key
 * Useful for generating new ENCRYPTION_KEY values
 * 
 * @returns Hex-encoded 256-bit key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Generates a cryptographically secure salt
 * Useful for generating new ENCRYPTION_SALT values
 * 
 * @returns Hex-encoded 512-bit salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Validates if a string appears to be encrypted data
 * (basic heuristic check)
 * 
 * @param hexData - The hex string to validate
 * @returns True if appears to be valid encrypted data
 */
export function isValidEncryptedData(hexData: string): boolean {
  try {
    const buffer = Buffer.from(hexData, 'hex');
    return buffer.length >= IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

// ============================================
// KEY VERSIONING (Future Support)
// ============================================

/**
 * Key versioning map for future key rotation support
 * When implementing key rotation:
 * 1. Add new key version to this map
 * 2. Update encrypt() to use latest version
 * 3. Update decrypt() to try all versions
 */
const KEY_VERSIONS: Record<number, string> = {
  1: process.env.ENCRYPTION_KEY || '',
  // Future versions:
  // 2: process.env.ENCRYPTION_KEY_V2 || '',
};

/**
 * Decrypts data trying all known key versions
 * Useful during key rotation migration
 */
export function decryptWithKeyVersions(hexData: string): string {
  const errors: Error[] = [];

  for (const [version, key] of Object.entries(KEY_VERSIONS)) {
    if (!key) continue;

    try {
      // Temporarily set the key
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = key;

      const result = decrypt(hexData);

      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;

      return result;
    } catch (error) {
      errors.push(error as Error);
      // Continue to next version
    }
  }

  throw new Error(
    `Failed to decrypt with any key version. Errors: ${errors.map(e => e.message).join(', ')}`
  );
}
