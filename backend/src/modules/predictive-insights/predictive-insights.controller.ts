/**
 * VaxTrace Nigeria - Predictive Insights Controller
 *
 * Exposes predictive analytics endpoints for "Crystal Ball" feature.
 * Phase 1: Rule-Based Foundation with deterministic algorithms
 * Phase 2: Lightweight ML (ETS, Isolation Forest, Random Forest)
 * Phase 3: Advanced ML (LSTM, Ensemble, Transfer Learning)
 *
 * Endpoints:
 * - GET /api/v1/predictive-insights - Get predictive insights
 * - GET /api/v1/predictive-insights/facility/:id - Get insights by facility
 * - GET /api/v1/predictive-insights/product/:id - Get insights by product
 * - GET /api/v1/predictive-insights/aggregate/:facilityId/:productId - Get aggregated predictions
 * - GET /api/v1/predictive-insights/summary - Get summary statistics
 * - GET /api/v1/predictive-insights/ml/status - Get ML model status
 * - POST /api/v1/predictive-insights/ml/train - Train ML models
 * - POST /api/v1/predictive-insights/ml/forecast - ML consumption forecast
 * - POST /api/v1/predictive-insights/ml/detect-anomalies - Detect anomalies
 * - POST /api/v1/predictive-insights/ml/classify - Classify risk level
 *
 * @author VaxTrace Team
 * @version 2.0.0
 */

import { Controller, Get, Logger, Param, Query, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

import { PredictiveInsightsService } from './predictive-insights.service';
import { MLModelService } from './ml-model.service';
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

  constructor(
    private readonly predictiveInsightsService: PredictiveInsightsService,
    private readonly mlModelService: MLModelService,
  ) {
    this.logger.log('Predictive Insights Controller initialized with Phase 1-3 algorithms');
  }

  // ============================================
  // QUERY ENDPOINTS
  // ============================================

  /**
   * Get predictive insights with optional filtering
   */
  @Get()
  @ApiOperation({
    summary: 'Get predictive insights',
    description: 'Retrieve rule-based and ML-enhanced predictive insights for vaccine supply chain management. Supports filtering by risk level, state, facility, and product.',
  })
  @ApiResponse({
    status: 200,
    description: 'Predictive insights retrieved successfully',
    type: InsightsResponseDto,
  })
  @ApiQuery({
    name: 'riskLevel',
    required: false,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    description: 'Filter by risk level',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description: 'Filter by state (e.g., FCT, Lagos)',
  })
  @ApiQuery({
    name: 'facilityId',
    required: false,
    type: String,
    description: 'Filter by facility ID',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product/vaccine code (e.g., BCG, MEASLES)',
  })
  async getInsights(
    @Query('riskLevel') riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    @Query('state') state?: string,
    @Query('facilityId') facilityId?: string,
    @Query('productId') productId?: string,
  ) {
    this.logger.debug(`Get predictive insights with filters: riskLevel=${riskLevel}, state=${state}, facility=${facilityId}, product=${productId}`);
    return await this.predictiveInsightsService.getInsights({
      riskLevel,
      state,
      facilityId,
      productId,
    });
  }

  /**
   * Get insights for a specific facility
   */
  @Get('facility/:id')
  @ApiOperation({
    summary: 'Get insights by facility',
    description: 'Retrieve all predictive insights for a specific facility',
  })
  @ApiResponse({
    status: 200,
    description: 'Facility insights retrieved successfully',
    type: InsightsResponseDto,
  })
  @ApiParam({
    name: 'id',
    description: 'Facility ID',
    example: 'facility-1',
  })
  async getInsightsByFacility(@Param('id') id: string) {
    this.logger.debug(`Get insights for facility: ${id}`);
    return await this.predictiveInsightsService.getInsightsByFacility(id);
  }

  /**
   * Get insights for a specific product/vaccine
   */
  @Get('product/:id')
  @ApiOperation({
    summary: 'Get insights by product',
    description: 'Retrieve all predictive insights for a specific vaccine product',
  })
  @ApiResponse({
    status: 200,
    description: 'Product insights retrieved successfully',
    type: InsightsResponseDto,
  })
  @ApiParam({
    name: 'id',
    description: 'Product/Vaccine code',
    example: 'BCG',
  })
  async getInsightsByProduct(@Param('id') id: string) {
    this.logger.debug(`Get insights for product: ${id}`);
    return await this.predictiveInsightsService.getInsightsByProduct(id);
  }

  /**
   * Get aggregated predictions for a facility-product combination
   * Returns stockout, expiry, and cold chain predictions together
   */
  @Get('aggregate/:facilityId/:productId')
  @ApiOperation({
    summary: 'Get aggregated predictions',
    description: 'Retrieve comprehensive predictions (stockout, expiry, cold chain) for a specific facility-product combination',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated predictions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stockout: {
          type: 'object',
          properties: {
            prediction: { type: 'string' },
            expectedDate: { type: 'string' },
            confidence: { type: 'number' },
            riskLevel: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
            daysUntilEvent: { type: 'number' },
            metrics: { type: 'object' },
          },
        },
        expiry: {
          type: 'object',
          properties: {
            prediction: { type: 'string' },
            expectedDate: { type: 'string' },
            confidence: { type: 'number' },
            riskLevel: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
            daysUntilEvent: { type: 'number' },
            metrics: { type: 'object' },
          },
        },
        coldChain: {
          type: 'object',
          properties: {
            prediction: { type: 'string' },
            expectedDate: { type: 'string' },
            confidence: { type: 'number' },
            riskLevel: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
            daysUntilEvent: { type: 'number' },
            metrics: { type: 'object' },
          },
        },
        overallRiskLevel: {
          type: 'string',
          enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
          description: 'Highest risk level across all predictions',
        },
      },
    },
  })
  @ApiParam({
    name: 'facilityId',
    description: 'Facility ID',
    example: 'facility-1',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product/Vaccine code',
    example: 'BCG',
  })
  async getAggregatedPredictions(
    @Param('facilityId') facilityId: string,
    @Param('productId') productId: string,
  ) {
    this.logger.debug(`Get aggregated predictions for facility: ${facilityId}, product: ${productId}`);
    return await this.predictiveInsightsService.getAggregatedPredictions(facilityId, productId);
  }

  /**
   * Get summary statistics for dashboard
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Get summary statistics',
    description: 'Retrieve summary statistics for the predictive insights dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalInsights: { type: 'number', description: 'Total number of insights' },
        criticalCount: { type: 'number', description: 'Number of CRITICAL risk insights' },
        highCount: { type: 'number', description: 'Number of HIGH risk insights' },
        facilitiesAtRisk: { type: 'number', description: 'Number of facilities with CRITICAL or HIGH risk' },
        productsAtRisk: { type: 'number', description: 'Number of products with CRITICAL or HIGH risk' },
      },
    },
  })
  async getSummaryStats() {
    this.logger.debug('Get summary statistics');
    return await this.predictiveInsightsService.getSummaryStats();
  }

  // ============================================
  // ML MODEL MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * Get ML model status
   */
  @Get('ml/status')
  @ApiOperation({
    summary: 'Get ML model status',
    description: 'Retrieve current status of all ML models including phase, trained models, and last training time',
  })
  @ApiResponse({
    status: 200,
    description: 'ML model status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        phase: { type: 'number', enum: [1, 2, 3], description: 'Current ML phase' },
        etsModel: { type: 'boolean', description: 'ETS model trained' },
        isolationForestModel: { type: 'boolean', description: 'Isolation Forest model trained' },
        randomForestModel: { type: 'boolean', description: 'Random Forest model trained' },
        lstmModel: { type: 'boolean', description: 'LSTM model trained' },
        ensembleModel: { type: 'boolean', description: 'Ensemble model trained' },
        transferLearningEnabled: { type: 'boolean', description: 'Transfer learning enabled' },
        lastTrained: { type: 'string', description: 'Last training timestamp' },
      },
    },
  })
  getMLStatus() {
    this.logger.debug('Get ML model status');
    return this.mlModelService.getModelStatus();
  }

  /**
   * Get feature importances from Random Forest
   */
  @Get('ml/feature-importances')
  @ApiOperation({
    summary: 'Get feature importances',
    description: 'Retrieve feature importances from the trained Random Forest model',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature importances retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
  })
  getFeatureImportances() {
    this.logger.debug('Get feature importances');
    return this.mlModelService.getFeatureImportances();
  }

  /**
   * Train ML models
   */
  @Post('ml/train')
  @ApiOperation({
    summary: 'Train ML models',
    description: 'Train specified ML models with provided data. Supports Phase 2 (ETS, Isolation Forest, Random Forest) and Phase 3 (LSTM) models.',
  })
  @ApiResponse({
    status: 200,
    description: 'Models trained successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        modelsTrained: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: { type: 'string', enum: ['ets', 'isolation-forest', 'random-forest', 'lstm'] },
          description: 'Models to train',
        },
        consumptionData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date-time' },
              value: { type: 'number' },
            },
          },
          description: 'Historical consumption data for ETS/LSTM',
        },
        anomalyData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          description: 'Stock movement data for Isolation Forest',
        },
        classificationData: {
          type: 'object',
          properties: {
            features: {
              type: 'array',
              items: { type: 'object' },
              description: 'Classification features',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Risk level labels',
            },
          },
          description: 'Classification data for Random Forest',
        },
        config: {
          type: 'object',
          description: 'Optional model configuration',
        },
      },
    },
  })
  async trainModels(@Body() body: {
    models: string[];
    consumptionData?: Array<{ date: string; value: number }>;
    anomalyData?: Array<{ value: number; timestamp: string }>;
    classificationData?: { features: any[]; labels: string[] };
    config?: any;
  }) {
    this.logger.log(`Training ML models: ${body.models.join(', ')}`);
    const modelsTrained: string[] = [];

    try {
      // Train ETS model
      if (body.models.includes('ets') && body.consumptionData) {
        const timeSeriesData = body.consumptionData.map(d => ({
          date: new Date(d.date),
          value: d.value,
        }));
        this.mlModelService.trainETSModel(timeSeriesData, body.config?.ets);
        modelsTrained.push('ETS');
      }

      // Train Isolation Forest
      if (body.models.includes('isolation-forest') && body.anomalyData) {
        const anomalyData = body.anomalyData.map(d => ({
          value: d.value,
          timestamp: new Date(d.timestamp),
        }));
        this.mlModelService.trainIsolationForest(anomalyData, body.config?.isolationForest);
        modelsTrained.push('Isolation Forest');
      }

      // Train Random Forest
      if (body.models.includes('random-forest') && body.classificationData) {
        this.mlModelService.trainRandomForest(
          body.classificationData.features,
          body.classificationData.labels,
          body.config?.randomForest
        );
        modelsTrained.push('Random Forest');
      }

      // Train LSTM
      if (body.models.includes('lstm') && body.consumptionData) {
        const timeSeriesData = body.consumptionData.map(d => ({
          date: new Date(d.date),
          value: d.value,
        }));
        await this.mlModelService.trainLSTMModel(timeSeriesData, body.config?.lstm);
        modelsTrained.push('LSTM');
      }

      return {
        success: true,
        message: `Successfully trained ${modelsTrained.length} model(s)`,
        modelsTrained,
      };
    } catch (error) {
      this.logger.error(`Error training models: ${error.message}`);
      return {
        success: false,
        message: error.message,
        modelsTrained,
      };
    }
  }

  /**
   * Forecast consumption using ML models
   */
  @Post('ml/forecast')
  @ApiOperation({
    summary: 'Forecast consumption',
    description: 'Generate consumption forecast using trained ML models (ETS, LSTM, or Ensemble)',
  })
  @ApiResponse({
    status: 200,
    description: 'Forecast generated successfully',
    schema: {
      type: 'object',
      properties: {
        forecast: { type: 'array', items: { type: 'number' }, description: 'Forecasted values' },
        predictionIntervals: { type: 'array', items: { type: 'object' }, description: 'Confidence intervals' },
        confidence: { type: 'number', description: 'Overall confidence score' },
        method: { type: 'string', enum: ['rule-based', 'ets', 'lstm', 'ensemble'], description: 'Forecasting method used' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        horizon: {
          type: 'number',
          description: 'Forecast horizon (days)',
          default: 30,
          minimum: 1,
          maximum: 365,
        },
        useML: {
          type: 'boolean',
          description: 'Use ML models if available',
          default: true,
        },
      },
    },
  })
  async forecastConsumption(@Body() body: { horizon?: number; useML?: boolean }) {
    this.logger.debug(`Forecast consumption: horizon=${body.horizon}, useML=${body.useML}`);
    return this.mlModelService.forecastConsumption(body.horizon ?? 30, body.useML ?? true);
  }

  /**
   * Detect anomalies in stock movements
   */
  @Post('ml/detect-anomalies')
  @ApiOperation({
    summary: 'Detect anomalies',
    description: 'Detect anomalies in stock movements using Isolation Forest',
  })
  @ApiResponse({
    status: 200,
    description: 'Anomalies detected successfully',
    schema: {
      type: 'object',
      properties: {
        anomalies: { type: 'array', items: { type: 'object' }, description: 'Detected anomalies' },
        scores: { type: 'array', items: { type: 'number' }, description: 'Anomaly scores' },
        threshold: { type: 'number', description: 'Detection threshold' },
        anomalyCount: { type: 'number', description: 'Number of anomalies detected' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          description: 'Stock movement data',
        },
        threshold: {
          type: 'number',
          description: 'Anomaly detection threshold (0-1)',
          default: 0.5,
          minimum: 0,
          maximum: 1,
        },
      },
    },
  })
  async detectAnomalies(@Body() body: {
    data: Array<{ value: number; timestamp: string }>;
    threshold?: number;
  }) {
    this.logger.debug(`Detect anomalies: ${body.data.length} data points, threshold=${body.threshold}`);
    const anomalyData = body.data.map(d => ({
      value: d.value,
      timestamp: new Date(d.timestamp),
    }));
    return this.mlModelService.detectAnomalies(anomalyData, body.threshold ?? 0.5);
  }

  /**
   * Classify risk level using ML models
   */
  @Post('ml/classify')
  @ApiOperation({
    summary: 'Classify risk level',
    description: 'Classify risk level using Random Forest or rule-based fallback',
  })
  @ApiResponse({
    status: 200,
    description: 'Risk classified successfully',
    schema: {
      type: 'object',
      properties: {
        riskLevel: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
        confidence: { type: 'number', description: 'Classification confidence (0-100)' },
        probabilities: {
          type: 'object',
          properties: {
            CRITICAL: { type: 'number' },
            HIGH: { type: 'number' },
            MEDIUM: { type: 'number' },
            LOW: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        features: {
          type: 'object',
          properties: {
            currentStock: { type: 'number' },
            avgDailyConsumption: { type: 'number' },
            daysUntilStockout: { type: 'number' },
            expiryRisk: { type: 'number' },
            capacityUtilization: { type: 'number' },
            temperatureDeviation: { type: 'number' },
            dataQuality: { type: 'number' },
            seasonalityFactor: { type: 'number' },
          },
          required: ['currentStock', 'avgDailyConsumption', 'daysUntilStockout'],
        },
      },
    },
  })
  classifyRisk(@Body() body: { features: any }) {
    this.logger.debug('Classify risk level');
    return this.mlModelService.classifyRisk(body.features);
  }
}
