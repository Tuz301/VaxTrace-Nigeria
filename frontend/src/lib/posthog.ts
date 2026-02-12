/**
 * VaxTrace Nigeria - PostHog Analytics
 *
 * Product analytics and user behavior tracking.
 * Tracks feature usage, user flows, and provides actionable insights.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import posthog from 'posthog-js';

/**
 * Initialize PostHog analytics
 */
export function initPostHog() {
  // Only initialize in production or when key is provided
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  
  if (!key || typeof window === 'undefined') {
    console.log('PostHog key not provided - analytics disabled');
    return;
  }

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    
    // Capture page views
    capture_pageview: true,
    
    // Capture page leaves
    capture_pageleave: true,
    
    // Persistence
    persistence: 'localStorage',
    
    // Disable in development
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.opt_out_capturing();
        console.log('PostHog initialized (opted out in development)');
      } else {
        console.log('PostHog initialized (production)');
      }
    },
    
    // Advanced configuration
    advanced_disable_decide: process.env.NODE_ENV === 'development',
    
    // Auto-capture
    autocapture: true,
  });
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PostHog] ${eventName}`, properties);
    return;
  }
  
  posthog.capture(eventName, properties);
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PostHog] Page View: ${pageName}`, properties);
    return;
  }
  
  posthog.capture('$pageview', {
    pageName,
    ...properties,
  });
}

/**
 * Identify user
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PostHog] Identify: ${userId}`, traits);
    return;
  }
  
  posthog.identify(userId, traits);
}

/**
 * Reset user (on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[PostHog] Reset');
    return;
  }
  
  posthog.reset();
}

export default posthog;
