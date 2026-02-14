/**
 * VaxTrace Nigeria - Cold Chain API Route
 * 
 * This route proxies cold chain monitoring requests to the backend API.
 * 
 * Features:
 * - Token abstraction (OAuth2 handled by backend)
 * - Data transformation (Backend → VaxTrace format)
 * - Cache integration (Redis)
 * - Error handling with fallback
 * - Next.js built-in revalidation
 * 
 * Routes:
 * - GET /api/v1/cold-chain - Get all cold chain equipment
 * - GET /api/v1/cold-chain/alerts - Get temperature alerts
 * - GET /api/v1/cold-chain/equipment/:id - Get equipment by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// CONFIGURATION
// ============================================

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CACHE_REVALIDATE = 60; // Revalidate every 60 seconds

// ============================================
// TYPES
// ============================================

interface ColdChainEquipment {
  id: string;
  facilityId: string;
  facilityName: string;
  equipmentType: 'WALK_IN_COLD_ROOM' | 'SOLAR_REFRIGERATOR' | 'ICE_LINED_REFRIGERATOR' | 'FREEZER';
  serialNumber: string;
  model: string;
  location: string;
  currentTemperature: number;
  targetTemperature: {
    min: number;
    max: number;
  };
  status: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  lastMaintenance: string;
  batteryLevel: number | null;
  powerSource: 'GRID' | 'SOLAR' | 'GENERATOR' | 'BATTERY';
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  createdAt: string;
  updatedAt: string;
}

interface TemperatureAlert {
  id: string;
  equipmentId: string;
  facilityId: string;
  facilityName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'HIGH_TEMPERATURE' | 'LOW_TEMPERATURE' | 'TEMPERATURE excursion' | 'EQUIPMENT_FAILURE';
  currentTemperature: number;
  threshold: number;
  duration: number; // minutes
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
  createdAt: string;
  resolvedAt: string | null;
}

interface ColdChainResponse {
  success: boolean;
  data: ColdChainEquipment[];
  meta?: {
    timestamp: string;
    requestId: string;
    cached: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface AlertsResponse {
  success: boolean;
  data: TemperatureAlert[];
  meta?: {
    timestamp: string;
    requestId: string;
    cached: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// SCHEMAS
// ============================================

const QueryParamsSchema = z.object({
  facilityId: z.string().uuid().optional(),
  equipmentType: z.enum(['WALK_IN_COLD_ROOM', 'SOLAR_REFRIGERATOR', 'ICE_LINED_REFRIGERATOR', 'FREEZER']).optional(),
  status: z.enum(['OPERATIONAL', 'WARNING', 'CRITICAL', 'OFFLINE']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

// ============================================
// HANDLER
// ============================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = QueryParamsSchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!queryParams.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: queryParams.error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', '),
          },
        } as ColdChainResponse,
        { status: 400 }
      );
    }

    const params = queryParams.data;

    // Build backend API URL
    const backendUrl = new URL(`${BACKEND_API_URL}/api/v1/cold-chain`);
    
    if (params.facilityId) backendUrl.searchParams.set('facilityId', params.facilityId);
    if (params.equipmentType) backendUrl.searchParams.set('equipmentType', params.equipmentType);
    if (params.status) backendUrl.searchParams.set('status', params.status);

    // Fetch from backend
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: CACHE_REVALIDATE,
        tags: ['cold-chain', params.facilityId || '', params.equipmentType || ''].filter(Boolean),
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform data
    const transformedData = Array.isArray(rawData.data)
      ? rawData.data
      : rawData.data
        ? [rawData.data]
        : [];

    // Return response
    return NextResponse.json(
      {
        success: true,
        data: transformedData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          cached: rawData.meta?.cached || false,
        },
      } as ColdChainResponse,
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  } catch (error: any) {
    console.error(`[Cold Chain API Error] Request ID: ${requestId}`, error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch cold chain data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          cached: false,
        },
      } as ColdChainResponse,
      {
        status: 500,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}
