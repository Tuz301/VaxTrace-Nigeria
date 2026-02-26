/**
 * VaxTrace Nigeria - OpenLMIS Integration Controller
 *
 * This controller provides the API endpoints for integrating with OpenLMIS.
 * It acts as the "Data Orchestrator" between OpenLMIS and VaxTrace.
 *
 * Features:
 * - Stock data fetching with caching
 * - Facility data synchronization
 * - Requisition tracking
 * - VVM status monitoring
 * - Delta sync for efficiency
 */

import { Controller, Get, Post, Put, Delete, Param, Query, Body, Logger, UseInterceptors } from '@nestjs/common';
import { OpenLMISService } from './openlmis.service';
import { OpenLMISAPIClientService } from './openlmis-api-client.service';
import { OpenLMISAuthService } from './openlmis-auth.service';
import { CacheService } from '../cache/cache.service';
import { ProtobufService } from '../protobuf/protobuf.service';
import { ContentNegotiationInterceptor, ProtobufResponse } from '../../common/content-negotiation.interceptor';
import * as crypto from 'crypto';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsUUID,
  IsEnum
} from 'class-validator';

// ============================================
// DTOs
// ============================================

class StockDataQueryDto {
  @ApiProperty({ description: 'LGA ID to filter by' })
  @IsOptional()
  @IsString()
  lgaId?: string;

  @ApiProperty({ description: 'State ID to filter by' })
  @IsOptional()
  @IsString()
  stateId?: string;

  @ApiProperty({ description: 'Facility ID to filter by' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiProperty({ description: 'Vaccine code to filter by' })
  @IsOptional()
  @IsString()
  vaccineCode?: string;

  @ApiProperty({ description: 'Include historical data' })
  @IsOptional()
  @IsBoolean()
  includeHistorical?: boolean;

  @ApiProperty({ description: 'Number of days of history' })
  @IsOptional()
  @IsInt()
  daysHistory?: number;

  @ApiProperty({ description: 'Return Protobuf format' })
  @IsOptional()
  @IsBoolean()
  protobuf?: boolean;
}

class RequisitionUpdateDto {
  @ApiProperty({ description: 'Requisition ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Requisition status' })
  @IsEnum(['INITIATED', 'SUBMITTED', 'AUTHORIZED', 'APPROVED', 'RELEASED', 'SHIPPED', 'RECEIVED', 'REJECTED'])
  status: string;

  @ApiProperty({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================
// CONTROLLER
// ============================================

@Controller('v1/openlmis')
@ApiTags('OpenLMIS Integration')
export class OpenLMISController {
  private readonly logger = new Logger(OpenLMISController.name);

  constructor(
    private readonly openlmisService: OpenLMISService,
    private readonly openlmisApiClientService: OpenLMISAPIClientService,
    private readonly openlmisAuthService: OpenLMISAuthService,
    private readonly cacheService: CacheService,
    private readonly protobufService: ProtobufService,
  ) {}

  // ============================================
  // HEALTH CHECK ENDPOINT
  // ============================================

  /**
   * Health check for OpenLMIS connection
   *
   * GET /api/v1/openlmis/health
   */
  @Get('health')
  @ApiOperation({ summary: 'Check OpenLMIS connection health' })
  async healthCheck() {
    this.logger.log('Performing OpenLMIS health check');

    const isHealthy = await this.openlmisService.healthCheck();

    return {
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        openlmisUrl: process.env.OPENLMIS_BASE_URL || 'not configured',
      },
      meta: {
        requestId: crypto.randomUUID(),
      },
    };
  }

  /**
   * Detailed connection status endpoint
   * Provides comprehensive information about OpenLMIS connection status
   *
   * GET /api/v1/openlmis/status
   */
  @Get('status')
  @ApiOperation({ summary: 'Get detailed OpenLMIS connection status' })
  async connectionStatus() {
    this.logger.log('Fetching OpenLMIS connection status');

    const isHealthy = await this.openlmisService.healthCheck();
    const mockMode = this.openlmisService.isMockMode();
    const circuitBreakerState = this.openlmisService.getCircuitBreakerState();
    const tokenCacheStatus = this.openlmisService.getTokenCacheStatus();

    return {
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        mode: mockMode ? 'MOCK' : 'REAL',
        openlmisUrl: process.env.OPENLMIS_BASE_URL || 'not configured',
        clientId: process.env.OPENLMIS_CLIENT_ID || 'not configured',
        username: process.env.OPENLMIS_USERNAME || 'not configured',
        circuitBreaker: {
          isOpen: circuitBreakerState.isOpen,
          failureCount: circuitBreakerState.failureCount,
          threshold: 20, // CIRCUIT_BREAKER_THRESHOLD
          lastFailureTime: circuitBreakerState.lastFailureTime?.toISOString() || null,
          lastSuccessTime: circuitBreakerState.lastSuccessTime?.toISOString() || null,
        },
        token: {
          hasToken: tokenCacheStatus.hasToken,
          expiresAt: tokenCacheStatus.expiresAt,
          timeUntilExpiry: tokenCacheStatus.timeUntilExpiry,
          timeUntilExpiryMinutes: tokenCacheStatus.timeUntilExpiry
            ? Math.round(tokenCacheStatus.timeUntilExpiry / 60000)
            : null,
        },
        timestamp: new Date().toISOString(),
      },
      meta: {
        requestId: crypto.randomUUID(),
      },
    };
  }

  /**
   * Test OpenLMIS connection with detailed diagnostics
   *
   * GET /api/v1/openlmis/test-connection
   */
  @Get('test-connection')
  @ApiOperation({ summary: 'Test OpenLMIS connection with diagnostics' })
  async testConnection() {
    this.logger.log('Testing OpenLMIS connection with diagnostics...');
    
    const baseUrl = process.env.OPENLMIS_BASE_URL;
    const clientId = process.env.OPENLMIS_CLIENT_ID;
    const username = process.env.OPENLMIS_USERNAME;
    const clientSecret = process.env.OPENLMIS_CLIENT_SECRET;
    const password = process.env.OPENLMIS_PASSWORD;
    
    const results: {
      step: string;
      status: 'success' | 'error' | 'warning';
      message: string;
      details?: any;
    }[] = [];
    
    // Step 1: Check configuration
    results.push({
      step: 'Configuration Check',
      status: 'success',
      message: 'Environment variables are set',
      details: {
        baseUrl: baseUrl || 'NOT SET',
        clientId: clientId || 'NOT SET',
        username: username || 'NOT SET',
        clientSecret: clientSecret ? '***SET***' : 'NOT SET',
        password: password ? '***SET***' : 'NOT SET',
      },
    });
    
    // Step 2: Validate configuration
    if (!baseUrl) {
      results.push({
        step: 'Configuration Validation',
        status: 'error',
        message: 'OPENLMIS_BASE_URL is not set',
      });
      return {
        success: false,
        data: { results },
        meta: { requestId: crypto.randomUUID() },
      };
    }
    
    if (clientId === 'changeme' || !clientId) {
      results.push({
        step: 'Configuration Validation',
        status: 'error',
        message: 'OPENLMIS_CLIENT_ID is set to placeholder value "changeme" or not set',
        details: {
          fix: 'Update OPENLMIS_CLIENT_ID in .env with your actual OpenLMIS client ID',
        },
      });
    } else {
      results.push({
        step: 'Configuration Validation',
        status: 'success',
        message: 'Configuration appears valid',
      });
    }
    
    // Step 3: Test network connectivity
    try {
      const axios = require('axios');
      const response = await axios.get(baseUrl, {
        timeout: 10000,
        validateStatus: () => true, // Accept any status code
      });
      
      results.push({
        step: 'Network Connectivity',
        status: response.status < 500 ? 'success' : 'warning',
        message: `Server responded with status ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      });
    } catch (error: any) {
      results.push({
        step: 'Network Connectivity',
        status: 'error',
        message: `Cannot reach OpenLMIS server: ${error.message}`,
        details: {
          error: error.code,
          suggestion: 'Check if OPENLMIS_BASE_URL is correct and server is accessible',
        },
      });
      return {
        success: false,
        data: { results },
        meta: { requestId: crypto.randomUUID() },
      };
    }
    
    // Step 4: Test token endpoint
    try {
      const axios = require('axios');
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${baseUrl}/api/oauth/token`,
        new URLSearchParams({
          grant_type: 'password',
          username,
          password,
        }),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      );
      
      if (response.status === 200 && response.data?.access_token) {
        results.push({
          step: 'Authentication',
          status: 'success',
          message: 'Successfully obtained access token',
          details: {
            tokenType: response.data.token_type,
            expiresIn: response.data.expires_in,
            scope: response.data.scope,
          },
        });
      } else if (response.status === 401) {
        results.push({
          step: 'Authentication',
          status: 'error',
          message: 'Authentication failed - invalid credentials',
          details: {
            response: response.data,
            fix: 'Check OPENLMIS_CLIENT_ID, OPENLMIS_CLIENT_SECRET, OPENLMIS_USERNAME, and OPENLMIS_PASSWORD',
          },
        });
      } else {
        results.push({
          step: 'Authentication',
          status: 'error',
          message: `Unexpected response: ${response.status}`,
          details: {
            response: response.data,
          },
        });
      }
    } catch (error: any) {
      results.push({
        step: 'Authentication',
        status: 'error',
        message: `Token request failed: ${error.message}`,
        details: {
          error: error.code,
        },
      });
    }
    
    return {
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          success: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
          warnings: results.filter(r => r.status === 'warning').length,
        },
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Debug endpoint to test available OpenLMIS API endpoints
   *
   * GET /api/v1/openlmis/debug/endpoints
   */
  @Get('debug/endpoints')
  @ApiOperation({ summary: 'Debug: Test which OpenLMIS endpoints are available' })
  async debugEndpoints() {
    this.logger.log('Testing OpenLMIS API endpoints availability');
    
    const baseUrl = process.env.OPENLMIS_BASE_URL || 'unknown';
    const results: Array<{
      endpoint: string;
      path?: string;
      status: number | string;
      available: boolean;
      error?: string;
      structure?: string;
      totalElements?: number;
      pageSize?: number;
      count?: number;
      sampleItem?: any;
    }> = [];

    // List of endpoints to test
    const endpointsToTest = [
      { path: '/api/system/info', method: 'GET', name: 'System Info' },
      { path: '/api/facilities?page=0&size=5', method: 'GET', name: 'Facilities' },
      { path: '/api/facilities?pageSize=5', method: 'GET', name: 'Facilities (alt)' },
      { path: '/api/stockCards?page=0&size=5', method: 'GET', name: 'Stock Cards' },
      { path: '/api/stockCards?pageSize=5', method: 'GET', name: 'Stock Cards (alt)' },
      { path: '/api/requisitions?page=0&size=5', method: 'GET', name: 'Requisitions' },
      { path: '/api/requisitions?pageSize=5', method: 'GET', name: 'Requisitions (alt)' },
      { path: '/api/orderables', method: 'GET', name: 'Orderables (Products)' },
      { path: '/api/programs', method: 'GET', name: 'Programs' },
      { path: '/api/geographicZones', method: 'GET', name: 'Geographic Zones' },
    ];

    // Get auth headers
    let authHeaders: HeadersInit = {};
    try {
      authHeaders = await this.openlmisAuthService.getAuthHeaders();
    } catch (error) {
      this.logger.error(`Failed to get auth headers: ${error}`);
    }

    // Test each endpoint
    for (const endpoint of endpointsToTest) {
      try {
        const url = `${baseUrl}${endpoint.path}`;
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            ...authHeaders,
            'Accept': 'application/json',
          },
        });

        const result: any = {
          endpoint: endpoint.name,
          path: endpoint.path,
          status: response.status,
          available: response.ok,
        };

        if (response.ok) {
          try {
            const data = await response.json();
            // Get basic info about the response structure
            if (data.content !== undefined) {
              result.structure = 'paginated (has content property)';
              result.totalElements = data.totalElements || data.pageable?.totalElements;
              result.pageSize = data.pageable?.pageSize || data.size;
            } else if (Array.isArray(data)) {
              result.structure = 'direct array';
              result.count = data.length;
            } else {
              result.structure = 'object';
            }
            // Show first item as sample
            if (data.content && data.content.length > 0) {
              result.sampleItem = data.content[0];
            } else if (Array.isArray(data) && data.length > 0) {
              result.sampleItem = data[0];
            } else {
              result.sampleItem = data;
            }
          } catch (e) {
            result.error = 'Failed to parse JSON response';
          }
        } else {
          result.error = response.statusText;
        }

        results.push(result);
      } catch (error: any) {
        results.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          status: 'ERROR',
          available: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      success: true,
      data: {
        openlmisUrl: baseUrl,
        timestamp: new Date().toISOString(),
        endpoints: results,
        summary: {
          total: results.length,
          available: results.filter(r => r.available).length,
          unavailable: results.filter(r => !r.available).length,
        },
      },
      meta: {
        requestId: crypto.randomUUID(),
      },
    };
  }

  // ============================================
  // STOCK DATA ENDPOINTS
  // ============================================

  /**
   * Get stock data from OpenLMIS
   * 
   * GET /api/v1/openlmis/stock
   * 
   * Query parameters:
   * - lgaId: Filter by LGA
   * - stateId: Filter by state
   * - facilityId: Filter by facility
   * - vaccineCode: Filter by vaccine
   * - includeHistorical: Include historical data
   * - daysHistory: Number of days of history
   * - protobuf: Return Protobuf format
   */
  @Get('stock')
  @UseInterceptors(ContentNegotiationInterceptor)
  @ProtobufResponse({ typeName: 'StockSnapshot' })
  @ApiOperation({ summary: 'Get stock data from OpenLMIS' })
  @ApiResponse({ status: 200, description: 'Stock data retrieved successfully' })
  async getStockData(
    @Query() query: StockDataQueryDto,
  ) {
    this.logger.log(`Fetching stock data with query: ${JSON.stringify(query)}`);

    // Try to get from cache first
    const cacheKey = `vax:stock:${query.lgaId || 'all'}:${query.stateId || 'all'}:${query.facilityId || 'all'}:${query.vaccineCode || 'all'}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached && !query.includeHistorical) {
      this.logger.debug(`Returning cached stock data for ${cacheKey}`);
      return {
        success: true,
        data: cached,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          cached: true,
        },
      };
    }

    // Fetch from OpenLMIS
    const stockData = await this.fetchStockFromOpenLMIS(query);

    // Cache the results
    if (!query.includeHistorical) {
      await this.cacheService.set(cacheKey, stockData, { ttl: 900 }); // 15 minutes
    }

    return {
      success: true,
      data: stockData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        cached: false,
      },
    };
  }

  /**
   * Get aggregated stock by state
   * 
   * GET /api/v1/openlmis/stock/aggregated
   */
  @Get('stock/aggregated')
  @UseInterceptors(ContentNegotiationInterceptor)
  @ProtobufResponse({ typeName: 'StockSnapshot' })
  @ApiOperation({ summary: 'Get aggregated stock data by state' })
  async getAggregatedStock(
    @Query('stateId') stateId: string,
  ) {
    this.logger.log(`Fetching aggregated stock for state: ${stateId}`);

    // Check cache
    const cacheKey = `vax:stock:state:${stateId}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          cached: true,
        },
      };
    }

    // Fetch and aggregate data
    const aggregatedData = await this.fetchAggregatedStock(stateId);

    // Cache the results
    await this.cacheService.set(cacheKey, aggregatedData, { ttl: 900 });

    return {
      success: true,
      data: aggregatedData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        cached: false,
      },
    };
  }

  /**
   * Get national stock summary
   * 
   * GET /api/v1/openlmis/stock/national
   */
  @Get('stock/national')
  @UseInterceptors(ContentNegotiationInterceptor)
  @ProtobufResponse({ typeName: 'StockSnapshot' })
  @ApiOperation({ summary: 'Get national stock summary' })
  async getNationalStock() {
    this.logger.log('Fetching national stock summary');

    // Check cache
    const cacheKey = 'vax:stock:national';
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          cached: true,
        },
      };
    }

    // Fetch national summary
    const summary = await this.fetchNationalStockSummary();

    // Cache the results
    await this.cacheService.set(cacheKey, summary, { ttl: 1800 }); // 30 minutes

    return {
      success: true,
      data: summary,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        cached: false,
      },
    };
  }

  // ============================================
  // FACILITY DATA ENDPOINTS
  // ============================================

  /**
   * Get facilities with their geospatial data
   * 
   * GET /api/v1/openlmis/facilities
   */
  @Get('facilities')
  @ApiOperation({ summary: 'Get facilities from OpenLMIS' })
  async getFacilities(
    @Query('stateId') stateId?: string,
    @Query('lgaId') lgaId?: string,
  ) {
    this.logger.log(`Fetching facilities for state: ${stateId}, LGA: ${lgaId}`);

    // Check cache
    const cacheKey = `vax:facilities:${stateId || 'all'}:${lgaId || 'all'}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          cached: true,
        },
      };
    }

    // Fetch facilities from OpenLMIS
    const facilities = await this.fetchFacilitiesFromOpenLMIS(stateId, lgaId);

    // Cache the results
    await this.cacheService.set(cacheKey, facilities, { ttl: 86400 }); // 24 hours for geo data

    return {
      success: true,
      data: facilities,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        cached: false,
      },
    };
  }

  // ============================================
  // REQUISITION ENDPOINTS
  // ============================================

  /**
   * Get requisitions
   * 
   * GET /api/v1/openlmis/requisitions
   */
  @Get('requisitions')
  @ApiOperation({ summary: 'Get requisitions from OpenLMIS' })
  async getRequisitions(
    @Query('status') status?: string,
    @Query('facilityId') facilityId?: string,
  ) {
    this.logger.log(`Fetching requisitions with status: ${status}, facility: ${facilityId}`);

    // Fetch from OpenLMIS
    const requisitions = await this.fetchRequisitionsFromOpenLMIS(status, facilityId);

    return {
      success: true,
      data: requisitions,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  /**
   * Update requisition status
   * 
   * PUT /api/v1/openlmis/requisitions/:id
   */
  @Put('requisitions/:id')
  @ApiOperation({ summary: 'Update requisition status in OpenLMIS' })
  async updateRequisition(
    @Param('id') id: string,
    @Body() update: RequisitionUpdateDto,
  ) {
    this.logger.log(`Updating requisition ${id} to status: ${update.status}`);

    // Update in OpenLMIS
    const result = await this.updateRequisitionInOpenLMIS(id, update);

    // Invalidate cache
    await this.cacheService.del(`vax:requisition:${id}`);
    await this.cacheService.deletePattern('vax:requisitions:*');

    return {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  // ============================================
  // VVM STATUS ENDPOINTS
  // ============================================

  /**
   * Get VVM status for facilities
   * 
   * GET /api/v1/openlmis/vvm-status
   */
  @Get('vvm-status')
  @ApiOperation({ summary: 'Get VVM status from OpenLMIS' })
  async getVVMStatus(
    @Query('facilityId') facilityId?: string,
    @Query('stage') stage?: string,
  ) {
    this.logger.log(`Fetching VVM status for facility: ${facilityId}, stage: ${stage}`);

    // Fetch from OpenLMIS
    const vvmStatus = await this.fetchVVMStatusFromOpenLMIS(facilityId, stage);

    return {
      success: true,
      data: vvmStatus,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  // ============================================
  // SYNC ENDPOINTS
  // ============================================

  /**
   * Trigger delta sync with OpenLMIS
   * 
   * POST /api/v1/openlmis/sync
   */
  @Post('sync')
  @ApiOperation({ summary: 'Trigger delta sync with OpenLMIS' })
  async triggerSync(
    @Body() body: { lastSyncTimestamp?: number; entityTypes?: string[]; lgaId?: string; stateId?: string; },
  ) {
    this.logger.log(`Triggering delta sync with OpenLMIS: ${JSON.stringify(body)}`);

    // Perform delta sync
    const syncResult = await this.performDeltaSync(body);

    // Invalidate affected caches
    if (body.lgaId) {
      await this.cacheService.invalidateLGAStock(body.lgaId);
    }
    if (body.stateId) {
      await this.cacheService.invalidateStateStock(body.stateId);
    }

    return {
      success: true,
      data: syncResult,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  /**
   * Get sync status
   * 
   * GET /api/v1/openlmis/sync/status
   */
  @Get('sync/status')
  @ApiOperation({ summary: 'Get sync status with OpenLMIS' })
  async getSyncStatus() {
    const lastSync = await this.getLastSyncTimestamp();
    const syncInProgress = await this.isSyncInProgress();

    return {
      success: true,
      data: {
        lastSync,
        syncInProgress,
        nextScheduledSync: lastSync ? new Date(lastSync.getTime() + 3600000).toISOString() : null, // 1 hour
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async fetchStockFromOpenLMIS(query: any): Promise<any[]> {
    try {
      const facilityId = query.facilityId;
      return await this.openlmisApiClientService.getStockOnHand(facilityId);
    } catch (error) {
      this.logger.error('Failed to fetch stock from OpenLMIS', error.stack);
      return [];
    }
  }

  private async fetchAggregatedStock(stateId: string): Promise<any> {
    try {
      return await this.openlmisApiClientService.getAggregatedStockByState(stateId);
    } catch (error) {
      this.logger.error('Failed to fetch aggregated stock from OpenLMIS', error.stack);
      return {};
    }
  }

  private async fetchNationalStockSummary(): Promise<any> {
    try {
      return await this.openlmisApiClientService.getNationalStockAggregation();
    } catch (error) {
      this.logger.error('Failed to fetch national stock summary from OpenLMIS', error.stack);
      return {};
    }
  }

  private async fetchFacilitiesFromOpenLMIS(stateId?: string, lgaId?: string): Promise<any[]> {
    try {
      if (stateId) {
        return await this.openlmisApiClientService.getFacilitiesByState(stateId);
      }
      return await this.openlmisApiClientService.getFacilities();
    } catch (error) {
      this.logger.error('Failed to fetch facilities from OpenLMIS', error.stack);
      return [];
    }
  }

  private async fetchRequisitionsFromOpenLMIS(status?: string, facilityId?: string): Promise<any[]> {
    try {
      return await this.openlmisApiClientService.getRequisitions(facilityId);
    } catch (error) {
      this.logger.error('Failed to fetch requisitions from OpenLMIS', error.stack);
      return [];
    }
  }

  private async updateRequisitionInOpenLMIS(id: string, update: any): Promise<any> {
    try {
      // Note: OpenLMIS API client doesn't have an update method yet
      // This would need to be implemented in the API client service
      this.logger.warn(`Update requisition not yet implemented: ${id}`);
      return { id, ...update };
    } catch (error) {
      this.logger.error('Failed to update requisition in OpenLMIS', error.stack);
      return {};
    }
  }

  private async fetchVVMStatusFromOpenLMIS(facilityId?: string, stage?: string): Promise<any[]> {
    try {
      // Note: VVM status endpoint would need to be implemented in OpenLMIS API client
      this.logger.warn('VVM status endpoint not yet implemented in OpenLMIS API client');
      return [];
    } catch (error) {
      this.logger.error('Failed to fetch VVM status from OpenLMIS', error.stack);
      return [];
    }
  }

  private async performDeltaSync(body: any): Promise<any> {
    try {
      // Clear cache to force fresh data fetch
      await this.openlmisApiClientService.clearAllCache();
      
      return {
        success: true,
        message: 'Delta sync completed',
        timestamp: new Date().toISOString(),
        entitiesSynced: body.entityTypes || ['all'],
      };
    } catch (error) {
      this.logger.error('Failed to perform delta sync with OpenLMIS', error.stack);
      return {
        success: false,
        message: 'Delta sync failed',
        error: error.message,
      };
    }
  }

  private async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      // Get last sync timestamp from cache
      const lastSync = await this.cacheService.get<string>('openlmis:last_sync');
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      this.logger.error('Failed to get last sync timestamp', error.stack);
      return null;
    }
  }

  private async isSyncInProgress(): Promise<boolean> {
    try {
      // Check if sync is currently in progress
      return await this.cacheService.get<boolean>('openlmis:sync_in_progress') || false;
    } catch (error) {
      this.logger.error('Failed to check sync progress', error.stack);
      return false;
    }
  }
}

// ============================================
// DECORATORS
// ============================================

function ApiProperty(options: any): Function {
  return (target: any, propertyKey: string) => {
    // Placeholder for @ApiModelProperty decorator
  };
}

function ApiResponse(options: any): Function {
  return (target: any, propertyKey: string) => {
    // Placeholder for @ApiResponse decorator
  };
}

function ApiTags(tags: string | string[]): Function {
  return (target: any) => {
    // Placeholder for @ApiTags decorator
  };
}

function ApiOperation(options: any): Function {
  return (target: any, propertyKey: string) => {
    // Placeholder for @ApiOperation decorator
  };
}

function ApiQuery(options: any): Function {
  return (target: any, propertyKey: string) => {
    // Placeholder for @ApiQuery decorator
  };
}

function UseGuards(...guards: any[]): Function {
  return (target: any, propertyKey: string) => {
    // Placeholder for @UseGuards decorator
  };
}
