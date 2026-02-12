/**
 * VaxTrace Nigeria - Sentry Configuration
 *
 * Error tracking and performance monitoring for the Next.js frontend.
 * Captures unhandled exceptions, performance issues, and provides context.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry configuration
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Set traces sample rate based on environment
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Set profiling sample rate
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive data from request headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }
    
    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
        return !breadcrumb.category?.includes('auth') && 
               !breadcrumb.category?.includes('token');
      });
    }
    
    return event;
  },
  
  // Attach context
  initialScope: {
    tags: {
      service: 'vaxtrace-frontend',
      framework: 'nextjs',
    },
  },
  
  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development',
});

export default Sentry;
