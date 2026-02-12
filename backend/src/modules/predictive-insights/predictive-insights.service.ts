/**
 * VaxTrace Nigeria - Predictive Insights Service
 *
 * Implements "Crystal Ball" predictive analytics for vaccine supply chain.
 * Uses ML/AI models to forecast:
 * - Stockouts
 * - Expiry risks
 * - Demand surges
 * - Cold chain breaches
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import {
  InsightQueryDto,
  PredictiveInsightDto,
  InsightsResponseDto,
} from './dto/insight.dto';

// ============================================
// INTERFACES & TYPES
// ============================================

interface InsightRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  productId: string;
  productName: string;
  prediction: string;
  expectedDate: string;
  confidence: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

// ============================================
// MOCK INSIGHTS DATABASE
// ============================================

// In production, this would be replaced with ML model predictions
const MOCK_INSIGHTS: InsightRecord[] = [
  {
    id: 'insight-1',
    facilityId: 'facility-1',
    facilityName: 'Central Hospital, Abuja',
    productId: 'BCG',
    productName: 'BCG Vaccine',
    prediction: 'Based on current consumption rate, BCG vaccine stock will be depleted within 3 days. Immediate replenishment required.',
    expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 95,
    riskLevel: 'CRITICAL',
  },
  {
    id: 'insight-2',
    facilityId: 'facility-2',
    facilityName: 'General Hospital, Lagos',
    productId: 'MEASLES',
    productName: 'Measles Vaccine',
    prediction: '120 doses of Measles vaccine will expire in 7 days. Risk of wastage: 85%.',
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 85,
    riskLevel: 'HIGH',
  },
  {
    id: 'insight-3',
    facilityId: 'facility-4',
    facilityName: 'Health Center, Port Harcourt',
    productId: 'COLD_CHAIN',
    productName: 'Cold Chain Equipment',
    prediction: 'Predicted vaccine influx will exceed current cold chain storage capacity by 25% in the next 30 days. Risk of temperature breaches.',
    expectedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 82,
    riskLevel: 'HIGH',
  },
  {
    id: 'insight-4',
    facilityId: 'facility-6',
    facilityName: 'General Hospital, Kaduna',
    productId: 'PENTA',
    productName: 'Pentavalent Vaccine',
    prediction: 'Pentavalent vaccine stock will be depleted within 7 days based on current consumption rate.',
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 88,
    riskLevel: 'HIGH',
  },
  {
    id: 'insight-5',
    facilityId: 'facility-7',
    facilityName: 'Health Center, Port Harcourt',
    productId: 'YF',
    productName: 'Yellow Fever Vaccine',
    prediction: '150 doses of Yellow Fever vaccine will expire in 14 days. High risk of wastage.',
    expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 82,
    riskLevel: 'HIGH',
  },
  {
    id: 'insight-6',
    facilityId: 'facility-8',
    facilityName: 'Specialist Hospital, Maiduguri',
    productId: 'PCV',
    productName: 'Pneumococcal Vaccine',
    prediction: 'PCV vaccine stock will be depleted within 5 days due to increased demand from outreach activities.',
    expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 91,
    riskLevel: 'HIGH',
  },
];

// ============================================
// PREDIVE INSIGHTS SERVICE
// ============================================

@Injectable()
export class PredictiveInsightsService {
  private readonly logger = new Logger(PredictiveInsightsService.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Predictive Insights Service initialized');
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Get predictive insights with optional filtering
   */
  async getInsights(query: InsightQueryDto = {}): Promise<InsightsResponseDto> {
    this.logger.debug(`Fetching insights with query: ${JSON.stringify(query)}`);

    let filteredInsights = [...MOCK_INSIGHTS];

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

    // Sort by risk level (CRITICAL first) and then by confidence (highest first)
    const riskLevelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filteredInsights.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        return riskLevelOrder[a.riskLevel] - riskLevelOrder[b.riskLevel];
      }
      return b.confidence - a.confidence;
    });

    this.logger.log(`Returning ${filteredInsights.length} insights`);

    return {
      data: filteredInsights.map((insight) => this.toInsightDto(insight)),
      count: filteredInsights.length,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

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

  private getFacilityById(facilityId: string): { state: string } | null {
    // Mock facility lookup - in production, this would query the database
    const facilities = {
      'facility-1': { state: 'FCT', name: 'Central Hospital, Abuja' },
      'facility-2': { state: 'Lagos', name: 'General Hospital, Lagos' },
      'facility-3': { state: 'Rivers', name: 'Health Center, Port Harcourt' },
      'facility-4': { state: 'Kaduna', name: 'General Hospital, Kaduna' },
      'facility-5': { state: 'Rivers', name: 'Health Center, Port Harcourt' },
      'facility-6': { state: 'Borno', name: 'Specialist Hospital, Maiduguri' },
      'facility-7': { state: 'Borno', name: 'Specialist Hospital, Maiduguri' },
      'facility-8': { state: 'Sokoto', name: 'Specialist Hospital, Maiduguri' },
    };
    return facilities[facilityId] || null;
  }
}
