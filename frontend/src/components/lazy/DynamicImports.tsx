/**
 * VaxTrace Nigeria - Dynamic Import Utilities for 3G/4G Optimization
 * 
 * This module provides utilities for lazy loading heavy components
 * to reduce initial bundle size and improve Time-to-Interactive
 */

'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// ============================================
// LOADING COMPONENTS
// ============================================

interface LoadingFallbackProps {
  message?: string;
}

export function LoadingFallback({ message = 'Loading...' }: LoadingFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

export function MapLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  );
}

export function ChartLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-48 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading chart...</p>
      </div>
    </div>
  );
}

// ============================================
// LAZY LOADED COMPONENTS
// ============================================

/**
 * Lazy load Leaflet Map (heavy: ~200KB)
 */
export const LazyLeafletMap = lazy(() => 
  import('@/components/map/LeafletMap').then(module => ({
    default: module.LeafletMap as ComponentType<any>
  }))
);

/**
 * Lazy load Neural Map (very heavy: ~500KB)
 */
export const LazyNeuralMap = lazy(() => 
  import('@/components/map/NeuralMap').then(module => ({
    default: module.NeuralMap as ComponentType<any>
  }))
);

/**
 * Lazy load Map Provider (moderate: ~100KB)
 */
export const LazyMapProvider = lazy(() =>
  import('@/contexts/MapContext').then(module => ({
    default: module.MapProvider as ComponentType<any>
  }))
);

/**
 * Lazy load QR Scanner (moderate: ~150KB)
 */
export const LazyQRDeliveryScanner = lazy(() => 
  import('@/components/mobile/QRDeliveryScanner').then(module => ({
    default: module.QRDeliveryScanner as ComponentType<any>
  }))
);

/**
 * Lazy load Biometric Login (moderate: ~100KB)
 */
export const LazyBiometricLogin = lazy(() => 
  import('@/components/auth/BiometricLogin').then(module => ({
    default: module.BiometricLogin as ComponentType<any>
  }))
);

/**
 * Lazy load LMD Delivery Tracker (moderate: ~120KB)
 */
export const LazyLMDDeliveryTracker = lazy(() => 
  import('@/components/mobile/LMDDeliveryTracker').then(module => ({
    default: module.LMDDeliveryTracker as ComponentType<any>
  }))
);

// ============================================
// WRAPPER COMPONENTS
// ============================================

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyWrapper({ children, fallback }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  );
}

export function MapLazyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<MapLoadingFallback />}>
      {children}
    </Suspense>
  );
}

export function ChartLazyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      {children}
    </Suspense>
  );
}

// ============================================
// PRELOADING UTILITIES
// ============================================

/**
 * Preload a component when user is likely to need it
 */
export function preloadComponent(importFn: () => Promise<any>) {
  // Start loading the component in the background
  importFn();
}

/**
 * Preload map components when user navigates to dashboard
 */
export function preloadMapComponents() {
  preloadComponent(() => import('@/components/map/LeafletMap'));
  preloadComponent(() => import('@/contexts/MapContext'));
}

/**
 * Preload scanner components when user navigates to scan page
 */
export function preloadScannerComponents() {
  preloadComponent(() => import('@/components/mobile/QRDeliveryScanner'));
}

/**
 * Preload auth components when user is on login page
 */
export function preloadAuthComponents() {
  preloadComponent(() => import('@/components/auth/BiometricLogin'));
}

// ============================================
// NETWORK-AWARE LOADING
// ============================================

/**
 * Check if network is slow (2G or slow-2G)
 */
export function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }
  const conn = (navigator as any).connection;
  const effectiveType = conn.effectiveType || '4g';
  return ['2g', 'slow-2g'].includes(effectiveType);
}

/**
 * Get appropriate loading message based on network
 */
export function getNetworkAwareLoadingMessage(): string {
  if (isSlowNetwork()) {
    return 'Loading... (slow connection detected)';
  }
  return 'Loading...';
}

/**
 * Network-aware lazy wrapper with longer timeout for slow networks
 */
export function NetworkAwareLazyWrapper({ 
  children, 
  timeout = 5000 
}: { 
  children: React.ReactNode; 
  timeout?: number;
}) {
  const message = getNetworkAwareLoadingMessage();
  
  return (
    <Suspense 
      fallback={
        isSlowNetwork() ? (
          <LoadingFallback message={message} />
        ) : (
          <LoadingFallback message="Loading..." />
        )
      }
    >
      {children}
    </Suspense>
  );
}
