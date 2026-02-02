/**
 * VaxTrace Nigeria - Predictive Insights API Route
 * 
 * This API route provides predictive insights for vaccine stock management,
 * including demand forecasting, expiry risk predictions, and stockout alerts.
 */

import { NextRequest, NextResponse } from 'next/server';

interface PredictiveInsight {
  id: string;
  type: 'DEMAND_FORECAST' | 'EXPIRY_RISK' | 'STOCKOUT_PREDICTION' | 'COLD_CHAIN_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  facilityId?: string;
  facilityName?: string;
  lga?: string;
  state?: string;
  vaccineCode?: string;
  vaccineName?: string;
  currentValue: number;
  predictedValue: number;
  unit: string;
  timeframe: string; // e.g., "7 days", "30 days"
  confidence: number; // 0-100 percentage
  recommendations: string[];
  createdAt: string;
}

// Mock predictive insights data for development
const mockPredictiveInsights: PredictiveInsight[] = [
  {
    id: 'insight-1',
    type: 'STOCKOUT_PREDICTION',
    severity: 'CRITICAL',
    title: 'Impending BCG Stockout at Central Hospital Abuja',
    description: 'Based on current consumption rate, BCG vaccine stock will be depleted within 3 days. Immediate replenishment required.',
    facilityId: 'facility-1',
    facilityName: 'Central Hospital, Abuja',
    lga: 'AMAC',
    state: 'FCT',
    vaccineCode: 'BCG',
    vaccineName: 'BCG Vaccine',
    currentValue: 50,
    predictedValue: 0,
    unit: 'doses',
    timeframe: '3 days',
    confidence: 95,
    recommendations: [
      'Initiate emergency transfer from nearby facilities',
      'Contact state vaccine store for urgent replenishment',
      'Prioritize high-risk populations for remaining stock',
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'insight-2',
    type: 'EXPIRY_RISK',
    severity: 'HIGH',
    title: 'Measles Vaccine Expiry Risk in Lagos State',
    description: '120 doses of Measles vaccine at General Hospital Lagos will expire in 7 days. Risk of wastage: 85%.',
    facilityId: 'facility-2',
    facilityName: 'General Hospital, Lagos',
    lga: 'Ikeja',
    state: 'Lagos',
    vaccineCode: 'MEASLES',
    vaccineName: 'Measles Vaccine',
    currentValue: 120,
    predictedValue: 18, // predicted wastage
    unit: 'doses',
    timeframe: '7 days',
    confidence: 85,
    recommendations: [
      'Transfer to facilities with higher demand',
      'Accelerate vaccination campaigns in affected area',
      'Coordinate with neighboring states for redistribution',
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'insight-3',
    type: 'DEMAND_FORECAST',
    severity: 'MEDIUM',
    title: 'Increased OPV Demand Predicted in Kano State',
    description: 'Based on historical data and upcoming immunization campaigns, OPV demand is expected to increase by 40% in the next 14 days.',
    facilityId: 'facility-3',
    facilityName: 'Primary Health Center, Kano',
    lga: 'Kano Municipal',
    state: 'Kano',
    vaccineCode: 'OPV',
    vaccineName: 'Oral Polio Vaccine',
    currentValue: 500,
    predictedValue: 700,
    unit: 'doses',
    timeframe: '14 days',
    confidence: 78,
    recommendations: [
      'Pre-position additional stock from state vaccine store',
      'Schedule supplementary immunization activities',
      'Monitor cold chain capacity for increased storage needs',
    ],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'insight-4',
    type: 'COLD_CHAIN_RISK',
    severity: 'HIGH',
    title: 'Cold Chain Capacity Warning in Port Harcourt',
    description: 'Predicted vaccine influx will exceed current cold chain storage capacity by 25% in the next 30 days. Risk of temperature breaches.',
    facilityId: 'facility-5',
    facilityName: 'Health Center, Port Harcourt',
    lga: 'Port Harcourt',
    state: 'Rivers',
    currentValue: 75,
    predictedValue: 100,
    unit: '% capacity',
    timeframe: '30 days',
    confidence: 82,
    recommendations: [
      'Deploy additional cold chain equipment',
      'Schedule more frequent vaccine deliveries to reduce storage needs',
      'Coordinate with regional facilities for backup storage',
    ],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'insight-5',
    type: 'EXPIRY_RISK',
    severity: 'MEDIUM',
    title: 'DTP Vaccine Expiry Risk in Oyo State',
    description: '200 doses of DTP vaccine at District Hospital Ibadan will expire in 21 days. Moderate risk of wastage if demand doesn\'t increase.',
    facilityId: 'facility-4',
    facilityName: 'District Hospital, Ibadan',
    lga: 'Ibadan North',
    state: 'Oyo',
    vaccineCode: 'DTP',
    vaccineName: 'DTP Vaccine',
    currentValue: 200,
    predictedValue: 60, // predicted wastage
    unit: 'doses',
    timeframe: '21 days',
    confidence: 65,
    recommendations: [
      'Monitor consumption trends closely',
      'Consider transfer to facilities with higher demand',
      'Plan catch-up vaccination campaigns',
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'insight-6',
    type: 'DEMAND_FORECAST',
    severity: 'LOW',
    title: 'Stable Hepatitis B Demand Predicted in Enugu State',
    description: 'Hepatitis B vaccine demand is expected to remain stable over the next 30 days. Current stock levels are adequate.',
    facilityId: 'facility-12',
    facilityName: 'State Vaccine Store, Enugu',
    lga: 'Enugu North',
    state: 'Enugu',
    vaccineCode: 'HEPB',
    vaccineName: 'Hepatitis B Vaccine',
    currentValue: 1000,
    predictedValue: 950,
    unit: 'doses',
    timeframe: '30 days',
    confidence: 88,
    recommendations: [
      'Maintain current stock levels',
      'Continue routine monitoring',
      'No immediate action required',
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const state = searchParams.get('state');
    const vaccineCode = searchParams.get('vaccineCode');

    let filteredInsights = [...mockPredictiveInsights];

    // Filter by type
    if (type) {
      filteredInsights = filteredInsights.filter(
        (insight) => insight.type === type
      );
    }

    // Filter by severity
    if (severity) {
      filteredInsights = filteredInsights.filter(
        (insight) => insight.severity === severity
      );
    }

    // Filter by state
    if (state) {
      filteredInsights = filteredInsights.filter(
        (insight) => insight.state === state
      );
    }

    // Filter by vaccine code
    if (vaccineCode) {
      filteredInsights = filteredInsights.filter(
        (insight) => insight.vaccineCode === vaccineCode
      );
    }

    // Sort by severity (CRITICAL first) and then by confidence (highest first)
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filteredInsights.sort((a, b) => {
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
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
