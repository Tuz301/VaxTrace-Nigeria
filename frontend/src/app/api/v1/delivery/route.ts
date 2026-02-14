/**
 * VaxTrace Nigeria - Delivery API Route
 * 
 * This route proxies delivery requests to the backend API.
 * 
 * Features:
 * - Token abstraction (OAuth2 handled by backend)
 * - Data transformation (Backend → VaxTrace format)
 * - Cache integration (Redis)
 * - Error handling with fallback
 * - Next.js built-in revalidation
 * 
 * Routes:
 * - GET /api/v1/delivery - Get all deliveries
 * - GET /api/v1/delivery/:id - Get delivery by ID
 * - GET /api/v1/delivery/transfer/:transferId - Get deliveries by transfer ID
 * - POST /api/v1/delivery/confirm - Confirm delivery
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// CONFIGURATION
// ============================================

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CACHE_REVALIDATE = 30; // Revalidate every 30 seconds

// ============================================
// TYPES
// ============================================

interface DeliveryData {
  id: string;
  transferId: string;
  facilityId: string;
  facilityName: string;
  state: string;
  lga: string;
  vaccineName: string;
  quantity: number;
  qrCode: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  estimatedDeliveryTime: string;
  actualDeliveryTime: string | null;
  deliveryPerson: string | null;
  temperature: number | null;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryResponse {
  success: boolean;
  data: DeliveryData[];
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

interface ConfirmDeliveryBody {
  qrCodeId: string;
  facilityId: string;
  deliveredBy: string;
  temperature: number;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  notes?: string;
}

interface ConfirmDeliveryResponse {
  success: boolean;
  data?: {
    deliveryId: string;
    status: string;
    confirmedAt: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================
// SCHEMAS
// ============================================

const ConfirmDeliverySchema = z.object({
  qrCodeId: z.string().min(1, 'QR Code ID is required'),
  facilityId: z.string().uuid('Invalid facility ID'),
  deliveredBy: z.string().min(1, 'Delivery person name is required'),
  temperature: z.number().min(-50).max(50, 'Temperature must be between -50 and 50'),
  vvmStatus: z.enum(['HEALTHY', 'WARNING', 'CRITICAL']),
  notes: z.string().optional(),
});

// ============================================
// HANDLER
// ============================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse URL to get delivery ID or transfer ID
    const { searchParams } = new URL(request.url);
    const pathSegments = request.url?.split('/').filter(Boolean) || [];
    const lastSegment = pathSegments[pathSegments.length - 1];

    let backendUrl = new URL(`${BACKEND_API_URL}/api/v1/delivery`);

    // If specific delivery ID is requested
    if (lastSegment && lastSegment !== 'delivery') {
      if (lastSegment === 'confirm') {
        // POST request for confirmation
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Use POST method for /confirm endpoint',
            },
          } as DeliveryResponse,
          { status: 405 }
        );
      }
      // Check if it's a transfer ID
      const transferMatch = lastSegment.match(/transfer\/(.+)/);
      if (transferMatch) {
        const transferId = transferMatch[1];
        backendUrl = new URL(`${BACKEND_API_URL}/api/v1/delivery/transfer/${transferId}`);
      } else {
        // It's a delivery ID
        backendUrl = new URL(`${BACKEND_API_URL}/api/v1/delivery/${lastSegment}`);
      }
    }

    // Fetch from backend
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: CACHE_REVALIDATE,
        tags: ['delivery'],
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
      } as DeliveryResponse,
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  } catch (error: any) {
    console.error(`[Delivery API Error] Request ID: ${requestId}`, error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch delivery data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          cached: false,
        },
      } as DeliveryResponse,
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
// POST HANDLER (for delivery confirmation)
// ============================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = ConfirmDeliverySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validationResult.error.errors,
          },
        } as ConfirmDeliveryResponse,
        { status: 400 }
      );
    }

    const confirmData = validationResult.data;

    // Forward to backend API
    const response = await fetch(`${BACKEND_API_URL}/api/v1/delivery/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(confirmData),
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
        pattern: `vax:delivery:*`,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        data,
      } as ConfirmDeliveryResponse,
      {
        status: 201,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  } catch (error: any) {
    console.error(`[Delivery API Error] POST Request ID: ${requestId}`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to confirm delivery',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      } as ConfirmDeliveryResponse,
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
