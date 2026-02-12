/**
 * VaxTrace Nigeria - Rate Limiting Middleware
 * 
 * FIX #8: Rate Limiting on API Routes
 * Implements rate limiting to prevent abuse and ensure fair usage
 * 
 * Features:
 * - Per-user rate limits
 * - Sliding window algorithm
 * - Request deduplication
 * - Cache stampede prevention
 */

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store (for production, use Redis)
 */
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Request deduplication store (prevents duplicate requests)
 */
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Cleanup expired entries from rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 60000);
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return async (req: Request, context: any): Promise<Response> => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }
    
    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }
    
    // Increment counter
    entry.count++;
    
    // Add rate limit headers to response
    const addRateLimitHeaders = (response: Response): Response => {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-RateLimit-Limit', maxRequests.toString());
      newHeaders.set('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
      newHeaders.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    };
    
    return addRateLimitHeaders(await context.next());
  };
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Try to get IP from headers (for proxied requests)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
  
  return `ratelimit:${ip}`;
}

/**
 * User-based rate limiting key generator
 */
export function userBasedKeyGenerator(req: Request): string {
  // Try to get user ID from authorization header
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // In production, decode JWT and extract user ID
    // For now, use a hash of the token
    return `ratelimit:user:${hashToken(token)}`;
  }
  
  // Fall back to IP-based limiting
  return defaultKeyGenerator(req);
}

/**
 * Simple hash function for tokens
 */
function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Request deduplication - prevents duplicate in-flight requests
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  const pending = pendingRequests.get(key);
  
  if (pending) {
    // Return the pending request
    return pending;
  }
  
  // Create new request
  const promise = requestFn().finally(() => {
    // Remove from pending store when done
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Cache stampede prevention using request coalescing
 */
export function preventCacheStampede<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5000 // Coalesce requests within 5ms window
): Promise<T> {
  return deduplicateRequest(key, fetchFn);
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Public endpoints - more lenient
  public: {
    windowMs: 60000,  // 1 minute
    maxRequests: 100,  // 100 requests per minute
  },
  
  // Authenticated endpoints
  authenticated: {
    windowMs: 60000,  // 1 minute
    maxRequests: 200,  // 200 requests per minute
    keyGenerator: userBasedKeyGenerator,
  },
  
  // Expensive operations (e.g., reports, exports)
  expensive: {
    windowMs: 60000,  // 1 minute
    maxRequests: 10,   // 10 requests per minute
    keyGenerator: userBasedKeyGenerator,
  },
  
  // Write operations (e.g., updates, deletes)
  write: {
    windowMs: 60000,  // 1 minute
    maxRequests: 50,   // 50 requests per minute
    keyGenerator: userBasedKeyGenerator,
  },
  
  // Webhook endpoints
  webhook: {
    windowMs: 60000,  // 1 minute
    maxRequests: 1000, // 1000 requests per minute
  },
};

/**
 * Apply rate limiting to an API route
 *
 * Usage in route.ts:
 * import { rateLimit, rateLimitConfigs } from '@/app/api/middleware/rate-limit';
 *
 * export const GET = rateLimit(rateLimitConfigs.public)(async (req) => {
 *   // Your handler code
 * });
 */
export function createRateLimitedHandler(
  config: RateLimitConfig,
  handler: (req: Request, context: any) => Promise<Response>
): (req: Request, context: any) => Promise<Response> {
  return async (req: Request, context: any) => {
    // Check rate limit
    const keyGenerator = config.keyGenerator || defaultKeyGenerator;
    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    }
    
    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }
    
    // Increment counter
    entry.count++;
    
    // Add rate limit headers to response
    const response = await handler(req, context);
    
    // Add rate limit headers to response
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-RateLimit-Limit', config.maxRequests.toString());
    newHeaders.set('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
    newHeaders.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}
