/**
 * VaxTrace Nigeria - Active Alerts API Route
 * 
 * This API route provides active (unresolved) alerts.
 * It's part of the v1 API structure for backward compatibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// INPUT VALIDATION SCHEMA
// ============================================

const ActiveAlertsQuerySchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  type: z.enum(['STOCKOUT', 'EXPIRY', 'COLD_CHAIN', 'DAMAGE', 'QUALITY']).optional(),
  state: z.string().max(100).optional(),
});

type ActiveAlertsQuery = z.infer<typeof ActiveAlertsQuerySchema>;

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

// Mock active alerts data for development
const mockActiveAlerts: Alert[] = [
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
    
    // Validate and parse query parameters using Zod
    const validationResult = ActiveAlertsQuerySchema.safeParse({
      severity: searchParams.get('severity'),
      type: searchParams.get('type'),
      state: searchParams.get('state'),
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
    
    const { severity, type, state } = validationResult.data;

    // Fetch active alerts from backend API
    const response = await fetch('/api/v1/alerts/active', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch active alerts from backend');
    }

    const result = await response.json();

    // Return active alerts from backend
    let filteredAlerts = result.data?.alerts || [];

    // Apply additional filters from query parameters
    // Filter by severity
    if (severity) {
      filteredAlerts = filteredAlerts.filter((alert: Alert) => alert.severity === severity);
    }

    // Filter by type
    if (type) {
      filteredAlerts = filteredAlerts.filter((alert: Alert) => alert.type === type);
    }

    // Filter by state
    if (state) {
      filteredAlerts = filteredAlerts.filter((alert: Alert) => alert.state === state);
    }

    // Sort by severity (CRITICAL first) and then by creation date (newest first)
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filteredAlerts.sort((a: Alert, b: Alert) => {
      if (a.severity !== b.severity) {
        return (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      data: filteredAlerts,
      count: filteredAlerts.length,
      summary: {
        critical: filteredAlerts.filter((a: Alert) => a.severity === 'CRITICAL').length,
        high: filteredAlerts.filter((a: Alert) => a.severity === 'HIGH').length,
        medium: filteredAlerts.filter((a: Alert) => a.severity === 'MEDIUM').length,
        low: filteredAlerts.filter((a: Alert) => a.severity === 'LOW').length,
      },
    });
  } catch (error) {
    console.error('[Active Alerts API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch active alerts',
      },
      { status: 500 }
    );
  }
}
