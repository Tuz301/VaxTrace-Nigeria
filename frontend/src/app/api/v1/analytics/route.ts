/**
 * VaxTrace Nigeria - Analytics API Route
 * 
 * This route proxies analytics requests to the backend API.
 * 
 * Features:
 * - Token abstraction (OAuth2 handled by backend)
 * - Data transformation (Backend → VaxTrace format)
 * - Cache integration (Redis)
 * - Error handling with fallback
 * - Next.js built-in revalidation
 * 
 * Routes:
 * - GET /api/v1/analytics - Get all analytics data
 * - GET /api/v1/analytics/coverage - Get vaccine coverage data
 * - GET /api/v1/analytics/performance - Get performance metrics
 * - GET /api/v1/analytics/trends - Get trend analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// CONFIGURATION
// ============================================

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CACHE_REVALIDATE = 300; // Revalidate every 5 minutes (analytics data changes less frequently)

// ============================================
// TYPES
// ============================================

interface CoverageData {
  state: string;
  lga: string;
  targetPopulation: number;
  vaccinatedPopulation: number;
  coverageRate: number;
  vaccineType: string;
  period: string;
}

interface PerformanceMetrics {
  category: string;
  metric: string;
  value: number;
  target: number;
  variance: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  period: string;
}

interface TrendData {
  date: string;
  metric: string;
  value: number;
  category: string;
}

interface AnalyticsResponse {
  success: boolean;
  data: {
    coverage: CoverageData[];
    performance: PerformanceMetrics[];
    trends: TrendData[];
  };
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
  state: z.string().optional(),
  lga: z.string().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  category: z.enum(['coverage', 'performance', 'trends', 'all']).default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
        } as AnalyticsResponse,
        { status: 400 }
      );
    }

    const params = queryParams.data;

    // Build backend API URL
    const backendUrl = new URL(`${BACKEND_API_URL}/api/v1/analytics`);
    
    if (params.state) backendUrl.searchParams.set('state', params.state);
    if (params.lga) backendUrl.searchParams.set('lga', params.lga);
    if (params.period) backendUrl.searchParams.set('period', params.period);
    if (params.category) backendUrl.searchParams.set('category', params.category);
    if (params.startDate) backendUrl.searchParams.set('startDate', params.startDate);
    if (params.endDate) backendUrl.searchParams.set('endDate', params.endDate);

    // Fetch from backend
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: CACHE_REVALIDATE,
        tags: ['analytics', params.period, params.category || ''].filter(Boolean),
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform data
    const transformedData = rawData.data || {
      coverage: [],
      performance: [],
      trends: [],
    };

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
      } as AnalyticsResponse,
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  } catch (error: any) {
    console.error(`[Analytics API Error] Request ID: ${requestId}`, error);
    return NextResponse.json(
      {
        success: false,
        data: {
          coverage: [],
          performance: [],
          trends: [],
        },
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          cached: false,
        },
      } as AnalyticsResponse,
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
