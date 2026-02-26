/**
 * VaxTrace Nigeria - Protobuf API Client Utility
 * 
 * This utility provides a client-side implementation for making API requests
 * that support both JSON and Protobuf formats via content negotiation.
 * 
 * Benefits:
 * - Automatic bandwidth savings on 3G/4G networks
 * - Graceful fallback to JSON if Protobuf is not available
 * - Response size tracking for monitoring
 * - Compatible with existing API endpoints
 * 
 * Usage:
 * ```typescript
 * const stockData = await fetchWithProtobuf<StockSnapshot[]>('/api/v1/openlmis/stock', {
 *   queryParams: { stateId: 'AB' },
 *   preferProtobuf: true
 * });
 * ```
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ProtobufRequestOptions {
  preferProtobuf?: boolean;
  queryParams?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface ProtobufResponse<T> {
  data: T;
  format: 'json' | 'protobuf';
  sizeBytes: number;
  bandwidthSaved?: number;
  compressionRatio?: number;
  encodingTime?: number;
}

export interface NetworkQuality {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

// ============================================
// PROTOBUF CLIENT CLASS
// ============================================

class ProtobufClient {
  private baseUrl: string;
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 2;

  constructor() {
    // Use relative path for same-origin requests
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  }

  /**
   * Fetch data with automatic Protobuf content negotiation
   * 
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @returns Response with data and metadata
   */
  async fetch<T = any>(
    endpoint: string,
    options: ProtobufRequestOptions = {},
  ): Promise<ProtobufResponse<T>> {
    const {
      preferProtobuf = true,
      queryParams = {},
      headers = {},
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
    } = options;

    // Check network quality to decide format preference
    const networkQuality = await this.getNetworkQuality();
    const shouldUseProtobuf = preferProtobuf && this.shouldPreferProtobuf(networkQuality);

    // Build URL with query parameters
    const url = this.buildUrl(endpoint, queryParams);

    // Build request headers
    const requestHeaders = this.buildHeaders(shouldUseProtobuf, headers);

    // Make request with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          headers: requestHeaders,
          timeout,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Parse response based on content type
        return await this.parseResponse<T>(response);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.match(/HTTP 4\d\d/)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Fetch stock data from OpenLMIS with Protobuf support
   */
  async fetchStockData(params: {
    stateId?: string;
    lgaId?: string;
    facilityId?: string;
    vaccineCode?: string;
  } = {}): Promise<ProtobufResponse<any[]>> {
    return this.fetch<any[]>('/api/v1/openlmis/stock', {
      queryParams: params,
      preferProtobuf: true,
    });
  }

  /**
   * Fetch aggregated stock data by state
   */
  async fetchAggregatedStock(stateId: string): Promise<ProtobufResponse<any>> {
    return this.fetch<any>(`/api/v1/openlmis/stock/aggregated`, {
      queryParams: { stateId },
      preferProtobuf: true,
    });
  }

  /**
   * Fetch national stock summary
   */
  async fetchNationalStock(): Promise<ProtobufResponse<any>> {
    return this.fetch<any>('/api/v1/openlmis/stock/national', {
      preferProtobuf: true,
    });
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, queryParams: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    return url.toString();
  }

  /**
   * Build request headers with content negotiation
   */
  private buildHeaders(
    preferProtobuf: boolean,
    customHeaders: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add Accept header for content negotiation
    if (preferProtobuf) {
      headers['Accept'] = 'application/vnd.google.protobuf, application/json;q=0.9';
    } else {
      headers['Accept'] = 'application/json';
    }

    return headers;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: { headers: Record<string, string>; timeout: number },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        headers: options.headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<ProtobufResponse<T>> {
    const contentType = response.headers.get('Content-Type') || '';
    const isProtobuf = contentType.includes('application/vnd.google.protobuf');

    // Get response metadata from headers
    const protobufSize = parseInt(response.headers.get('X-Protobuf-Size') || '0', 10);
    const originalSize = parseInt(response.headers.get('X-Original-Size') || '0', 10);
    const compressionRatio = parseFloat(response.headers.get('X-Compression-Ratio') || '0');
    const encodingTime = parseInt(response.headers.get('X-Encoding-Time') || '0', 10);

    if (isProtobuf) {
      // Decode Protobuf response
      const buffer = await response.arrayBuffer();
      const data = await this.decodeProtobuf<T>(new Uint8Array(buffer));

      return {
        data,
        format: 'protobuf',
        sizeBytes: buffer.byteLength,
        bandwidthSaved: originalSize - buffer.byteLength,
        compressionRatio,
        encodingTime,
      };
    }

    // Parse JSON response
    const json = await response.json();
    const jsonString = JSON.stringify(json);
    const sizeBytes = new Blob([jsonString]).size;

    return {
      data: json,
      format: 'json',
      sizeBytes,
    };
  }

  /**
   * Decode Protobuf data (placeholder - would use actual Protobuf library)
   */
  private async decodeProtobuf<T>(buffer: Uint8Array): Promise<T> {
    // TODO: Implement actual Protobuf decoding using protobufjs or similar
    // For now, this is a placeholder that returns the data as-is
    // In production, you would use:
    // import protobuf from 'protobufjs';
    // const root = await protobuf.load('/path/to/schema.proto');
    // const Message = root.lookupType('vaxtrace.stock.StockSnapshot');
    // const decoded = Message.decode(new Uint8Array(buffer));
    // return decoded.toJSON() as T;
    
    console.warn('[PROTOBUF] Decoding not implemented, returning raw data');
    return buffer as unknown as T;
  }

  /**
   * Get network quality information
   */
  private async getNetworkQuality(): Promise<NetworkQuality | null> {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return null;
    }

    const conn = (navigator as any).connection;
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData,
    };
  }

  /**
   * Determine if Protobuf should be preferred based on network quality
   */
  private shouldPreferProtobuf(networkQuality: NetworkQuality | null): boolean {
    if (!networkQuality) {
      return true; // Default to Protobuf if network info unavailable
    }

    // Prefer Protobuf on slower networks
    const slowNetworks = ['slow-2g', '2g', '3g'];
    return slowNetworks.includes(networkQuality.effectiveType) || networkQuality.saveData;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate bandwidth savings statistics
   */
  calculateSavingsStats(response: ProtobufResponse<any>): {
    bytesSaved: number;
    percentSaved: number;
    timeSaved3G: number;
    timeSaved4G: number;
  } | null {
    if (response.format !== 'protobuf' || !response.bandwidthSaved) {
      return null;
    }

    // Average speeds in bytes per second
    const speed3G = 1.5 * 1024 * 1024 / 8; // 1.5 Mbps
    const speed4G = 10 * 1024 * 1024 / 8; // 10 Mbps

    return {
      bytesSaved: response.bandwidthSaved,
      percentSaved: response.compressionRatio || 0,
      timeSaved3G: response.bandwidthSaved / speed3G,
      timeSaved4G: response.bandwidthSaved / speed4G,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const protobufClient = new ProtobufClient();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Fetch with Protobuf support (convenience function)
 */
export async function fetchWithProtobuf<T = any>(
  endpoint: string,
  options?: ProtobufRequestOptions,
): Promise<ProtobufResponse<T>> {
  return protobufClient.fetch<T>(endpoint, options);
}

/**
 * Fetch stock data with Protobuf support
 */
export async function fetchStockData(params: {
  stateId?: string;
  lgaId?: string;
  facilityId?: string;
  vaccineCode?: string;
} = {}): Promise<ProtobufResponse<any[]>> {
  return protobufClient.fetchStockData(params);
}

/**
 * Hook for React components
 */
export function useProtobufFetch() {
  return {
    fetch: protobufClient.fetch.bind(protobufClient),
    fetchStockData: protobufClient.fetchStockData.bind(protobufClient),
    fetchAggregatedStock: protobufClient.fetchAggregatedStock.bind(protobufClient),
    fetchNationalStock: protobufClient.fetchNationalStock.bind(protobufClient),
    calculateSavingsStats: protobufClient.calculateSavingsStats.bind(protobufClient),
  };
}
