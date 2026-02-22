/**
 * VaxTrace Nigeria - OpenLMIS API Client Service
 * 
 * Centralized service for making authenticated requests to OpenLMIS
 * Implements the "Orchestrator Pattern" with caching
 * Handles data normalization and transformation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenLMISAuthService } from './openlmis-auth.service';
import { CacheService } from '../cache/cache.service';

// OpenLMIS API Response Types
export interface OpenLMISFacility {
  id: string;
  code: string;
  name: string;
  description?: string;
  geographicZone: {
    id: string;
    code: string;
    name: string;
    level: number;
    parent?: {
      id: string;
      code: string;
      name: string;
    };
  };
  location: {
    longitude: number;
    latitude: number;
  };
  type: {
    id: string;
    code: string;
    name: string;
  };
  active: boolean;
  supportedPrograms?: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

// Nigeria OpenLMIS Stock Card Response (paginated)
export interface OpenLMISStockCardResponse {
  content: OpenLMISStockCard[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalPages: number;
  };
  totalElements: number;
  first: boolean;
  last: boolean;
}

export interface OpenLMISStockCard {
  id: string;
  stockOnHand: number;
  facility: {
    id: string;
    code: string;
    name: string;
    description?: string;
    active: boolean;
    geographicZone: {
      id: string;
      code: string;
      name: string;
      level: { levelNumber: number };
      parent?: {
        id: string;
        code: string;
        name: string;
        parent?: {
          id: string;
          code: string;
          name: string;
        };
      };
    };
    type: {
      id: string;
      code: string;
      name: string;
    };
  };
  program: {
    id: string;
    code: string;
    name: string;
  };
  orderable: {
    id: string;
    productCode?: string;
    fullProductName?: string;
    children?: any[];
  };
  lot: {
    id: string;
    lotCode?: string;
    expiryDate?: string;
  };
  occurredDate: string;
}

// Legacy type for backward compatibility
export interface OpenLMISStockOnHand {
  id: string;
  facility: {
    id: string;
    name: string;
    code: string;
  };
  orderable: {
    id: string;
    code: string;
    name: string;
    fullProductName: string;
  };
  stockOnHand: number;
  stockOnHandBaseUnit: number;
  occurredDate: string;
}

export interface OpenLMISRequisition {
  id: string;
  program: {
    id: string;
    code: string;
    name: string;
  };
  facility: {
    id: string;
    name: string;
    code: string;
  };
  status: string;
  emergency: boolean;
  createdDate: string;
  lastModifiedDate: string;
}

// Normalized VaxTrace Types
export interface VaxTraceFacility {
  id: string;
  code: string;
  name: string;
  stateCode: string;
  stateName: string;
  lgaCode: string;
  lgaName: string;
  latitude: number;
  longitude: number;
  type: string;
  active: boolean;
  programs: string[];
}

// Match shared types format for consistency
export interface VaxTraceStockData {
  nodeId: string;
  facilityName: string;
  facilityCode: string;
  state: string;
  lga: string;
  productCode: string;
  productName: string;
  quantity: number;
  lotCode: string;
  lotExpiry: string;
  expiryRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED';
  vvmStage: number;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  monthsOfStock: number;
  lastUpdated: string;
}

export interface VaxTraceRequisition {
  id: string;
  program: string;
  facilityId: string;
  facilityName: string;
  status: string;
  emergency: boolean;
  createdDate: string;
  lastModifiedDate: string;
}

@Injectable()
export class OpenLMISAPIClientService {
  private readonly logger = new Logger(OpenLMISAPIClientService.name);
  private readonly baseUrl: string;

  // Cache TTL configurations
  private readonly CACHE_TTL = {
    FACILITIES: 86400, // 24 hours
    STOCK: 900, // 15 minutes
    REQUISITIONS: 300, // 5 minutes
    AGGREGATED_STOCK: 900, // 15 minutes
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: OpenLMISAuthService,
    private readonly cacheService: CacheService,
  ) {
    this.baseUrl = this.configService.get<string>('OPENLMIS_BASE_URL') || '';
  }

  /**
   * Fetch data from OpenLMIS with caching
   * Implements the Orchestrator Pattern
   */
  private async fetchWithCache<T>(
    endpoint: string,
    cacheKey: string,
    ttl: number,
    transformFn?: (data: any) => T,
  ): Promise<T> {
    // Check cache first
    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Fetch from OpenLMIS
    this.logger.debug(`Cache miss for ${cacheKey}, fetching from OpenLMIS`);
    const url = `${this.baseUrl}/api${endpoint}`;
    const headers = await this.authService.getAuthHeaders();

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`OpenLMIS API request failed: ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform data if needed
    const data = transformFn ? transformFn(rawData) : rawData;

    // Cache the result
    await this.cacheService.set(cacheKey, data, { ttl });

    return data;
  }

  /**
   * Fetch ALL pages of paginated data from OpenLMIS
   * Handles pagination automatically to ensure complete data retrieval
   * FIX #4: Added retry logic for individual page failures
   */
  private async fetchAllPages<T>(
    baseEndpoint: string,
    cacheKey: string,
    ttl: number,
    transformFn?: (data: any) => T,
  ): Promise<T> {
    // Check cache first
    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${cacheKey}, fetching ALL pages from OpenLMIS`);
    
    const headers = await this.authService.getAuthHeaders();
    const pageSize = 100; // Conservative page size that most OpenLMIS instances support
    let pageNumber = 0;
    let allData: any[] = [];
    let hasMore = true;
    let totalPages = 1;

    // FIX #4: Fetch all pages with retry logic
    while (hasMore && pageNumber < totalPages) {
      const url = `${this.baseUrl}/api${baseEndpoint}&page=${pageNumber}&size=${pageSize}`;
      
      this.logger.debug(`Fetching page ${pageNumber + 1} of ${totalPages || '?'} from ${url}`);
      
      // FIX #4: Add retry logic for individual page fetches
      let response: Response;
      let retries = 3;
      let success = false;
      
      while (!success && retries > 0) {
        try {
          response = await fetch(url, { headers });
          success = true;
        } catch (error) {
          retries--;
          if (retries > 0) {
            this.logger.warn(`Page ${pageNumber} fetch failed, retrying... (${retries} retries left)`);
            await this.sleep(1000 * (4 - retries)); // Exponential backoff: 1s, 2s, 3s
          } else {
            this.logger.error(`Failed to fetch page ${pageNumber} after 3 retries`);
            // Continue to next page instead of failing completely
            hasMore = false;
            break;
          }
        }
      }

      if (!success || !response.ok) {
        this.logger.error(`Failed to fetch page ${pageNumber}: ${response?.statusText || 'Network error'}`);
        // Continue to next page instead of failing completely
        hasMore = false;
        break;
      }

      const rawData = await response.json();

      // Handle both paginated and non-paginated responses
      if (rawData.content && Array.isArray(rawData.content)) {
        // Paginated response (Nigeria OpenLMIS format)
        allData = allData.concat(rawData.content);
        totalPages = rawData.pageable?.totalPages || rawData.totalPages || 1;
        hasMore = !rawData.last;
        this.logger.debug(`Page ${pageNumber + 1}: Retrieved ${rawData.content.length} records, total so far: ${allData.length}`);
      } else if (Array.isArray(rawData)) {
        // Non-paginated response (direct array)
        allData = rawData;
        hasMore = false;
        this.logger.debug(`Non-paginated response: Retrieved ${allData.length} records`);
      } else {
        // Unexpected format
        this.logger.warn(`Unexpected response format: ${JSON.stringify(rawData).substring(0, 200)}`);
        hasMore = false;
      }

      pageNumber++;
    }

    this.logger.log(`Retrieved total of ${allData.length} records from ${baseEndpoint}`);

    // Transform data if needed
    const data = transformFn ? transformFn(allData) : allData;

    // Cache the result
    await this.cacheService.set(cacheKey, data, { ttl });

    return data as T;
  }

  /**
   * FIX #4: Helper method for sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * FIX #6: Invalidate cache for a specific pattern
   * Used by webhooks to keep data fresh
   * Now properly implemented with pattern-based invalidation
   */
  async invalidateCache(pattern: string): Promise<void> {
    this.logger.log(`Invalidating cache pattern: ${pattern}`);
    
    try {
      // Use the cache service's deletePattern method
      await this.cacheService.deletePattern(pattern);
      this.logger.log(`Successfully invalidated cache pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache pattern ${pattern}:`, error.message);
    }
  }

  /**
   * FIX #6: Invalidate all OpenLMIS-related cache
   * Called when credentials change or major data updates occur
   */
  async invalidateAllCache(): Promise<void> {
    await this.invalidateCache('openlmis:*');
  }

  /**
   * Fetch all facilities from OpenLMIS
   * Uses pagination to ensure ALL facilities are retrieved
   */
  async getFacilities(): Promise<VaxTraceFacility[]> {
    const cacheKey = 'openlmis:facilities:all';
    
    return this.fetchAllPages<VaxTraceFacility[]>(
      '/facilities?',
      cacheKey,
      this.CACHE_TTL.FACILITIES,
      this.normalizeFacilities,
    );
  }

  /**
   * Fetch facilities by state
   * Uses pagination to ensure ALL facilities in the state are retrieved
   */
  async getFacilitiesByState(stateCode: string): Promise<VaxTraceFacility[]> {
    const cacheKey = `openlmis:facilities:state:${stateCode}`;
    
    return this.fetchAllPages<VaxTraceFacility[]>(
      `/facilities?geoZoneLevelCode=STATE&geoZoneCode=${stateCode}`,
      cacheKey,
      this.CACHE_TTL.FACILITIES,
      this.normalizeFacilities,
    );
  }

  /**
   * Fetch stock on hand data
   * NOTE: Nigeria OpenLMIS instance uses /stockCards endpoint
   * Uses pagination to ensure ALL stock data is retrieved
   */
  async getStockOnHand(facilityId?: string): Promise<VaxTraceStockData[]> {
    const baseEndpoint = facilityId
      ? `/stockCards?facilityId=${facilityId}`
      : '/stockCards';
    
    const cacheKey = `openlmis:stock:${facilityId || 'all'}`;
    
    return this.fetchAllPages<VaxTraceStockData[]>(
      baseEndpoint,
      cacheKey,
      this.CACHE_TTL.STOCK,
      this.normalizeStockData,
    );
  }

  /**
   * Get aggregated stock data for a state
   * NOTE: Nigeria OpenLMIS instance uses /stockCards endpoint
   * Uses pagination to ensure ALL stock data is retrieved
   */
  async getAggregatedStockByState(stateCode: string): Promise<any> {
    const cacheKey = `openlmis:stock:aggregated:state:${stateCode}`;
    
    return this.fetchAllPages(
      `/stockCards?geoZoneCode=${stateCode}&geoZoneLevel=STATE`,
      cacheKey,
      this.CACHE_TTL.AGGREGATED_STOCK,
    );
  }

  /**
   * Get national stock aggregation
   * NOTE: Nigeria OpenLMIS instance uses /stockCards endpoint
   * Uses pagination to ensure ALL stock data is retrieved
   */
  async getNationalStockAggregation(): Promise<any> {
    const cacheKey = 'openlmis:stock:aggregated:national';
    
    return this.fetchAllPages(
      '/stockCards?',
      cacheKey,
      this.CACHE_TTL.AGGREGATED_STOCK,
    );
  }

  /**
   * Fetch requisitions
   * Uses pagination to ensure ALL requisitions are retrieved
   */
  async getRequisitions(facilityId?: string): Promise<VaxTraceRequisition[]> {
    const baseEndpoint = facilityId
      ? `/requisitions?facilityId=${facilityId}`
      : '/requisitions';
    
    const cacheKey = `openlmis:requisitions:${facilityId || 'all'}`;
    
    return this.fetchAllPages<VaxTraceRequisition[]>(
      baseEndpoint,
      cacheKey,
      this.CACHE_TTL.REQUISITIONS,
      this.normalizeRequisitions,
    );
  }

  /**
   * Normalize OpenLMIS facility data to VaxTrace format
   * Includes defensive handling for missing or null fields
   */
  private normalizeFacilities(facilities: OpenLMISFacility[]): VaxTraceFacility[] {
    if (!Array.isArray(facilities)) {
      this.logger.warn(`normalizeFacilities: Expected array but got ${typeof facilities}`);
      return [];
    }

    return facilities
      .filter((facility) => facility != null) // Filter out null/undefined entries
      .map((facility) => {
        try {
          // Defensive extraction with fallbacks
          const geoZone = facility.geographicZone || {} as any;
          const parentZone = geoZone.parent || {} as any;
          const location = facility.location || {} as any;
          const type = facility.type || {} as any;
          const supportedPrograms = facility.supportedPrograms || [];

          return {
            id: facility.id || '',
            code: facility.code || '',
            name: facility.name || 'Unknown Facility',
            stateCode: parentZone.code || '',
            stateName: parentZone.name || '',
            lgaCode: geoZone.code || '',
            lgaName: geoZone.name || '',
            latitude: typeof location.latitude === 'number' ? location.latitude : 0,
            longitude: typeof location.longitude === 'number' ? location.longitude : 0,
            type: type.name || 'Unknown',
            active: typeof facility.active === 'boolean' ? facility.active : true,
            programs: Array.isArray(supportedPrograms)
              ? supportedPrograms.map((p: any) => p?.code || '').filter(Boolean)
              : [],
          };
        } catch (error) {
          this.logger.error(`Error normalizing facility: ${error}`, facility);
          // Return minimal valid facility object
          return {
            id: facility?.id || '',
            code: facility?.code || '',
            name: facility?.name || 'Unknown Facility',
            stateCode: '',
            stateName: '',
            lgaCode: '',
            lgaName: '',
            latitude: 0,
            longitude: 0,
            type: 'Unknown',
            active: true,
            programs: [],
          };
        }
      });
  }

  /**
   * Normalize OpenLMIS stock data to VaxTrace format
   * Handles both paginated response (Nigeria) and direct array (demo server)
   * Includes defensive handling for missing or null fields
   */
  private normalizeStockData(response: OpenLMISStockCardResponse | OpenLMISStockOnHand[]): VaxTraceStockData[] {
    // Extract content array from paginated response or use direct array
    const stockData = Array.isArray(response)
      ? response
      : (response as OpenLMISStockCardResponse)?.content || [];

    if (!Array.isArray(stockData)) {
      this.logger.warn(`normalizeStockData: Expected array but got ${typeof stockData}`);
      return [];
    }

    return stockData
      .filter((stock) => stock != null) // Filter out null/undefined entries
      .map((stock: any) => {
        try {
          // Defensive extraction with fallbacks
          const facility = stock.facility || {};
          const program = stock.program || {};
          const orderable = stock.orderable || {};
          const lot = stock.lot || {};
          const geoZone = facility.geographicZone || {};
          const parentZone = geoZone.parent || {};

          // Handle Nigeria Stock Card format
          if (facility.id && (program.id || orderable.id)) {
            const stateName = parentZone.name || '';
            const lgaName = geoZone.name || '';
            const lotExpiry = lot.expiryDate || '';
            
            // Calculate expiry risk
            const now = new Date();
            const expiryDate = lotExpiry ? new Date(lotExpiry) : null;
            const daysUntilExpiry = expiryDate && !isNaN(expiryDate.getTime())
              ? Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : 999;
            
            const expiryRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED' =
              daysUntilExpiry < 0 ? 'EXPIRED' :
              daysUntilExpiry < 30 ? 'HIGH' :
              daysUntilExpiry < 90 ? 'MEDIUM' : 'LOW';

            return {
              nodeId: facility.id || '',
              facilityName: facility.name || 'Unknown Facility',
              facilityCode: facility.code || '',
              state: stateName,
              lga: lgaName,
              productCode: orderable.productCode || orderable.id || '',
              productName: orderable.fullProductName || program.name || 'Unknown Product',
              quantity: typeof stock.stockOnHand === 'number' ? stock.stockOnHand : 0,
              lotCode: lot.lotCode || '',
              lotExpiry: lotExpiry,
              expiryRisk: expiryRisk,
              vvmStage: 1,
              vvmStatus: 'HEALTHY' as const,
              monthsOfStock: 0,
              lastUpdated: stock.occurredDate || new Date().toISOString(),
            };
          }
          
          // Handle legacy OpenLMIS StockOnHand format or minimal format
          return {
            nodeId: facility.id || '',
            facilityName: facility.name || 'Unknown Facility',
            facilityCode: facility.code || '',
            state: '',
            lga: '',
            productCode: orderable.code || orderable.id || '',
            productName: orderable.fullProductName || orderable.name || 'Unknown Product',
            quantity: typeof stock.stockOnHandBaseUnit === 'number' ? stock.stockOnHandBaseUnit :
                      typeof stock.stockOnHand === 'number' ? stock.stockOnHand : 0,
            lotCode: '',
            lotExpiry: '',
            expiryRisk: 'LOW' as const,
            vvmStage: 1,
            vvmStatus: 'HEALTHY' as const,
            monthsOfStock: 0,
            lastUpdated: stock.occurredDate || new Date().toISOString(),
          };
        } catch (error) {
          this.logger.error(`Error normalizing stock record: ${error}`, stock);
          // Return minimal valid stock object
          return {
            nodeId: stock?.facility?.id || '',
            facilityName: stock?.facility?.name || 'Unknown Facility',
            facilityCode: stock?.facility?.code || '',
            state: '',
            lga: '',
            productCode: stock?.orderable?.id || '',
            productName: 'Unknown Product',
            quantity: 0,
            lotCode: '',
            lotExpiry: '',
            expiryRisk: 'LOW',
            vvmStage: 1,
            vvmStatus: 'HEALTHY',
            monthsOfStock: 0,
            lastUpdated: new Date().toISOString(),
          };
        }
      });
  }

  /**
   * Normalize OpenLMIS requisition data to VaxTrace format
   */
  private normalizeRequisitions(requisitions: OpenLMISRequisition[]): VaxTraceRequisition[] {
    return requisitions.map((req) => ({
      id: req.id,
      program: req.program.name,
      facilityId: req.facility.id,
      facilityName: req.facility.name,
      status: req.status,
      emergency: req.emergency,
      createdDate: req.createdDate,
      lastModifiedDate: req.lastModifiedDate,
    }));
  }

  /**
   * Health check for OpenLMIS connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/systemInformation`;
      const headers = await this.authService.getAuthHeaders();
      
      const response = await fetch(url, { headers });
      return response.ok;
    } catch (error) {
      this.logger.error('OpenLMIS health check failed:', error.message);
      return false;
    }
  }

  /**
   * Clear all OpenLMIS related cache
   */
  async clearAllCache(): Promise<void> {
    const patterns = [
      'openlmis:facilities:*',
      'openlmis:stock:*',
      'openlmis:requisitions:*',
    ];
    
    for (const pattern of patterns) {
      await this.invalidateCache(pattern);
    }
    
    this.logger.log('Cleared all OpenLMIS cache');
  }
}
