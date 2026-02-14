/**
 * VaxTrace Nigeria - Predictive Insights API Route
 *
 * This API route provides predictive insights for vaccine stock management,
 * including demand forecasting, expiry risk predictions, and stockout alerts.
 *
 * SECURITY: Input validation using Zod to prevent SQL Injection and XSS
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// INPUT VALIDATION SCHEMA
// ============================================

const PredictiveInsightsQuerySchema = z.object({
  riskLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  facilityId: z.string().max(100).optional(),
  productId: z.string().max(50).optional(),
});

type PredictiveInsightsQuery = z.infer<typeof PredictiveInsightsQuerySchema>;

interface PredictiveInsight {
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

// Mock predictive insights data for development
const mockPredictiveInsights: PredictiveInsight[] = [
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate and parse query parameters using Zod
    const validationResult = PredictiveInsightsQuerySchema.safeParse({
      riskLevel: searchParams.get('riskLevel'),
      facilityId: searchParams.get('facilityId'),
      productId: searchParams.get('productId'),
    });
    
    // Return 400 if validation fails
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }
    
    const { riskLevel, facilityId, productId } = validationResult.data;

    // Fetch predictive insights from backend API
    const response = await fetch('/api/v1/predictive-insights', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch predictive insights from backend');
    }

    const result = await response.json();

    // Return predictive insights from backend
    let filteredInsights = result.data?.insights || [];

    // Apply additional filters from query parameters
    // Filter by riskLevel
    if (riskLevel) {
      filteredInsights = filteredInsights.filter(
        (insight: any) => insight.riskLevel === riskLevel
      );
    }

    // Sort by riskLevel (CRITICAL first) and then by confidence (highest first)
    const riskLevelOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filteredInsights.sort((a: PredictiveInsight, b: PredictiveInsight) => {
      if (a.riskLevel !== b.riskLevel) {
        return (riskLevelOrder[a.riskLevel] ?? 99) - (riskLevelOrder[b.riskLevel] ?? 99);
      }
      return b.confidence - a.confidence;
    });

    return NextResponse.json({
      success: true,
      data: filteredInsights,
      count: filteredInsights.length,
    });
  } catch (error) {
    console.error('[Predictive Insights API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch predictive insights',
      },
      { status: 500 }
    );
  }
}
