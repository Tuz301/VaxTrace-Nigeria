/**
 * VaxTrace Nigeria - Predictive Insights Service
 *
 * Implements "Crystal Ball" predictive analytics for vaccine supply chain.
 * Phase 1: Rule-Based Foundation with deterministic algorithms:
 * - Stockout Prediction (< 7 days, 7-14 days, > 14 days)
 * - Expiry Risk Calculation
 * - Cold Chain Capacity Prediction
 * - Confidence Scoring
 *
 * @author VaxTrace Team
 * @version 2.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import {
  InsightQueryDto,
  PredictiveInsightDto,
  InsightsResponseDto,
} from './dto/insight.dto';

import {
  calculateStockoutPrediction,
  calculateExpiryRisk,
  calculateColdChainRisk,
  generateAllPredictions,
  calculateAverageDailyConsumption,
  calculateDataQuality,
  getSeasonalityFactor,
  type StockData,
  type ExpiryData,
  type ColdChainData,
  type HistoricalDataPoint,
  type PredictionResult,
} from './algorithms/prediction-algorithms';

// ============================================
// INTERFACES & TYPES
// ============================================

interface InsightRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  productId: string;
  productName: string;
  predictionType: 'STOCKOUT' | 'EXPIRY' | 'COLD_CHAIN' | 'AGGREGATED';
  prediction: string;
  expectedDate: string;
  confidence: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  daysUntilEvent: number;
  metrics: {
    [key: string]: number | string;
  };
}

interface FacilityData {
  id: string;
  name: string;
  state: string;
  lga: string;
  maxColdChainCapacity: number;
  currentTemperature?: number;
}

interface VaccineStockData {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailyConsumption: number;
  expiringDoses: number;
  daysUntilExpiry: number;
  totalDoses: number;
  historicalData: HistoricalDataPoint[];
}

// ============================================
// MOCK DATABASE
// ============================================

// Mock facility database
const FACILITIES: Record<string, FacilityData> = {
  'facility-1': {
    id: 'facility-1',
    name: 'Central Hospital, Abuja',
    state: 'FCT',
    lga: 'AMAC',
    maxColdChainCapacity: 50000,
    currentTemperature: 3.5,
  },
  'facility-2': {
    id: 'facility-2',
    name: 'General Hospital, Lagos',
    state: 'Lagos',
    lga: 'Ikeja',
    maxColdChainCapacity: 75000,
    currentTemperature: 4.2,
  },
  'facility-3': {
    id: 'facility-3',
    name: 'University Teaching Hospital, Ibadan',
    state: 'Oyo',
    lga: 'Ibadan North',
    maxColdChainCapacity: 60000,
    currentTemperature: 3.8,
  },
  'facility-4': {
    id: 'facility-4',
    name: 'Health Center, Port Harcourt',
    state: 'Rivers',
    lga: 'Port Harcourt',
    maxColdChainCapacity: 40000,
    currentTemperature: 5.1,
  },
  'facility-5': {
    id: 'facility-5',
    name: 'General Hospital, Kano',
    state: 'Kano',
    lga: 'Kano Municipal',
    maxColdChainCapacity: 55000,
    currentTemperature: 4.0,
  },
  'facility-6': {
    id: 'facility-6',
    name: 'General Hospital, Kaduna',
    state: 'Kaduna',
    lga: 'Kaduna North',
    maxColdChainCapacity: 45000,
    currentTemperature: 3.9,
  },
  'facility-7': {
    id: 'facility-7',
    name: 'Health Center, Benin',
    state: 'Edo',
    lga: 'Oredo',
    maxColdChainCapacity: 35000,
    currentTemperature: 4.5,
  },
  'facility-8': {
    id: 'facility-8',
    name: 'Specialist Hospital, Maiduguri',
    state: 'Borno',
    lga: 'Maiduguri',
    maxColdChainCapacity: 40000,
    currentTemperature: 4.1,
  },
};

// Mock vaccine stock data with historical data
const VACCINE_STOCK_DATA: Record<string, VaccineStockData> = {
  'BCG': {
    productId: 'BCG',
    productName: 'BCG Vaccine',
    currentStock: 150,
    avgDailyConsumption: 50,
    expiringDoses: 30,
    daysUntilExpiry: 7,
    totalDoses: 150,
    historicalData: generateMockHistoricalData(50, 45, 60),
  },
  'MEASLES': {
    productId: 'MEASLES',
    productName: 'Measles Vaccine',
    currentStock: 200,
    avgDailyConsumption: 28,
    expiringDoses: 120,
    daysUntilExpiry: 7,
    totalDoses: 200,
    historicalData: generateMockHistoricalData(25, 20, 35),
  },
  'PENTA': {
    productId: 'PENTA',
    productName: 'Pentavalent Vaccine',
    currentStock: 350,
    avgDailyConsumption: 50,
    expiringDoses: 0,
    daysUntilExpiry: 45,
    totalDoses: 350,
    historicalData: generateMockHistoricalData(48, 40, 55),
  },
  'PCV': {
    productId: 'PCV',
    productName: 'Pneumococcal Vaccine',
    currentStock: 180,
    avgDailyConsumption: 36,
    expiringDoses: 20,
    daysUntilExpiry: 14,
    totalDoses: 180,
    historicalData: generateMockHistoricalData(35, 28, 42),
  },
  'YF': {
    productId: 'YF',
    productName: 'Yellow Fever Vaccine',
    currentStock: 250,
    avgDailyConsumption: 18,
    expiringDoses: 150,
    daysUntilExpiry: 14,
    totalDoses: 250,
    historicalData: generateMockHistoricalData(17, 12, 22),
  },
  'OPV': {
    productId: 'OPV',
    productName: 'Oral Polio Vaccine',
    currentStock: 800,
    avgDailyConsumption: 80,
    expiringDoses: 0,
    daysUntilExpiry: 60,
    totalDoses: 800,
    historicalData: generateMockHistoricalData(78, 65, 95),
  },
  'COVID': {
    productId: 'COVID',
    productName: 'COVID-19 Vaccine',
    currentStock: 1200,
    avgDailyConsumption: 100,
    expiringDoses: 200,
    daysUntilExpiry: 21,
    totalDoses: 1200,
    historicalData: generateMockHistoricalData(95, 75, 120),
  },
  'HPV': {
    productId: 'HPV',
    productName: 'HPV Vaccine',
    currentStock: 300,
    avgDailyConsumption: 25,
    expiringDoses: 50,
    daysUntilExpiry: 30,
    totalDoses: 300,
    historicalData: generateMockHistoricalData(24, 18, 32),
  },
};

// Helper function to generate mock historical data
function generateMockHistoricalData(
  avgConsumption: number,
  minConsumption: number,
  maxConsumption: number
): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const today = new Date();
  
  for (let i = 90; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some randomness to consumption
    const consumption = Math.floor(
      avgConsumption + (Math.random() - 0.5) * (maxConsumption - minConsumption)
    );
    
    data.push({
      date,
      consumption: Math.max(minConsumption, Math.min(maxConsumption, consumption)),
      stock: 1000, // Mock stock value
      wastage: Math.floor(Math.random() * 5),
    });
  }
  
  return data;
}

// ============================================
// PREDICTIVE INSIGHTS SERVICE
// ============================================

@Injectable()
export class PredictiveInsightsService {
  private readonly logger = new Logger(PredictiveInsightsService.name);
  private insightsCache: InsightRecord[] = [];
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Predictive Insights Service initialized with Rule-Based Foundation');
    this.generateInsights();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Get predictive insights with optional filtering
   * Uses cache for performance, regenerates if stale
   */
  async getInsights(query: InsightQueryDto = {}): Promise<InsightsResponseDto> {
    this.logger.debug(`Fetching insights with query: ${JSON.stringify(query)}`);

    // Check if cache needs refresh
    if (!this.lastCacheUpdate || Date.now() - this.lastCacheUpdate.getTime() > this.CACHE_TTL) {
      this.generateInsights();
    }

    let filteredInsights = [...this.insightsCache];

    // Filter by risk level
    if (query.riskLevel) {
      filteredInsights = filteredInsights.filter((insight) => insight.riskLevel === query.riskLevel);
    }

    // Filter by state
    if (query.state) {
      filteredInsights = filteredInsights.filter((insight) => {
        const facility = this.getFacilityById(insight.facilityId);
        return facility?.state === query.state;
      });
    }

    // Filter by facility
    if (query.facilityId) {
      filteredInsights = filteredInsights.filter((insight) => insight.facilityId === query.facilityId);
    }

    // Filter by product
    if (query.productId) {
      filteredInsights = filteredInsights.filter((insight) => insight.productId === query.productId);
    }

    // Sort by risk level (CRITICAL first) and then by days until event (soonest first)
    const riskLevelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filteredInsights.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        return riskLevelOrder[a.riskLevel] - riskLevelOrder[b.riskLevel];
      }
      return a.daysUntilEvent - b.daysUntilEvent;
    });

    this.logger.log(`Returning ${filteredInsights.length} insights`);

    return {
      data: filteredInsights.map((insight) => this.toInsightDto(insight)),
      count: filteredInsights.length,
    };
  }

  /**
   * Get insights for a specific facility
   */
  async getInsightsByFacility(facilityId: string): Promise<InsightsResponseDto> {
    return this.getInsights({ facilityId });
  }

  /**
   * Get insights for a specific product/vaccine
   */
  async getInsightsByProduct(productId: string): Promise<InsightsResponseDto> {
    return this.getInsights({ productId });
  }

  /**
   * Get aggregated predictions for a facility-product combination
   */
  async getAggregatedPredictions(
    facilityId: string,
    productId: string
  ): Promise<{
    stockout: PredictionResult;
    expiry: PredictionResult;
    coldChain: PredictionResult;
    overallRiskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }> {
    const facility = this.getFacilityById(facilityId);
    const vaccineData = VACCINE_STOCK_DATA[productId];

    if (!facility) {
      throw new Error(`Facility not found: ${facilityId}`);
    }
    if (!vaccineData) {
      throw new Error(`Vaccine data not found: ${productId}`);
    }

    // Calculate data quality from historical data
    const historicalDataQuality = calculateDataQuality(vaccineData.historicalData);

    // Prepare input data for predictions
    const stockData: StockData = {
      currentStock: vaccineData.currentStock,
      avgDailyConsumption: vaccineData.avgDailyConsumption,
      historicalDataQuality,
    };

    const expiryData: ExpiryData = {
      totalDoses: vaccineData.totalDoses,
      expiringDoses: vaccineData.expiringDoses,
      daysUntilExpiry: vaccineData.daysUntilExpiry,
      avgDailyConsumption: vaccineData.avgDailyConsumption,
    };

    const coldChainData: ColdChainData = {
      currentStock: vaccineData.currentStock,
      maxCapacity: facility.maxColdChainCapacity,
      avgIncomingShipments: vaccineData.avgDailyConsumption * 7, // Weekly incoming
      seasonalityFactor: getSeasonalityFactor(),
      currentTemperature: facility.currentTemperature,
    };

    return generateAllPredictions({
      stockData,
      expiryData,
      coldChainData,
    });
  }

  /**
   * Get summary statistics for dashboard
   */
  async getSummaryStats(): Promise<{
    totalInsights: number;
    criticalCount: number;
    highCount: number;
    facilitiesAtRisk: number;
    productsAtRisk: number;
  }> {
    await this.getInsights(); // Ensure cache is fresh

    const criticalCount = this.insightsCache.filter(
      (insight) => insight.riskLevel === 'CRITICAL'
    ).length;
    const highCount = this.insightsCache.filter(
      (insight) => insight.riskLevel === 'HIGH'
    ).length;
    const facilitiesAtRisk = new Set(
      this.insightsCache
        .filter((insight) => insight.riskLevel === 'CRITICAL' || insight.riskLevel === 'HIGH')
        .map((insight) => insight.facilityId)
    ).size;
    const productsAtRisk = new Set(
      this.insightsCache
        .filter((insight) => insight.riskLevel === 'CRITICAL' || insight.riskLevel === 'HIGH')
        .map((insight) => insight.productId)
    ).size;

    return {
      totalInsights: this.insightsCache.length,
      criticalCount,
      highCount,
      facilitiesAtRisk,
      productsAtRisk,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Generate insights using deterministic algorithms
   * This is the core Phase 1 implementation
   */
  private generateInsights(): void {
    this.logger.debug('Generating insights using Rule-Based Foundation algorithms');
    const insights: InsightRecord[] = [];

    const facilityIds = Object.keys(FACILITIES);
    const productIds = Object.keys(VACCINE_STOCK_DATA);

    // Generate predictions for each facility-product combination
    for (const facilityId of facilityIds) {
      const facility = FACILITIES[facilityId];

      for (const productId of productIds) {
        const vaccineData = VACCINE_STOCK_DATA[productId];

        // Calculate data quality from historical data
        const historicalDataQuality = calculateDataQuality(vaccineData.historicalData);

        // Generate stockout prediction
        const stockoutResult = calculateStockoutPrediction({
          currentStock: vaccineData.currentStock,
          avgDailyConsumption: vaccineData.avgDailyConsumption,
          historicalDataQuality,
        });

        insights.push({
          id: randomUUID(),
          facilityId,
          facilityName: facility.name,
          productId,
          productName: vaccineData.productName,
          predictionType: 'STOCKOUT',
          prediction: stockoutResult.prediction,
          expectedDate: stockoutResult.expectedDate,
          confidence: stockoutResult.confidence,
          riskLevel: stockoutResult.riskLevel,
          daysUntilEvent: stockoutResult.daysUntilEvent,
          metrics: stockoutResult.metrics,
        });

        // Generate expiry prediction (only if there are expiring doses)
        if (vaccineData.expiringDoses > 0) {
          const expiryResult = calculateExpiryRisk({
            totalDoses: vaccineData.totalDoses,
            expiringDoses: vaccineData.expiringDoses,
            daysUntilExpiry: vaccineData.daysUntilExpiry,
            avgDailyConsumption: vaccineData.avgDailyConsumption,
          });

          insights.push({
            id: randomUUID(),
            facilityId,
            facilityName: facility.name,
            productId,
            productName: vaccineData.productName,
            predictionType: 'EXPIRY',
            prediction: expiryResult.prediction,
            expectedDate: expiryResult.expectedDate,
            confidence: expiryResult.confidence,
            riskLevel: expiryResult.riskLevel,
            daysUntilEvent: expiryResult.daysUntilEvent,
            metrics: expiryResult.metrics,
          });
        }

        // Generate cold chain prediction (only for facility-level, not per product)
        if (productId === productIds[0]) {
          const coldChainResult = calculateColdChainRisk({
            currentStock: vaccineData.currentStock,
            maxCapacity: facility.maxColdChainCapacity,
            avgIncomingShipments: vaccineData.avgDailyConsumption * 7,
            seasonalityFactor: getSeasonalityFactor(),
            currentTemperature: facility.currentTemperature,
          });

          insights.push({
            id: randomUUID(),
            facilityId,
            facilityName: facility.name,
            productId: 'COLD_CHAIN',
            productName: 'Cold Chain Equipment',
            predictionType: 'COLD_CHAIN',
            prediction: coldChainResult.prediction,
            expectedDate: coldChainResult.expectedDate,
            confidence: coldChainResult.confidence,
            riskLevel: coldChainResult.riskLevel,
            daysUntilEvent: coldChainResult.daysUntilEvent,
            metrics: coldChainResult.metrics,
          });
        }
      }
    }

    this.insightsCache = insights;
    this.lastCacheUpdate = new Date();
    this.logger.log(`Generated ${insights.length} insights using Rule-Based algorithms`);
  }

  private toInsightDto(insight: InsightRecord): PredictiveInsightDto {
    return {
      id: insight.id,
      facilityId: insight.facilityId,
      facilityName: insight.facilityName,
      productId: insight.productId,
      productName: insight.productName,
      prediction: insight.prediction,
      expectedDate: insight.expectedDate,
      confidence: insight.confidence,
      riskLevel: insight.riskLevel,
    };
  }

  private getFacilityById(facilityId: string): FacilityData | null {
    return FACILITIES[facilityId] || null;
  }
}
