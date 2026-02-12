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

export interface VaxTraceStockData {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  productCode: string;
  productName: string;
  stockOnHand: number;
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
   * Invalidate cache for a specific pattern
   * Used by webhooks to keep data fresh
   */
  async invalidateCache(pattern: string): Promise<void> {
    // This would scan Redis for keys matching the pattern and delete them
    // For now, we'll implement a simple version
    this.logger.log(`Invalidating cache pattern: ${pattern}`);
    // TODO: Implement proper pattern-based cache invalidation
  }

  /**
   * Fetch all facilities from OpenLMIS
   */
  async getFacilities(): Promise<VaxTraceFacility[]> {
    const cacheKey = 'openlmis:facilities:all';
    
    return this.fetchWithCache<VaxTraceFacility[]>(
      '/facilities?pageSize=10000',
      cacheKey,
      this.CACHE_TTL.FACILITIES,
      this.normalizeFacilities,
    );
  }

  /**
   * Fetch facilities by state
   */
  async getFacilitiesByState(stateCode: string): Promise<VaxTraceFacility[]> {
    const cacheKey = `openlmis:facilities:state:${stateCode}`;
    
    return this.fetchWithCache<VaxTraceFacility[]>(
      `/facilities?geoZoneLevelCode=STATE&geoZoneCode=${stateCode}&pageSize=1000`,
      cacheKey,
      this.CACHE_TTL.FACILITIES,
      this.normalizeFacilities,
    );
  }

  /**
   * Fetch stock on hand data
   */
  async getStockOnHand(facilityId?: string): Promise<VaxTraceStockData[]> {
    const endpoint = facilityId
      ? `/stockOnHand?facilityId=${facilityId}&pageSize=1000`
      : '/stockOnHand?pageSize=10000';
    
    const cacheKey = `openlmis:stock:${facilityId || 'all'}`;
    
    return this.fetchWithCache<VaxTraceStockData[]>(
      endpoint,
      cacheKey,
      this.CACHE_TTL.STOCK,
      this.normalizeStockData,
    );
  }

  /**
   * Get aggregated stock data for a state
   */
  async getAggregatedStockByState(stateCode: string): Promise<any> {
    const cacheKey = `openlmis:stock:aggregated:state:${stateCode}`;
    
    return this.fetchWithCache(
      `/stockOnHand/aggregate?geoZoneCode=${stateCode}&geoZoneLevel=STATE`,
      cacheKey,
      this.CACHE_TTL.AGGREGATED_STOCK,
    );
  }

  /**
   * Get national stock aggregation
   */
  async getNationalStockAggregation(): Promise<any> {
    const cacheKey = 'openlmis:stock:aggregated:national';
    
    return this.fetchWithCache(
      '/stockOnHand/aggregate',
      cacheKey,
      this.CACHE_TTL.AGGREGATED_STOCK,
    );
  }

  /**
   * Fetch requisitions
   */
  async getRequisitions(facilityId?: string): Promise<VaxTraceRequisition[]> {
    const endpoint = facilityId
      ? `/requisitions?facilityId=${facilityId}&pageSize=1000`
      : '/requisitions?pageSize=10000';
    
    const cacheKey = `openlmis:requisitions:${facilityId || 'all'}`;
    
    return this.fetchWithCache<VaxTraceRequisition[]>(
      endpoint,
      cacheKey,
      this.CACHE_TTL.REQUISITIONS,
      this.normalizeRequisitions,
    );
  }

  /**
   * Normalize OpenLMIS facility data to VaxTrace format
   */
  private normalizeFacilities(facilities: OpenLMISFacility[]): VaxTraceFacility[] {
    return facilities.map((facility) => ({
      id: facility.id,
      code: facility.code,
      name: facility.name,
      stateCode: facility.geographicZone.parent?.code || '',
      stateName: facility.geographicZone.parent?.name || '',
      lgaCode: facility.geographicZone.code,
      lgaName: facility.geographicZone.name,
      latitude: facility.location?.latitude || 0,
      longitude: facility.location?.longitude || 0,
      type: facility.type?.name || 'Unknown',
      active: facility.active,
      programs: facility.supportedPrograms?.map((p) => p.code) || [],
    }));
  }

  /**
   * Normalize OpenLMIS stock data to VaxTrace format
   */
  private normalizeStockData(stockData: OpenLMISStockOnHand[]): VaxTraceStockData[] {
    return stockData.map((stock) => ({
      facilityId: stock.facility.id,
      facilityName: stock.facility.name,
      facilityCode: stock.facility.code,
      productCode: stock.orderable.code,
      productName: stock.orderable.fullProductName || stock.orderable.name,
      stockOnHand: stock.stockOnHandBaseUnit,
      lastUpdated: stock.occurredDate,
    }));
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
