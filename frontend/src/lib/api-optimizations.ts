/**
 * VaxTrace Nigeria - API Optimizations for Low-Bandwidth Networks (3G/4G)
 * 
 * This module provides utilities for optimizing API calls in regions with
 * limited connectivity. Features include:
 * - Request compression (using CompressionStream API)
 * - Request deduplication
 * - Automatic retry with exponential backoff
 * - Delta sync support
 * - Pagination helpers
 */

// ============================================
// TYPES
// ============================================

export interface OptimizedFetchOptions extends RequestInit {
  compress?: boolean;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  deduplicate?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface DeltaSyncOptions {
  lastSync?: string;
  since?: string;
  includeDeleted?: boolean;
}

// ============================================
// REQUEST DEDUPLICATION
// ============================================

class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestTimestamps = new Map<string, number>();

  /**
   * Deduplicate identical in-flight requests
   */
  async dedupe<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl = 2000 // Time-to-live for deduplication
  ): Promise<T> {
    const now = Date.now();
    const timestamp = this.requestTimestamps.get(key);

    // Check if there's a recent valid request
    if (timestamp && now - timestamp < ttl) {
      const existing = this.pendingRequests.get(key);
      if (existing) {
        console.log('[API Dedupe] Using cached request:', key);
        return existing as Promise<T>;
      }
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Keep in cache for TTL
        setTimeout(() => {
          this.pendingRequests.delete(key);
          this.requestTimestamps.delete(key);
        }, ttl);
        return result;
      })
      .finally(() => {
        this.requestTimestamps.set(key, now);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
    this.requestTimestamps.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// ============================================
// COMPRESSION UTILITIES
// ============================================

/**
 * Compress data using browser's CompressionStream
 */
export async function compressData(data: any): Promise<string> {
  const json = JSON.stringify(data);
  const textEncoder = new TextEncoder();
  const bytes = textEncoder.encode(json);

  // Check if CompressionStream is supported
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new CompressionStream('gzip');
      const blob = new Blob([bytes]);
      const compressedStream = blob.stream().pipeThrough(stream);
      const compressedBlob = await new Response(compressedStream).blob();
      const buffer = await compressedBlob.arrayBuffer();
      const binary = new Uint8Array(buffer);
      return btoa(String.fromCharCode(...binary));
    } catch (error) {
      console.warn('[Compression] Failed to compress, using base64:', error);
    }
  }

  // Fallback: return base64 encoded JSON
  return btoa(json);
}

/**
 * Decompress data
 */
export async function decompressData(compressed: string): Promise<any> {
  try {
    const binary = atob(compressed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Check if DecompressionStream is supported
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new DecompressionStream('gzip');
        const blob = new Blob([bytes]);
        const decompressedStream = blob.stream().pipeThrough(stream);
        const decompressedBlob = await new Response(decompressedStream).blob();
        const buffer = await decompressedBlob.arrayBuffer();
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(buffer);
        return JSON.parse(text);
      } catch (error) {
        console.warn('[Decompression] Failed, trying direct parse:', error);
      }
    }

    // Fallback: try to parse as base64 JSON
    const text = atob(compressed);
    return JSON.parse(text);
  } catch (error) {
    // If all fails, try parsing as JSON directly
    console.warn('[Decompression] All methods failed, trying direct JSON parse');
    return JSON.parse(compressed);
  }
}

// ============================================
// OPTIMIZED FETCH
// ============================================

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(retryCount: number, baseDelay = 1000): number {
  // For 3G/4G, use more aggressive backoff
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000);
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = 15000 // 15s timeout for slow networks
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Optimized fetch with retry, compression, and deduplication
 */
export async function optimizedFetch<T = any>(
  url: string,
  options: OptimizedFetchOptions = {}
): Promise<T> {
  const {
    compress = true,
    retryCount = 0,
    maxRetries = 3,
    timeout = 15000,
    deduplicate = true,
    ...fetchOptions
  } = options;

  // Generate deduplication key
  const dedupeKey = deduplicate
    ? `${url}:${JSON.stringify(fetchOptions)}`
    : '';

  const requestFn = async (): Promise<T> => {
    try {
      const headers: Record<string, string> = {
        ...(fetchOptions.headers as Record<string, string> || {}),
        'Accept-Encoding': 'gzip, deflate, br',
      };

      // Compress body if enabled
      let body = fetchOptions.body;
      let isCompressed = false;

      if (compress && body && typeof body === 'string') {
        try {
          const compressed = await compressData(JSON.parse(body));
          body = compressed;
          isCompressed = true;
        } catch {
          // If compression fails, send original
        }
      }

      // Add compression header if body was compressed
      if (isCompressed) {
        headers['X-Content-Compressed'] = 'true';
      }

      fetchOptions.body = body;

      const response = await fetchWithTimeout(
        url,
        {
          ...fetchOptions,
          headers,
        },
        timeout
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is compressed
      const responseCompressed = response.headers.get('X-Content-Compressed') === 'true';
      const text = await response.text();

      if (responseCompressed && text) {
        return await decompressData(text);
      }

      return JSON.parse(text || '{}');
    } catch (error) {
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const delay = getBackoffDelay(retryCount);
        console.log(
          `[API Optimizations] Retrying after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return optimizedFetch<T>(url, {
          ...options,
          retryCount: retryCount + 1,
        });
      }
      throw error;
    }
  };

  // Use deduplication if enabled
  if (deduplicate && dedupeKey) {
    return requestDeduplicator.dedupe(dedupeKey, requestFn);
  }

  return requestFn();
}

// ============================================
// PAGINATION HELPERS
// ============================================

/**
 * Fetch paginated data efficiently
 */
export async function fetchPaginated<T>(
  url: string,
  options: {
    page?: number;
    pageSize?: number;
    maxPages?: number;
    mergeResults?: boolean;
  } = {}
): Promise<PaginatedResponse<T> | T[]> {
  const {
    page = 1,
    pageSize = 50, // Smaller page size for 3G/4G
    maxPages = 10,
    mergeResults = false,
  } = options;

  const paginatedUrl = new URL(url, window.location.origin);
  paginatedUrl.searchParams.set('page', page.toString());
  paginatedUrl.searchParams.set('pageSize', pageSize.toString());

  const response = await optimizedFetch<PaginatedResponse<T>>(
    paginatedUrl.toString()
  );

  if (!mergeResults) {
    return response;
  }

  // Fetch all pages if mergeResults is true
  const allData = [...(response.data as T[])];
  const totalPages = Math.min(response.meta.totalPages, maxPages);

  for (let p = page + 1; p <= totalPages; p++) {
    const nextUrl = new URL(url, window.location.origin);
    nextUrl.searchParams.set('page', p.toString());
    nextUrl.searchParams.set('pageSize', pageSize.toString());

    const nextResponse = await optimizedFetch<PaginatedResponse<T>>(
      nextUrl.toString()
    );
    allData.push(...(nextResponse.data as T[]));
  }

  return allData;
}

// ============================================
// DELTA SYNC
// ============================================

/**
 * Fetch only changed data since last sync
 */
export async function fetchDelta<T>(
  url: string,
  options: DeltaSyncOptions = {}
): Promise<{
  created: T[];
  updated: T[];
  deleted: string[];
  lastSync: string;
}> {
  const deltaUrl = new URL(url, window.location.origin);
  deltaUrl.searchParams.set('delta', 'true');

  if (options.lastSync) {
    deltaUrl.searchParams.set('since', options.lastSync);
  }
  if (options.includeDeleted) {
    deltaUrl.searchParams.set('includeDeleted', 'true');
  }

  return optimizedFetch(deltaUrl.toString());
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Batch multiple requests into a single call
 */
export async function batchFetch<T>(
  requests: Array<{ url: string; options?: OptimizedFetchOptions }>
): Promise<T[]> {
  const batchUrl = '/api/v1/batch';
  const payload = {
    requests: requests.map((r) => ({
      url: r.url,
      method: r.options?.method || 'GET',
      headers: r.options?.headers,
      body: r.options?.body,
    })),
  };

  return optimizedFetch<T[]>(batchUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    compress: true,
  }) as Promise<T[]>;
}

// ============================================
// NETWORK QUALITY DETECTION
// ============================================

export interface NetworkQuality {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  isSlow: boolean;
}

/**
 * Get current network quality
 */
export function getNetworkQuality(): NetworkQuality {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return {
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false,
      isSlow: false,
    };
  }

  const conn = (navigator as any).connection;
  const effectiveType = conn.effectiveType || '4g';
  const isSlow = ['2g', 'slow-2g'].includes(effectiveType);

  return {
    effectiveType,
    downlink: conn.downlink || 10,
    rtt: conn.rtt || 100,
    saveData: conn.saveData || false,
    isSlow,
  };
}

/**
 * Adjust fetch options based on network quality
 */
export function adjustForNetworkQuality(
  options: OptimizedFetchOptions = {}
): OptimizedFetchOptions {
  const quality = getNetworkQuality();

  if (quality.isSlow || quality.saveData) {
    return {
      ...options,
      compress: true,
      timeout: 30000, // Longer timeout for slow networks
      maxRetries: 5, // More retries for unstable connections
    };
  }

  return options;
}

// ============================================
// REQUEST QUEUEING
// ============================================

class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxConcurrent = 2; // Limit concurrent requests for 3G/4G

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const batch = this.queue.splice(0, this.maxConcurrent);
    await Promise.allSettled(batch.map((fn) => fn()));

    this.isProcessing = false;

    if (this.queue.length > 0) {
      this.process();
    }
  }
}

export const requestQueue = new RequestQueue();
