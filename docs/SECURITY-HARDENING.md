# VaxTrace Nigeria - Security Hardening Guide

This document outlines the security measures implemented in the VaxTrace application to protect against common vulnerabilities.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Input Validation & Sanitization](#input-validation--sanitization)
3. [Load Testing](#load-testing)
4. [Security Best Practices](#security-best-practices)

---

## Environment Variables

### Overview

All sensitive credentials are loaded from environment variables. No hardcoded credentials exist in the codebase.

### Implementation

**Location**: [`backend/src/modules/auth/auth.service.ts`](../backend/src/modules/auth/auth.service.ts)

Mock user passwords are loaded from environment variables:

```typescript
const getMockUsers = (): User[] => {
  const defaultHash = process.env.MOCK_DEFAULT_PASSWORD_HASH || 
    '$2b$10$YourHashedPasswordHere_CHANGE_IN_PRODUCTION';
  
  return [
    {
      id: 'VT-ADMIN-001',
      password: process.env.MOCK_ADMIN_PASSWORD_HASH || defaultHash,
      // ...
    },
    // ...
  ];
};
```

### Environment Variables Required

Add these to your `.env` file:

```bash
# Mock User Password Hashes (Development Only)
MOCK_DEFAULT_PASSWORD_HASH=$2b$10$...
MOCK_ADMIN_PASSWORD_HASH=$2b$10$...
MOCK_MGR_PASSWORD_HASH=$2b$10$...
MOCK_SUP_PASSWORD_HASH=$2b$10$...
MOCK_FAC_PASSWORD_HASH=$2b$10$...
```

### Generating Password Hashes

Use bcrypt to generate secure password hashes:

```bash
# Using htpasswd
htpasswd -bnBC 10 "" "your-password" | tr -d ':\n'

# Or using Node.js
node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
```

### Validation

Environment variables are validated at startup using [`env.validation.ts`](../backend/src/config/env.validation.ts):

```typescript
export class EnvironmentVariables {
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  OPENLMIS_CLIENT_SECRET: string;
  // ...
}
```

---

## Input Validation & Sanitization

### Overview

All user inputs are validated and sanitized to prevent:
- **SQL Injection**: Malicious SQL code execution
- **XSS (Cross-Site Scripting)**: Malicious script injection
- **HTML Injection**: Unwanted HTML content
- **NoScript Injection**: Malicious NoScript tags

### Implementation

**Location**: [`backend/src/common/decorators/sanitize.decorator.ts`](../backend/src/common/decorators/sanitize.decorator.ts)

#### Sanitization Functions

```typescript
// Main sanitization function
export function sanitizeInput(value: any): any {
  if (typeof value !== 'string') return value;
  
  // Remove SQL injection patterns
  let sanitized = value.replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b)/gi, '');
  
  // Remove SQL comment patterns
  sanitized = sanitized.replace(/(--)|(#)|(\/\*)|(\*\/)|(;)/g, '');
  
  // Remove XSS patterns
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '');
  
  return sanitized;
}
```

#### Decorators

```typescript
// Sanitize any string input
@Sanitize()
userId: string;

// Sanitize email addresses
@SanitizeEmail()
email: string;

// Sanitize UUID strings
@SanitizeUUID()
facilityId: string;

// Sanitize numeric input
@SanitizeNumber()
temperature: number;

// Sanitize array input
@SanitizeArray()
tags: string[];
```

### Usage in DTOs

**Location**: [`backend/src/modules/auth/dto/auth.dto.ts`](../backend/src/modules/auth/dto/auth.dto.ts)

```typescript
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Sanitize()  // Input is automatically sanitized
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(128)
  password: string;  // Password not sanitized (hashed instead)
}
```

### Additional Validation

All DTOs include:
- **Type validation**: `@IsString()`, `@IsNumber()`, etc.
- **Length validation**: `@MinLength()`, `@MaxLength()`
- **Format validation**: `@IsEmail()`, `@IsUUID()`, `@IsDateString()`
- **Range validation**: `@Min()`, `@Max()`
- **Enum validation**: `@IsEnum()`

### Global Validation Pipe

**Location**: [`backend/src/main.ts`](../backend/src/main.ts)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strip unknown properties
    forbidNonWhitelisted: true,    // Reject unknown properties
    transform: true,               // Transform types
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

---

## Load Testing

### Overview

Load testing helps identify performance bottlenecks and breaking points before users encounter them.

### Tools Used

- **k6**: Modern load testing tool for developers
- **Custom scripts**: Tailored for VaxTrace endpoints

### Test Files

| File | Purpose |
|------|---------|
| [`tests/load/k6-config.js`](../tests/load/k6-config.js) | Configuration and utilities |
| [`tests/load/simple-load-test.js`](../tests/load/simple-load-test.js) | Quick verification |
| [`tests/load/api-load-test.js`](../tests/load/api-load-test.js) | Comprehensive testing |

### Running Tests

```bash
# Quick test (10 users, 2 minutes)
npm run test:load:simple

# Full test with multiple scenarios
npm run test:load

# Stress test (500 users)
npm run test:load:stress

# Soak test (100 users, 15 minutes)
npm run test:load:soak
```

### Test Scenarios

1. **Constant Load**: Steady baseline traffic
2. **Ramp-Up**: Gradually increasing load (0 → 300 users)
3. **Stress Test**: Find breaking point (500 req/s)
4. **Soak Test**: Sustained load for memory leak detection

### Performance Thresholds

```javascript
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1000', 'avg<300'],
  http_req_failed: ['rate<0.01'],  // < 1% failure rate
  checks: ['rate>0.95'],          // 95% checks pass
}
```

### Detailed Documentation

See [`tests/load/README.md`](../tests/load/README.md) for complete load testing guide.

---

## Security Best Practices

### 1. Never Commit `.env` Files

The `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

### 2. Use Strong Passwords

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Avoid dictionary words
- Use a password manager

### 3. Rotate Secrets Regularly

- JWT secrets: Every 90 days
- Database passwords: Every 90 days
- API keys: Every 180 days
- Encryption keys: Annually

### 4. Enable HTTPS in Production

**Location**: [`backend/config/tls.config.ts`](../backend/config/tls.config.ts)

```typescript
export const tlsConfig = {
  cert: process.env.TLS_CERT_PATH,
  key: process.env.TLS_KEY_PATH,
  ca: process.env.TLS_CA_PATH,
  minVersion: 'TLSv1.3',
};
```

### 5. Implement Rate Limiting

**Location**: [`frontend/src/app/api/middleware/rate-limit.ts`](../frontend/src/app/api/middleware/rate-limit.ts)

```typescript
export const rateLimit = createRateLimit({
  limit: 100,  // 100 requests per window
  window: 60000,  // 1 minute
});
```

### 6. Use Helmet for Security Headers

**Location**: [`backend/src/main.ts`](../backend/src/main.ts)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### 7. Enable CORS Properly

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
});
```

### 8. Implement RBAC

**Location**: [`backend/src/guards/rbac.guard.ts`](../backend/src/guards/rbac.guard.ts)

Role-based access control ensures users can only access resources appropriate for their role.

### 9. Log Security Events

**Location**: [`backend/src/modules/audit/audit.service.ts`](../backend/src/modules/audit/audit.service.ts)

All authentication, authorization, and data access events are logged.

### 10. Regular Security Audits

- Run `npm audit` monthly
- Update dependencies regularly
- Review OWASP Top 10 vulnerabilities
- Conduct penetration testing annually

---

## Checklist

### Before Deployment

- [ ] All environment variables are set in production
- [ ] No hardcoded credentials in code
- [ ] JWT secrets are strong and unique
- [ ] Database passwords are strong
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are set (Helmet)
- [ ] Input validation is enabled
- [ ] SQL injection protection is tested
- [ ] XSS protection is tested
- [ ] Load testing has been run
- [ ] Error handling doesn't leak sensitive info
- [ ] Logging is configured (not too verbose)
- [ ] Backup strategy is in place

### After Deployment

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Review access logs
- [ ] Check for failed login attempts
- [ ] Verify rate limiting works
- [ ] Test load balancing (if applicable)
- [ ] Verify SSL/TLS certificates

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [NestJS Security](https://docs.nestjs.com/security/encryption-and-hashing)
- [k6 Documentation](https://k6.io/docs/)

---

## Support

For security concerns or questions:
- Review this document
- Check the [Load Testing Guide](../tests/load/README.md)
- Open an issue in the project repository
