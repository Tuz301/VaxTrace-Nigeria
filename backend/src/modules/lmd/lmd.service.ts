/**
 * VaxTrace Nigeria - LMD (Last-Mile Delivery) Service
 * 
 * Handles business logic for LMD record synchronization
 * Integrates with OpenLMIS and DHIS2 for triangulation
 */

import { Injectable, Logger } from '@nestjs/common';
import { LMDDto } from './dto/lmd.dto';
import { CacheService } from '../cache/cache.service';

export interface LMDRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  lgaCode: string;
  stateCode: string;
  deliveryTimestamp: string;
  vvmStatus: 'OK' | 'WARNING' | 'CRITICAL' | 'NOT_TESTED';
  vehicleGPS?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  deliveryItems: LMDDeliveryItem[];
  officerId: string;
  officerName: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LMDDeliveryItem {
  productCode: string;
  productName: string;
  quantityDelivered: number;
  quantityReceived: number;
  batchNumber: string;
  expiryDate: string;
  vvmStatus: string;
  coldChainBreak: boolean;
  notes?: string;
}

export interface LMDStatistics {
  totalDeliveries: number;
  todayDeliveries: number;
  pendingSync: number;
  byState: Record<string, number>;
  byLGA: Record<string, number>;
  vvmStatusBreakdown: Record<string, number>;
}

@Injectable()
export class LMDService {
  private readonly logger = new Logger(LMDService.name);
  
  // In-memory storage for development (replace with PostgreSQL in production)
  private records: Map<string, LMDRecord> = new Map();

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Sync an LMD record from a field officer
   */
  async syncRecord(dto: LMDDto): Promise<LMDRecord> {
    this.logger.log(`Syncing LMD record ${dto.id} for facility ${dto.facilityName}`);
    
    // Validate the record
    this.validateRecord(dto);
    
    // Store the record
    const record: LMDRecord = {
      ...dto,
      synced: true,
      updatedAt: new Date().toISOString(),
    };
    
    this.records.set(dto.id, record);
    
    // Cache the record
    await this.cacheService.set(`lmd:record:${dto.id}`, record, { ttl: 86400 });
    
    // Invalidate relevant caches
    await this.invalidateFacilityCache(dto.facilityId);
    await this.invalidateStateCache(dto.stateCode);
    
    // TODO: Integrate with OpenLMIS to update stock levels
    // TODO: Integrate with DHIS2 to update delivery data
    
    this.logger.log(`LMD record ${dto.id} synced successfully`);
    return record;
  }

  /**
   * Get LMD records by facility
   */
  async getRecordsByFacility(facilityId: string): Promise<LMDRecord[]> {
    const cacheKey = `lmd:facility:${facilityId}`;
    
    // Check cache first
    const cached = await this.cacheService.get<LMDRecord[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from storage
    const records = Array.from(this.records.values())
      .filter((r) => r.facilityId === facilityId)
      .sort((a, b) => new Date(b.deliveryTimestamp).getTime() - new Date(a.deliveryTimestamp).getTime());
    
    // Cache the result
    await this.cacheService.set(cacheKey, records, { ttl: 3600 });
    
    return records;
  }

  /**
   * Get LMD records by state
   */
  async getRecordsByState(stateCode: string): Promise<LMDRecord[]> {
    const cacheKey = `lmd:state:${stateCode}`;
    
    // Check cache first
    const cached = await this.cacheService.get<LMDRecord[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from storage
    const records = Array.from(this.records.values())
      .filter((r) => r.stateCode === stateCode)
      .sort((a, b) => new Date(b.deliveryTimestamp).getTime() - new Date(a.deliveryTimestamp).getTime());
    
    // Cache the result
    await this.cacheService.set(cacheKey, records, { ttl: 3600 });
    
    return records;
  }

  /**
   * Get LMD records by date range
   */
  async getRecordsByDateRange(startDate: string, endDate: string): Promise<LMDRecord[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.records.values())
      .filter((r) => {
        const deliveryDate = new Date(r.deliveryTimestamp);
        return deliveryDate >= start && deliveryDate <= end;
      })
      .sort((a, b) => new Date(b.deliveryTimestamp).getTime() - new Date(a.deliveryTimestamp).getTime());
  }

  /**
   * Get LMD statistics
   */
  async getStatistics(): Promise<LMDStatistics> {
    const records = Array.from(this.records.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRecords = records.filter((r) => new Date(r.deliveryTimestamp) >= today);
    
    const byState: Record<string, number> = {};
    const byLGA: Record<string, number> = {};
    const vvmStatusBreakdown: Record<string, number> = {
      OK: 0,
      WARNING: 0,
      CRITICAL: 0,
      NOT_TESTED: 0,
    };
    
    for (const record of records) {
      // Count by state
      byState[record.stateCode] = (byState[record.stateCode] || 0) + 1;
      
      // Count by LGA
      byLGA[record.lgaCode] = (byLGA[record.lgaCode] || 0) + 1;
      
      // Count by VVM status
      vvmStatusBreakdown[record.vvmStatus]++;
    }
    
    return {
      totalDeliveries: records.length,
      todayDeliveries: todayRecords.length,
      pendingSync: 0, // All synced records are marked as synced
      byState,
      byLGA,
      vvmStatusBreakdown,
    };
  }

  /**
   * Validate an LMD record
   */
  private validateRecord(dto: LMDDto): void {
    if (!dto.facilityId || dto.facilityId.trim() === '') {
      throw new Error('Facility ID is required');
    }
    
    if (!dto.deliveryItems || dto.deliveryItems.length === 0) {
      throw new Error('At least one delivery item is required');
    }
    
    for (const item of dto.deliveryItems) {
      if (!item.productCode || item.productCode.trim() === '') {
        throw new Error('Product code is required for all delivery items');
      }
      
      if (item.quantityDelivered < 0 || item.quantityReceived < 0) {
        throw new Error('Quantities must be non-negative');
      }
      
      if (item.quantityReceived > item.quantityDelivered) {
        this.logger.warn(`Quantity received (${item.quantityReceived}) exceeds quantity delivered (${item.quantityDelivered}) for ${item.productCode}`);
      }
    }
    
    if (dto.vehicleGPS) {
      if (dto.vehicleGPS.latitude < -90 || dto.vehicleGPS.latitude > 90) {
        throw new Error('Invalid GPS latitude');
      }
      
      if (dto.vehicleGPS.longitude < -180 || dto.vehicleGPS.longitude > 180) {
        throw new Error('Invalid GPS longitude');
      }
    }
  }

  /**
   * Invalidate facility cache
   */
  private async invalidateFacilityCache(facilityId: string): Promise<void> {
    await this.cacheService.delete(`lmd:facility:${facilityId}`);
  }

  /**
   * Invalidate state cache
   */
  private async invalidateStateCache(stateCode: string): Promise<void> {
    await this.cacheService.delete(`lmd:state:${stateCode}`);
  }

  /**
   * Get active deliveries (for Mapbox LMD layer)
   */
  async getActiveDeliveries(): Promise<LMDRecord[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return Array.from(this.records.values())
      .filter((r) => new Date(r.deliveryTimestamp) >= oneHourAgo)
      .filter((r) => r.vehicleGPS !== undefined);
  }

  /**
   * Get delivery bottlenecks (for triangulation analytics)
   */
  async getDeliveryBottlenecks(): Promise<{
    facilityId: string;
    facilityName: string;
    stateCode: string;
    lgaCode: string;
    lastDelivery: string;
    vvmCriticalCount: number;
    coldChainBreaks: number;
  }[]> {
    // Get facilities with critical VVM status or cold chain breaks
    const facilityIssues = new Map<string, {
      facilityId: string;
      facilityName: string;
      stateCode: string;
      lgaCode: string;
      lastDelivery: string;
      vvmCriticalCount: number;
      coldChainBreaks: number;
    }>();
    
    for (const record of this.records.values()) {
      const existing = facilityIssues.get(record.facilityId);
      
      const vvmCriticalCount = record.deliveryItems.filter(
        (item) => item.vvmStatus === 'CRITICAL'
      ).length;
      
      const coldChainBreaks = record.deliveryItems.filter(
        (item) => item.coldChainBreak
      ).length;
      
      if (existing) {
        if (new Date(record.deliveryTimestamp) > new Date(existing.lastDelivery)) {
          existing.lastDelivery = record.deliveryTimestamp;
        }
        existing.vvmCriticalCount += vvmCriticalCount;
        existing.coldChainBreaks += coldChainBreaks;
      } else {
        facilityIssues.set(record.facilityId, {
          facilityId: record.facilityId,
          facilityName: record.facilityName,
          stateCode: record.stateCode,
          lgaCode: record.lgaCode,
          lastDelivery: record.deliveryTimestamp,
          vvmCriticalCount,
          coldChainBreaks,
        });
      }
    }
    
    // Return only facilities with issues
    return Array.from(facilityIssues.values())
      .filter((f) => f.vvmCriticalCount > 0 || f.coldChainBreaks > 0);
  }
}
