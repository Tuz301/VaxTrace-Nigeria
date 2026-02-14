/**
 * VaxTrace Nigeria - Transfer Suggestions API Route
 *
 * This API route provides transfer suggestions to help redistribute
 * vaccines from facilities with excess stock to those with shortages.
 *
 * SECURITY: Input validation using Zod to prevent SQL Injection and XSS
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// INPUT VALIDATION SCHEMA
// ============================================

const TransferSuggestionsQuerySchema = z.object({
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  state: z.string().max(100).optional(),
  vaccineCode: z.string().max(50).optional(),
});

type TransferSuggestionsQuery = z.infer<typeof TransferSuggestionsQuerySchema>;

interface TransferSuggestion {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceFacility: {
    id: string;
    name: string;
    lga: string;
    state: string;
  };
  targetFacility: {
    id: string;
    name: string;
    lga: string;
    state: string;
  };
  vaccineCode: string;
  vaccineName: string;
  suggestedQuantity: number;
  distance: number; // in km
  estimatedTravelTime: number; // in minutes
  reason: string;
  createdAt: string;
}

// Mock transfer suggestions data for development
const mockTransferSuggestions: TransferSuggestion[] = [
  {
    id: 'transfer-1',
    priority: 'HIGH',
    sourceFacility: {
      id: 'facility-6',
      name: 'Central Medical Store, Lagos',
      lga: 'Ikeja',
      state: 'Lagos',
    },
    targetFacility: {
      id: 'facility-1',
      name: 'Central Hospital, Abuja',
      lga: 'AMAC',
      state: 'FCT',
    },
    vaccineCode: 'BCG',
    vaccineName: 'BCG Vaccine',
    suggestedQuantity: 500,
    distance: 850,
    estimatedTravelTime: 720,
    reason: 'Source has 2000+ doses expiring in 30 days, target is at critical stockout level',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'transfer-2',
    priority: 'HIGH',
    sourceFacility: {
      id: 'facility-7',
      name: 'State Vaccine Store, Kano',
      lga: 'Kano Municipal',
      state: 'Kano',
    },
    targetFacility: {
      id: 'facility-4',
      name: 'District Hospital, Ibadan',
      lga: 'Ibadan North',
      state: 'Oyo',
    },
    vaccineCode: 'OPV',
    vaccineName: 'Oral Polio Vaccine',
    suggestedQuantity: 300,
    distance: 650,
    estimatedTravelTime: 540,
    reason: 'Source has excess stock (1500 doses), target has only 50 doses remaining',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'transfer-3',
    priority: 'MEDIUM',
    sourceFacility: {
      id: 'facility-8',
      name: 'Regional Warehouse, Port Harcourt',
      lga: 'Port Harcourt',
      state: 'Rivers',
    },
    targetFacility: {
      id: 'facility-9',
      name: 'General Hospital, Benin',
      lga: 'Oredo',
      state: 'Edo',
    },
    vaccineCode: 'MEASLES',
    vaccineName: 'Measles Vaccine',
    suggestedQuantity: 200,
    distance: 180,
    estimatedTravelTime: 180,
    reason: 'Source has 800 doses with 45 days to expiry, target stock below minimum threshold',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'transfer-4',
    priority: 'MEDIUM',
    sourceFacility: {
      id: 'facility-10',
      name: 'Central Medical Store, Kaduna',
      lga: 'Kaduna North',
      state: 'Kaduna',
    },
    targetFacility: {
      id: 'facility-11',
      name: 'Primary Health Center, Sokoto',
      lga: 'Sokoto South',
      state: 'Sokoto',
    },
    vaccineCode: 'DTP',
    vaccineName: 'DTP Vaccine',
    suggestedQuantity: 150,
    distance: 420,
    estimatedTravelTime: 360,
    reason: 'Source has optimal stock levels, target experiencing moderate shortage',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'transfer-5',
    priority: 'LOW',
    sourceFacility: {
      id: 'facility-12',
      name: 'State Vaccine Store, Enugu',
      lga: 'Enugu North',
      state: 'Enugu',
    },
    targetFacility: {
      id: 'facility-13',
      name: 'District Hospital, Awka',
      lga: 'Awka South',
      state: 'Anambra',
    },
    vaccineCode: 'HEPB',
    vaccineName: 'Hepatitis B Vaccine',
    suggestedQuantity: 100,
    distance: 95,
    estimatedTravelTime: 120,
    reason: 'Preventive transfer to maintain optimal stock levels at target facility',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate and parse query parameters using Zod
    const validationResult = TransferSuggestionsQuerySchema.safeParse({
      priority: searchParams.get('priority'),
      state: searchParams.get('state'),
      vaccineCode: searchParams.get('vaccineCode'),
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
    
    const { priority, state, vaccineCode } = validationResult.data;

    // Fetch transfer suggestions from backend API
    const response = await fetch('/api/v1/transfer-suggestions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transfer suggestions from backend');
    }

    const result = await response.json();

    // Return transfer suggestions from backend
    let filteredSuggestions = result.data?.suggestions || [];

    // Apply additional filters from query parameters
    // Filter by priority
    if (priority) {
      filteredSuggestions = filteredSuggestions.filter(
        (suggestion: any) => suggestion.priority === priority
      );
    }

    // Filter by source or target state
    if (state) {
      filteredSuggestions = filteredSuggestions.filter(
        (suggestion: TransferSuggestion) =>
          suggestion.sourceFacility.state === state ||
          suggestion.targetFacility.state === state
      );
    }

    // Filter by vaccine code
    if (vaccineCode) {
      filteredSuggestions = filteredSuggestions.filter(
        (suggestion: TransferSuggestion) => suggestion.vaccineCode === vaccineCode
      );
    }

    // Sort by priority (HIGH first) and then by creation date (newest first)
    const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    filteredSuggestions.sort((a: TransferSuggestion, b: TransferSuggestion) => {
      if (a.priority !== b.priority) {
        return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      data: filteredSuggestions,
      count: filteredSuggestions.length,
    });
  } catch (error) {
    console.error('[Transfer Suggestions API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transfer suggestions',
      },
      { status: 500 }
    );
  }
}
