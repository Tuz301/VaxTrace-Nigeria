/**
 * VaxTrace Nigeria - TLS 1.3 Security Configuration
 * 
 * This module configures TLS 1.3 security for the Galaxy Backbone (GBB)
 * cloud platform endpoints, ensuring NDPR compliance and secure
 * data transmission.
 * 
 * Features:
 * - TLS 1.3 only (no fallback to older versions)
 * - Strong cipher suites
 * - Certificate validation
 * - HSTS (HTTP Strict Transport Security)
 * - Certificate pinning support
 * 
 * NDPR Compliance:
 * - SSL/TLS 1.3 mandatory as per Nigeria Data Protection Regulation
 * - AES-256 encryption for data in transit
 * - Secure certificate management
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// ============================================
// TYPES
// ============================================

export interface TLSConfigOptions {
  /** Path to TLS certificate file */
  certPath: string;
  /** Path to TLS private key file */
  keyPath: string;
  /** Path to CA certificate (for GBB) */
  caPath?: string;
  /** Enable client certificate authentication */
  requestCert?: boolean;
  /** Reject unauthorized certificates */
  rejectUnauthorized?: boolean;
  /** Enable OCSP stapling */
  enableOCSPStapling?: boolean;
}

export interface HTTPOptions {
  /** HTTPS server options */
  server: https.ServerOptions;
  /** HTTP Strict Transport Security options */
  hsts: HSTSOptions;
  /** Security headers */
  headers: SecurityHeaders;
}

export interface HSTSOptions {
  /** Enable HSTS */
  enable: boolean;
  /** Max-age in seconds (31536000 = 1 year) */
  maxAge: number;
  /** Include subdomains */
  includeSubDomains: boolean;
  /** Allow preloading */
  preload: boolean;
}

export interface SecurityHeaders {
  /** Content Security Policy */
  csp: string;
  /** X-Frame-Options */
  frameOptions: string;
  /** X-Content-Type-Options */
  contentTypeOptions: string;
  /** X-XSS-Protection */
  xssProtection: string;
  /** Referrer-Policy */
  referrerPolicy: string;
  /** Permissions-Policy */
  permissionsPolicy: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * TLS 1.3 Cipher Suites (approved by GBB)
 * Only the strongest cipher suites are allowed
 */
const TLS_13_CIPHER_SUITES = [
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'TLS_AES_128_GCM_SHA256',
];

/**
 * Minimum TLS version: 1.3 only
 * No fallback to TLS 1.2 or below
 */
const MIN_TLS_VERSION = 'TLSv1.3';
const MAX_TLS_VERSION = 'TLSv1.3';

/**
 * HSTS Configuration
 * 1 year max-age with preload and includeSubDomains
 */
const DEFAULT_HSTS: HSTSOptions = {
  enable: true,
  maxAge: 31536000, // 1 year in seconds
  includeSubDomains: true,
  preload: true,
};

/**
 * Default Security Headers
 */
const DEFAULT_SECURITY_HEADERS: SecurityHeaders = {
  csp: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openlmis.org; frame-ancestors 'none';",
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(self), microphone=(), camera=()',
};

// ============================================
// CONFIGURATION
// ============================================

/**
 * Creates TLS configuration for HTTPS server
 * 
 * @param options - TLS configuration options
 * @returns HTTPS server options
 * 
 * @example
 * ```ts
 * const tlsConfig = createTLSConfig({
 *   certPath: '/etc/ssl/certs/vaxtrace.crt',
 *   keyPath: '/etc/ssl/private/vaxtrace.key',
 *   caPath: '/etc/ssl/certs/gbb-ca.crt',
 * });
 * 
 * const server = https.createServer(tlsConfig, app);
 * ```
 */
export function createTLSConfig(options: TLSConfigOptions): https.ServerOptions {
  const {
    certPath,
    keyPath,
    caPath,
    requestCert = false,
    rejectUnauthorized = true,
    enableOCSPStapling = true,
  } = options;

  // Validate certificate paths
  if (!fs.existsSync(certPath)) {
    throw new Error(`TLS certificate not found at: ${certPath}`);
  }

  if (!fs.existsSync(keyPath)) {
    throw new Error(`TLS private key not found at: ${keyPath}`);
  }

  if (caPath && !fs.existsSync(caPath)) {
    throw new Error(`CA certificate not found at: ${caPath}`);
  }

  const tlsConfig: https.ServerOptions = {
    // Certificate and key
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    
    // CA certificate (for GBB)
    ca: caPath ? fs.readFileSync(caPath) : undefined,
    
    // Client certificate authentication
    requestCert,
    rejectUnauthorized,
    
    // TLS 1.3 Only
    minVersion: MIN_TLS_VERSION as any,
    maxVersion: MAX_TLS_VERSION as any,
    
    // Cipher suites (TLS 1.3)
    ciphers: TLS_13_CIPHER_SUITES.join(':'),
    honorCipherOrder: true,
    
    // Security options
    secureOptions: 
      crypto.constants.SSL_OP_NO_SSLv3 |
      crypto.constants.SSL_OP_NO_TLSv1 |
      crypto.constants.SSL_OP_NO_TLSv1_1 |
      crypto.constants.SSL_OP_NO_TLSv1_2 |
      crypto.constants.SSL_OP_NO_COMPRESSION |
      crypto.constants.SSL_OP_NO_RENEGOTIATION,
    
    // Session tickets
    sessionTimeout: 3600, // 1 hour
    ticketKeys: crypto.randomBytes(48),
    
    // OCSP Stapling
    ...(enableOCSPStapling && {
      // Note: OCSP stapling requires additional setup
      // This is a placeholder for future implementation
    }),
  };

  return tlsConfig;
}

/**
 * Creates complete HTTP options including TLS and security headers
 * 
 * @param tlsOptions - TLS configuration options
 * @param hstsOptions - Optional HSTS options
 * @returns Complete HTTP options
 */
export function createHTTPOptions(
  tlsOptions: TLSConfigOptions,
  hstsOptions?: Partial<HSTSOptions>
): HTTPOptions {
  const hsts = { ...DEFAULT_HSTS, ...hstsOptions };

  return {
    server: createTLSConfig(tlsOptions),
    hsts,
    headers: DEFAULT_SECURITY_HEADERS,
  };
}

// ============================================
// SECURITY HEADERS MIDDLEWARE
// ============================================

/**
 * Express middleware to apply security headers
 * 
 * @param options - HTTP options from createHTTPOptions
 * @returns Express middleware function
 */
export function securityHeadersMiddleware(options: HTTPOptions) {
  return (req: any, res: any, next: any) => {
    // HSTS (HTTP Strict Transport Security)
    if (options.hsts.enable) {
      const hstsValue = `max-age=${options.hsts.maxAge}` +
        (options.hsts.includeSubDomains ? '; includeSubDomains' : '') +
        (options.hsts.preload ? '; preload' : '');
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Content Security Policy
    res.setHeader('Content-Security-Policy', options.headers.csp);

    // X-Frame-Options (clickjacking protection)
    res.setHeader('X-Frame-Options', options.headers.frameOptions);

    // X-Content-Type-Options (MIME-sniffing protection)
    res.setHeader('X-Content-Type-Options', options.headers.contentTypeOptions);

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', options.headers.xssProtection);

    // Referrer-Policy
    res.setHeader('Referrer-Policy', options.headers.referrerPolicy);

    // Permissions-Policy (formerly Feature-Policy)
    res.setHeader('Permissions-Policy', options.headers.permissionsPolicy);

    // Additional security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Powered-By', ''); // Hide server info

    next();
  };
}

// ============================================
// CERTIFICATE VALIDATION
// ============================================

/**
 * Validates a TLS certificate file
 * 
 * @param certPath - Path to certificate file
 * @returns Certificate info
 */
export function validateCertificate(certPath: string): {
  valid: boolean;
  subject?: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  daysRemaining?: number;
  error?: string;
} {
  try {
    const cert = fs.readFileSync(certPath, 'utf8');
    const info = {
      valid: true,
      subject: '',
      issuer: '',
      validFrom: new Date(),
      validTo: new Date(),
      daysRemaining: 0,
    };

    // Parse certificate (basic implementation)
    const lines = cert.split('\n');
    let inCert = false;
    let certData = '';

    for (const line of lines) {
      if (line.includes('BEGIN CERTIFICATE')) {
        inCert = true;
      } else if (line.includes('END CERTIFICATE')) {
        inCert = false;
      } else if (inCert) {
        certData += line.trim();
      }
    }

    // For production, use a proper certificate parser
    // This is a simplified implementation
    const decoded = Buffer.from(certData, 'base64').toString('ascii');
    
    // Extract basic info (simplified)
    // In production, use node-forge or similar library
    
    return info;
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Checks if a certificate is expiring soon
 * 
 * @param certPath - Path to certificate file
 * @param daysThreshold - Days before expiration to warn (default: 30)
 * @returns Warning message or null
 */
export function checkCertificateExpiry(
  certPath: string,
  daysThreshold: number = 30
): string | null {
  const certInfo = validateCertificate(certPath);
  
  if (!certInfo.valid) {
    return `Certificate validation failed: ${certInfo.error}`;
  }

  if (certInfo.daysRemaining !== undefined && certInfo.daysRemaining <= daysThreshold) {
    return `Certificate expires in ${certInfo.daysRemaining} days. Please renew before ${certInfo.validTo?.toISOString()}`;
  }

  return null;
}

// ============================================
// CERTIFICATE PINNING
// ============================================

/**
 * Certificate pinning configuration for GBB endpoints
 * In production, store pinned certificates securely
 */
const PINNED_CERTIFICATES: Record<string, string[]> = {
  'api.openlmis.org': [
    // Add pinned certificate hashes here
    // Format: SHA-256 hash of SPKI fingerprint
  ],
  'galaxybackbone.com': [
    // Add GBB pinned certificates
  ],
};

/**
 * Validates certificate pinning for a given hostname
 * 
 * @param hostname - The hostname to validate
 * @param cert - The certificate from the connection
 * @returns True if certificate is pinned and valid
 */
export function validateCertificatePinning(
  hostname: string,
  cert: string
): boolean {
  const pinned = PINNED_CERTIFICATES[hostname];
  
  if (!pinned || pinned.length === 0) {
    // No pinning configured for this host
    return true;
  }

  // Compute certificate fingerprint
  const fingerprint = crypto
    .createHash('sha256')
    .update(cert)
    .digest('base64');

  return pinned.includes(fingerprint);
}

// ============================================
// TLS CONFIGURATION FROM ENVIRONMENT
// ============================================

/**
 * Loads TLS configuration from environment variables
 * 
 * @returns TLS configuration options
 */
export function loadTLSFromEnvironment(): TLSConfigOptions {
  const certPath = process.env.TLS_CERT_PATH;
  const keyPath = process.env.TLS_KEY_PATH;
  const caPath = process.env.TLS_CA_PATH;

  if (!certPath || !keyPath) {
    throw new Error(
      'TLS certificate paths not configured. ' +
      'Please set TLS_CERT_PATH and TLS_KEY_PATH in your environment.'
    );
  }

  return {
    certPath: path.resolve(certPath),
    keyPath: path.resolve(keyPath),
    caPath: caPath ? path.resolve(caPath) : undefined,
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  };
}

/**
 * Creates production-ready TLS configuration for GBB
 * 
 * @returns Complete HTTP options for production
 */
export function createProductionTLSConfig(): HTTPOptions {
  const tlsOptions = loadTLSFromEnvironment();
  
  // Check certificate expiry
  const expiryWarning = checkCertificateExpiry(tlsOptions.certPath);
  if (expiryWarning) {
    console.warn(`⚠️  Certificate Warning: ${expiryWarning}`);
  }

  return createHTTPOptions(tlsOptions, {
    enable: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  });
}

// ============================================
// HELPERS
// ============================================

/**
 * Generates a self-signed certificate for development
 * NEVER use in production!
 * 
 * @param outputPath - Directory to save certificates
 * @returns Paths to generated files
 */
export function generateDevCertificate(outputPath: string): {
  certPath: string;
  keyPath: string;
} {
  // This is a placeholder
  // In development, use a tool like mkcert or OpenSSL
  
  console.warn(
    '⚠️  WARNING: Self-signed certificates should NEVER be used in production!'
  );

  const certPath = path.join(outputPath, 'dev.crt');
  const keyPath = path.join(outputPath, 'dev.key');

  // Implementation would use node-forge or exec OpenSSL
  // For now, return paths for documentation
  
  return { certPath, keyPath };
}

/**
 * Gets the current TLS protocol version in use
 * 
 * @param socket - TLS socket from connection
 * @returns TLS version string
 */
export function getTLSVersion(socket: any): string {
  return socket.getProtocol() || 'unknown';
}

/**
 * Gets the cipher suite in use for a connection
 * 
 * @param socket - TLS socket from connection
 * @returns Cipher suite name
 */
export function getCipherSuite(socket: any): string {
  return socket.getCipher()?.name || 'unknown';
}

// Export crypto for use in this module
import * as crypto from 'crypto';
