/**
 * VaxTrace Nigeria - Donabedian Outcome Metrics Controller
 * 
 * AUDIT FIX: REST API endpoints for outcome metrics
 * Provides access to Donabedian framework outcome measurements
 * 
 * Endpoints:
 * - GET /api/outcome-metrics/summary - Comprehensive summary
 * - GET /api/outcome-metrics/stock-coverage - Stock-to-Coverage ratios
 * - GET /api/outcome-metrics/immunization - Immunization coverage rates
 * - GET /api/outcome-metrics/wastage - Vaccine wastage rates
 * - GET /api/outcome-metrics/stockouts - Stockout metrics
 * - GET /api/outcome-metrics/geographic - Geographic coverage
 * - POST /api/outcome-metrics/export-dhis2 - Export to DHIS2
 * 
 * @author Security Audit Implementation
 * @date 2026-02-24
 */

import { Controller, Get, Post, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { OutcomeMetricsService, OutcomeMetricsSummary } from './outcome-metrics.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Outcome Metrics')
@Controller('api/outcome-metrics')
export class OutcomeMetricsController {
  constructor(private readonly outcomeMetricsService: OutcomeMetricsService) {}

  /**
   * AUDIT FIX: Get comprehensive Outcome Metrics Summary
   * Combines all Donabedian outcome metrics into a single report
   */
  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comprehensive outcome metrics summary' })
  @ApiQuery({ name: 'stateCode', required: false, description: 'Filter by state code' })
  @ApiQuery({ name: 'lgaCode', required: false, description: 'Filter by LGA code' })
  @ApiQuery({ name: 'facilityId', required: false, description: 'Filter by facility ID' })
  @ApiResponse({ status: 200, description: 'Outcome metrics summary retrieved successfully' })
  async getSummary(
    @Query('stateCode') stateCode?: string,
    @Query('lgaCode') lgaCode?: string,
    @Query('facilityId') facilityId?: string,
  ): Promise<OutcomeMetricsSummary> {
    return this.outcomeMetricsService.generateOutcomeMetricsSummary(
      stateCode,
      lgaCode,
      facilityId,
    );
  }

  /**
   * AUDIT FIX: Get Stock-to-Coverage Ratios
   * Shows months of stock available vs consumption rate
   */
  @Get('stock-coverage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock-to-coverage ratios' })
  @ApiQuery({ name: 'facilityId', required: false, description: 'Filter by facility ID' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter by product ID' })
  @ApiResponse({ status: 200, description: 'Stock-to-coverage ratios retrieved successfully' })
  async getStockToCoverage(
    @Query('facilityId') facilityId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.outcomeMetricsService.calculateStockToCoverage(facilityId, productId);
  }

  /**
   * AUDIT FIX: Get Immunization Coverage Rates
   * Shows percentage of target population vaccinated
   */
  @Get('immunization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get immunization coverage rates' })
  @ApiQuery({ name: 'stateCode', required: false, description: 'Filter by state code' })
  @ApiQuery({ name: 'lgaCode', required: false, description: 'Filter by LGA code' })
  @ApiResponse({ status: 200, description: 'Immunization coverage rates retrieved successfully' })
  async getImmunizationCoverage(
    @Query('stateCode') stateCode?: string,
    @Query('lgaCode') lgaCode?: string,
  ) {
    return this.outcomeMetricsService.calculateImmunizationCoverage(stateCode, lgaCode);
  }

  /**
   * AUDIT FIX: Get Vaccine Wastage Rates
   * Shows percentage of vaccines wasted or expired
   */
  @Get('wastage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get vaccine wastage rates' })
  @ApiQuery({ name: 'facilityId', required: false, description: 'Filter by facility ID' })
  @ApiQuery({ name: 'period', required: false, description: 'Period in YYYY-MM format' })
  @ApiResponse({ status: 200, description: 'Vaccine wastage rates retrieved successfully' })
  async getVaccineWastage(
    @Query('facilityId') facilityId?: string,
    @Query('period') period?: string,
  ) {
    return this.outcomeMetricsService.calculateVaccineWastage(facilityId, period);
  }

  /**
   * AUDIT FIX: Get Stockout Metrics
   * Shows facilities experiencing stockouts
   */
  @Get('stockouts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stockout metrics' })
  @ApiQuery({ name: 'facilityId', required: false, description: 'Filter by facility ID' })
  @ApiResponse({ status: 200, description: 'Stockout metrics retrieved successfully' })
  async getStockoutMetrics(@Query('facilityId') facilityId?: string) {
    return this.outcomeMetricsService.calculateStockoutMetrics(facilityId);
  }

  /**
   * AUDIT FIX: Get Geographic Coverage
   * Shows percentage of facilities with adequate stock by region
   */
  @Get('geographic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get geographic coverage metrics' })
  @ApiQuery({ name: 'stateCode', required: false, description: 'Filter by state code' })
  @ApiResponse({ status: 200, description: 'Geographic coverage metrics retrieved successfully' })
  async getGeographicCoverage(@Query('stateCode') stateCode?: string) {
    return this.outcomeMetricsService.calculateGeographicCoverage(stateCode);
  }

  /**
   * AUDIT FIX: Export metrics to DHIS2
   * Integrates with DHIS2 for comprehensive health reporting
   */
  @Post('export-dhis2')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Export outcome metrics to DHIS2' })
  @ApiResponse({ status: 202, description: 'Metrics exported to DHIS2 successfully' })
  async exportToDHIS2() {
    // Generate current metrics and export
    const metrics = await this.outcomeMetricsService.generateOutcomeMetricsSummary();
    return this.outcomeMetricsService.exportToDHIS2(metrics);
  }
}
