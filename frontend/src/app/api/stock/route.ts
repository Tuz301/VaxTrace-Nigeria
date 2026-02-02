/**
 * VaxTrace Nigeria - Stock API Route
 * 
 * This is the "Orchestrator" route that fetches data from OpenLMIS,
 * checks Redis cache, and returns clean JSON for the UI.
 * 
 * Features:
 * - Token abstraction (OAuth2 handled by backend)
 * - Data transformation (OpenLMIS → VaxTrace format)
 * - Cache integration (Redis)
 * - Error handling with fallback
 * - Next.js built-in revalidation
 * 
 * Route: GET /api/stock?lgaId={id}&stateId={id}&facilityId={id}
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// CONFIGURATION
// ============================================

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CACHE_REVALIDATE = 60; // Revalidate every 60 seconds

// ============================================
// SCHEMAS
// ============================================

/**
 * Query parameters schema
 */
const QueryParamsSchema = z.object({
  lgaId: z.string().uuid().optional(),
  stateId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  vaccineCode: z.string().optional(),
  includeHistorical: z.boolean().default(false),
});

// ============================================
// TYPES
// ============================================

interface VaxTraceStockData {
  nodeId: string;
  facilityName: string;
  facilityCode: string;
  state: string;
  lga: string;
  productCode: string;
  productName: string;
  quantity: number;
  lotCode: string;
  lotExpiry: string;
  expiryRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED';
  vvmStage: number;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  monthsOfStock: number;
  lastUpdated: string;
}

interface StockResponse {
  success: boolean;
  data: VaxTraceStockData[];
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
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculates expiry risk based on days until expiry
 */
function calculateExpiryRisk(expiryDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED' {
  const now = new Date();
  const daysUntilExpiry = Math.floor(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) return 'EXPIRED';
  if (daysUntilExpiry < 30) return 'HIGH';
  if (daysUntilExpiry < 90) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculates VVM UI state from stage
 */
function calculateVVMUIState(stage: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
  if (stage <= 2) return 'HEALTHY';
  if (stage === 3) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Calculates stock status from months of stock
 */
function calculateStockStatus(
  monthsOfStock: number
): 'OPTIMAL' | 'UNDERSTOCKED' | 'STOCKOUT' | 'OVERSTOCKED' {
  if (monthsOfStock === 0) return 'STOCKOUT';
  if (monthsOfStock < 3) return 'UNDERSTOCKED';
  if (monthsOfStock > 6) return 'OVERSTOCKED';
  return 'OPTIMAL';
}

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
        } as StockResponse,
        { status: 400 }
      );
    }

    const params = queryParams.data;

    // Build backend API URL
    const backendUrl = new URL(`${BACKEND_API_URL}/api/v1/openlmis/stock`);
    
    if (params.lgaId) backendUrl.searchParams.set('lgaId', params.lgaId);
    if (params.stateId) backendUrl.searchParams.set('stateId', params.stateId);
    if (params.facilityId) backendUrl.searchParams.set('facilityId', params.facilityId);
    if (params.vaccineCode) backendUrl.searchParams.set('vaccineCode', params.vaccineCode);
    backendUrl.searchParams.set('includeHistorical', params.includeHistorical.toString());

    // Fetch from backend (which handles OpenLMIS + Redis)
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, include auth token from session
        // 'Authorization': `Bearer ${sessionToken}`,
      },
      // Next.js cache configuration
      next: {
        revalidate: CACHE_REVALIDATE,
        tags: ['stock', params.lgaId || '', params.stateId || '', params.facilityId || ''].filter(Boolean),
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform data if needed (backend should handle most transformation)
    const transformedData = Array.isArray(rawData.data)
      ? rawData.data.map((item: any) => ({
          ...item,
          // Ensure all required fields are present
          expiryRisk: item.expiryRisk || calculateExpiryRisk(new Date(item.lotExpiry)),
          vvmStatus: item.vvmStatus || calculateVVMUIState(item.vvmStage),
        }))
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
      } as StockResponse,
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  } catch (error: any) {
    console.error(`[Stock API Error] Request ID: ${requestId}`, error);

    return NextResponse.json(
      {
        success: false,
        data: [],
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch stock data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          cached: false,
        },
      } as StockResponse,
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

// ============================================
// POST HANDLER (for stock updates)
// ============================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.facilityId || !body.vaccineCode || body.quantity === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_BODY',
            message: 'Missing required fields: facilityId, vaccineCode, quantity',
          },
        },
        { status: 400 }
      );
    }

    // Forward to backend API
    const response = await fetch(`${BACKEND_API_URL}/api/v1/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    // Invalidate cache
    await fetch(`${BACKEND_API_URL}/api/v1/cache/invalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pattern: `vax:stock:*`,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`[Stock API Error] POST Request ID: ${requestId}`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update stock data',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
