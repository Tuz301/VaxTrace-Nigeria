/**
 * VaxTrace Nigeria - Alerts API Route
 * 
 * This API route provides alerts data to the frontend.
 * In development, it returns mock data. In production, it would
 * fetch from the backend OpenLMIS integration.
 */

import { NextRequest, NextResponse } from 'next/server';

interface Alert {
  id: string;
  type: 'STOCKOUT' | 'EXPIRY' | 'COLD_CHAIN' | 'DAMAGE' | 'QUALITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  facilityId: string;
  facilityName: string;
  lga: string;
  state: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
  vaccineCode?: string;
  quantity?: number;
}

// Mock alerts data for development
const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'STOCKOUT',
    severity: 'CRITICAL',
    facilityId: 'facility-1',
    facilityName: 'Central Hospital, Abuja',
    lga: 'AMAC',
    state: 'FCT',
    message: 'BCG vaccine stockout - 0 doses remaining',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    vaccineCode: 'BCG',
    quantity: 0,
  },
  {
    id: 'alert-2',
    type: 'EXPIRY',
    severity: 'HIGH',
    facilityId: 'facility-2',
    facilityName: 'General Hospital, Lagos',
    lga: 'Ikeja',
    state: 'Lagos',
    message: 'Measles vaccine expiring in 7 days - 120 doses at risk',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    vaccineCode: 'MEASLES',
    quantity: 120,
  },
  {
    id: 'alert-3',
    type: 'COLD_CHAIN',
    severity: 'MEDIUM',
    facilityId: 'facility-3',
    facilityName: 'Primary Health Center, Kano',
    lga: 'Kano Municipal',
    state: 'Kano',
    message: 'Cold chain breach detected - Temperature exceeded 8°C for 2 hours',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-4',
    type: 'STOCKOUT',
    severity: 'HIGH',
    facilityId: 'facility-4',
    facilityName: 'District Hospital, Ibadan',
    lga: 'Ibadan North',
    state: 'Oyo',
    message: 'OPV vaccine stockout - 50 doses remaining',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    vaccineCode: 'OPV',
    quantity: 50,
  },
  {
    id: 'alert-5',
    type: 'DAMAGE',
    severity: 'MEDIUM',
    facilityId: 'facility-5',
    facilityName: 'Health Center, Port Harcourt',
    lga: 'Port Harcourt',
    state: 'Rivers',
    message: 'Vaccine vials damaged during transport - 25 doses affected',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    vaccineCode: 'DTP',
    quantity: 25,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const state = searchParams.get('state');
    const active = searchParams.get('active');

    let filteredAlerts = [...mockAlerts];

    // Filter by active status
    if (active === 'true') {
      filteredAlerts = filteredAlerts.filter((alert) => !alert.resolvedAt);
    }

    // Filter by severity
    if (severity) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.severity === severity);
    }

    // Filter by type
    if (type) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.type === type);
    }

    // Filter by state
    if (state) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.state === state);
    }

    // Sort by severity (CRITICAL first) and then by creation date (newest first)
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filteredAlerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      data: filteredAlerts,
      count: filteredAlerts.length,
    });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alerts',
      },
      { status: 500 }
    );
  }
}
