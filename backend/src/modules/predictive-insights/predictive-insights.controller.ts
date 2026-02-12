/**
 * VaxTrace Nigeria - Predictive Insights Controller
 *
 * Exposes predictive analytics endpoints for "Crystal Ball" feature.
 * Provides ML-powered forecasts for vaccine supply chain.
 *
 * Endpoints:
 * - GET /api/v1/predictive-insights - Get predictive insights
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { PredictiveInsightsService } from './predictive-insights.service';
import {
  InsightQueryDto,
  InsightsResponseDto,
} from './dto/insight.dto';

// ============================================
// CONTROLLER
// ============================================

@ApiTags('Predictive Insights')
@Controller('api/v1/predictive-insights')
export class PredictiveInsightsController {
  private readonly logger = new Logger(PredictiveInsightsController.name);

  constructor(private readonly predictiveInsightsService: PredictiveInsightsService) {
    this.logger.log('Predictive Insights Controller initialized');
  }

  // ============================================
  // QUERY ENDPOINTS
  // ============================================

  /**
   * Get predictive insights
   */
  @Get()
  @ApiOperation({
    summary: 'Get predictive insights',
    description: 'Retrieve ML-powered predictive insights for vaccine supply chain management',
  })
  @ApiResponse({
    status: 200,
    description: 'Predictive insights retrieved successfully',
    type: InsightsResponseDto,
  })
  async getInsights(
    @Param('riskLevel') riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    @Param('state') state?: string,
    @Param('facilityId') facilityId?: string,
    @Param('productId') productId?: string,
  ) {
    this.logger.debug(`Get predictive insights with filters: riskLevel=${riskLevel}, state=${state}, facility=${facilityId}, product=${productId}`);
    return await this.predictiveInsightsService.getInsights({
      riskLevel,
      state,
      facilityId,
      productId,
    });
  }
}
