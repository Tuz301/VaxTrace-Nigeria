/**
 * VaxTrace Nigeria - Sentry Configuration
 *
 * Error tracking and performance monitoring for production.
 * Captures unhandled exceptions, performance issues, and provides context.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry(): void {
  // Only initialize in production or when SENTRY_DSN is provided
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry DSN not provided - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Set traces sample rate based on environment
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      
      // Filter out expected errors (like 404s)
      if (event.exception) {
        const exception = event.exception.values?.[0];
        if (exception?.type === 'NotFoundException') {
          return null; // Don't send 404s to Sentry
        }
      }
      
      return event;
    },
    
    // Attach context
    initialScope: {
      tags: {
        service: 'vaxtrace-backend',
        framework: 'nestjs',
      },
    },
  });

  console.log(`Sentry initialized (environment: ${process.env.NODE_ENV || 'development'})`);
}

/**
 * Create a Sentry-specific exception filter
 * Filters out expected errors to reduce noise
 */
export function createSentryExceptionFilter() {
  return {
    filterExceptions: [
      'NotFoundException',
      'UnauthorizedException',
      'ForbiddenException',
    ],
  };
}
