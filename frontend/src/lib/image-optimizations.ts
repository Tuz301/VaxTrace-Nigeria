/**
 * VaxTrace Nigeria - Image Optimization Utilities for 3G/4G Networks
 * 
 * This module provides utilities for optimizing images to reduce bandwidth
 * usage on slow connections.
 */

// ============================================
// TYPES
// ============================================

export interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface OptimizedImageResult {
  blob: Blob;
  url: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

// ============================================
// IMAGE OPTIMIZATION
// ============================================

/**
 * Check if WebP is supported
 */
export function isWebPSupported(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
}

/**
 * Optimize an image file
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
    format = isWebPSupported() ? 'webp' : 'jpeg',
  } = options;

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      // Calculate dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType = format === 'webp' ? 'image/webp' : 
                     format === 'png' ? 'image/png' : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const optimizedSize = blob.size;
          const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

          resolve({
            blob,
            url: URL.createObjectURL(blob),
            originalSize,
            optimizedSize,
            compressionRatio,
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Batch optimize multiple images
 */
export async function batchOptimizeImages(
  files: File[],
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult[]> {
  const results: OptimizedImageResult[] = [];

  for (const file of files) {
    try {
      const result = await optimizeImage(file, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to optimize ${file.name}:`, error);
    }
  }

  return results;
}

// ============================================
// LAZY LOADING
// ============================================

/**
 * Create a lazy loading image observer
 */
export function createLazyImageObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    ...options,
  });
}

/**
 * Setup lazy loading for images
 */
export function setupLazyLoading(
  selector: string = 'img[data-src]',
  rootMargin: string = '50px'
): void {
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback: load all images immediately
    document.querySelectorAll(selector).forEach((img) => {
      const element = img as HTMLImageElement;
      if (element.dataset.src) {
        element.src = element.dataset.src;
        element.removeAttribute('data-src');
      }
    });
    return;
  }

  const observer = createLazyImageObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, { rootMargin });

  document.querySelectorAll(selector).forEach((img) => {
    observer.observe(img);
  });
}

// ============================================
// RESPONSIVE IMAGES
// ============================================

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  sizes: number[]
): string {
  return sizes
    .map((size) => {
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('w', size.toString());
      return `${url.toString()} ${size}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(
  breakpoints: { maxWidth: number; size: string }[]
): string {
  return breakpoints
    .map(({ maxWidth, size }) => `(max-width: ${maxWidth}px) ${size}`)
    .concat('100vw')
    .join(', ');
}

// ============================================
// NETWORK-AWARE IMAGE LOADING
// ============================================

/**
 * Get image quality based on network quality
 */
export function getNetworkAwareImageQuality(): number {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 0.8;
  }

  const conn = (navigator as any).connection;
  const effectiveType = conn.effectiveType || '4g';
  const saveData = conn.saveData || false;

  if (saveData) {
    return 0.5; // Lower quality for data saver mode
  }

  switch (effectiveType) {
    case 'slow-2g':
      return 0.5;
    case '2g':
      return 0.6;
    case '3g':
      return 0.7;
    case '4g':
    default:
      return 0.8;
  }
}

/**
 * Get image dimensions based on network quality
 */
export function getNetworkAwareImageDimensions(): {
  maxWidth: number;
  maxHeight: number;
} {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { maxWidth: 1920, maxHeight: 1080 };
  }

  const conn = (navigator as any).connection;
  const effectiveType = conn.effectiveType || '4g';

  switch (effectiveType) {
    case 'slow-2g':
      return { maxWidth: 640, maxHeight: 480 };
    case '2g':
      return { maxWidth: 800, maxHeight: 600 };
    case '3g':
      return { maxWidth: 1280, maxHeight: 720 };
    case '4g':
    default:
      return { maxWidth: 1920, maxHeight: 1080 };
  }
}

// ============================================
// IMAGE CACHING
// ============================================

/**
 * Cache an optimized image
 */
export async function cacheOptimizedImage(
  key: string,
  result: OptimizedImageResult
): Promise<void> {
  try {
    const cache = await caches.open('vaxtrace-images');
    const response = new Response(result.blob, {
      headers: {
        'Content-Type': result.blob.type,
        'X-Original-Size': result.originalSize.toString(),
        'X-Optimized-Size': result.optimizedSize.toString(),
      },
    });
    await cache.put(result.url, response);
  } catch (error) {
    console.error('[Image Cache] Failed to cache image:', error);
  }
}

/**
 * Get cached optimized image
 */
export async function getCachedImage(
  url: string
): Promise<Response | undefined> {
  try {
    const cache = await caches.open('vaxtrace-images');
    return cache.match(url);
  } catch (error) {
    console.error('[Image Cache] Failed to get cached image:', error);
    return undefined;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  originalSize: number,
  optimizedSize: number
): number {
  return ((originalSize - optimizedSize) / originalSize) * 100;
}
