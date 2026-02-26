/**
 * VaxTrace Nigeria - Facility Detail API Route
 *
 * This API route provides detailed information about a specific facility.
 * It proxies to the backend OpenLMIS service with fallback to mock data.
 *
 * Route: GET /api/v1/facility/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Backend URL configuration (matches other API routes)
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CACHE_REVALIDATE = 60; // Revalidate every 60 seconds

// ============================================
// TYPES
// ============================================

interface FacilityStockData {
  productName: string;
  stockStatus: string;
  quantity: number;
  mos: number;
  expiryDate: string;
  vvmStage: number;
  batchNumber: string;
}

interface FacilityCCEData {
  equipmentType: string;
  model: string;
  serialNumber: string;
  currentTemp: number;
  minTemp: number;
  maxTemp: number;
  status: string;
  lastMaintenance: string;
}

interface FacilityAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  createdAt: string;
}

interface FacilityDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  state: string;
  lga: string;
  ward: string;
  address: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  catchmentPopulation: number;
  hasColdChain: boolean;
  hasGenerator: boolean;
  hasSolar: boolean;
  inCharge: string;
  stockData: FacilityStockData[];
  cceData: FacilityCCEData[];
  alerts: FacilityAlert[];
}

// ============================================
// MOCK DATA GENERATORS
// ============================================

const facilityTypes = [
  'Primary Health Center',
  'Dispensary',
  'Health Post',
  'MCH Center',
  'General Hospital',
  'Clinic',
  'Comprehensive Health Center',
  'Primary Health Care Centre',
];

const wards = [
  'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5',
  'Central Ward', 'North Ward', 'South Ward', 'East Ward', 'West Ward',
];

const products = [
  { name: 'BCG', code: 'BCG' },
  { name: 'OPV', code: 'OPV' },
  { name: 'Pentavalent', code: 'PENTA' },
  { name: 'PCV', code: 'PCV' },
  { name: 'Rotavirus', code: 'ROTA' },
  { name: 'Measles', code: 'MEASLES' },
  { name: 'Yellow Fever', code: 'YF' },
  { name: 'TT', code: 'TT' },
];

const stockStatuses = ['ADEQUATE', 'LOW', 'CRITICAL', 'OVERSTOCKED'];

const equipmentTypes = [
  { type: 'SOLAR_REFRIGERATOR', model: 'SIRL-200' },
  { type: 'ICE_LINED_REFRIGERATOR', model: 'ILR-150' },
  { type: 'WALK_IN_COLD_ROOM', model: 'WICR-500' },
  { type: 'FREEZER', model: 'CF-450' },
];

const alertTypes = [
  { type: 'STOCKOUT', severity: 'CRITICAL', message: 'Stock depleted - immediate replenishment required' },
  { type: 'EXPIRY', severity: 'HIGH', message: 'Batch expiring in 30 days' },
  { type: 'COLD_CHAIN', severity: 'MEDIUM', message: 'Temperature fluctuation detected' },
  { type: 'LOW_STOCK', severity: 'HIGH', message: 'Stock below 1 month supply' },
  { type: 'DAMAGE', severity: 'MEDIUM', message: 'Vaccine vials damaged during transport' },
];

// Generate mock stock data
function generateStockData(): FacilityStockData[] {
  const numProducts = Math.floor(Math.random() * 5) + 3; // 3-7 products
  return Array.from({ length: numProducts }, (_, i) => {
    const product = products[i % products.length];
    const stockStatus = stockStatuses[Math.floor(Math.random() * stockStatuses.length)];
    const quantity = Math.floor(Math.random() * 500) + 50;
    const mos = Math.floor(Math.random() * 6) + 1;
    
    // Generate expiry date within 1-180 days
    const expiryDate = new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    return {
      productName: product.name,
      stockStatus,
      quantity,
      mos,
      expiryDate,
      vvmStage: Math.floor(Math.random() * 2) + 1,
      batchNumber: `BATCH-${product.code}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    };
  });
}

// Generate mock CCE data
function generateCCEData(): FacilityCCEData[] {
  const numEquipment = Math.floor(Math.random() * 3) + 1; // 1-3 equipment
  return Array.from({ length: numEquipment }, (_, i) => {
    const equipment = equipmentTypes[i % equipmentTypes.length];
    const currentTemp = 2 + Math.random() * 6; // 2-8°C
    
    return {
      equipmentType: equipment.type,
      model: equipment.model,
      serialNumber: `SN-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
      currentTemp: parseFloat(currentTemp.toFixed(1)),
      minTemp: 2.0,
      maxTemp: 8.0,
      status: currentTemp > 8 ? 'ALERT' : currentTemp < 2 ? 'ALERT' : 'NORMAL',
      lastMaintenance: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };
  });
}

// Generate mock alerts
function generateAlerts(facilityName: string): FacilityAlert[] {
  const numAlerts = Math.floor(Math.random() * 4); // 0-3 alerts
  return Array.from({ length: numAlerts }, (_, i) => {
    const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    return {
      id: `alert-${Date.now()}-${i}`,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}

// Generate mock facility data based on ID
function generateMockFacility(id: string): FacilityDetail | null {
  // Extract numeric part from ID (e.g., "fac-1" -> 1)
  const match = id.match(/fac-(\d+)/);
  if (!match) {
    return null;
  }
  
  const facilityNum = parseInt(match[1], 10);
  const facilityType = facilityTypes[facilityNum % facilityTypes.length];
  const ward = wards[facilityNum % wards.length];
  
  // Generate coordinates (roughly within Nigeria bounds)
  const baseLat = 9.0 + (facilityNum % 7) * 1.5;
  const baseLng = 7.0 + (facilityNum % 10) * 1.2;
  
  // Generate a random LGA and state
  const states = [
    { name: 'Lagos', lgas: ['Ikeja', 'Alimosho', 'Ikorodu', 'Eti-Osa'] },
    { name: 'FCT', lgas: ['AMAC', 'Bwari', 'Gwagwalada', 'Kuje'] },
    { name: 'Kano', lgas: ['Kano Municipal', 'Nassarawa', 'Fagge', 'Dala'] },
    { name: 'Rivers', lgas: ['Port Harcourt', 'Obio-Akpor', 'Eleme', 'Oyigbo'] },
    { name: 'Oyo', lgas: ['Ibadan North', 'Ibadan South', 'Oyo Town', 'Ogbomosho'] },
  ];
  
  const stateInfo = states[facilityNum % states.length];
  const lga = stateInfo.lgas[facilityNum % stateInfo.lgas.length];
  
  return {
    id,
    name: `${facilityType} ${lga}`,
    code: `${facilityType.substring(0, 3).toUpperCase()}-${lga.substring(0, 3).toUpperCase()}-${String(facilityNum).padStart(3, '0')}`,
    type: facilityType,
    state: stateInfo.name,
    lga,
    ward,
    address: `${Math.floor(Math.random() * 999) + 1} ${ward}, ${lga}, ${stateInfo.name}`,
    phone: `+234 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    email: `info@${lga.toLowerCase().replace(/\s+/g, '-')}-health.gov.ng`,
    latitude: parseFloat((baseLat + Math.random() * 0.5).toFixed(6)),
    longitude: parseFloat((baseLng + Math.random() * 0.5).toFixed(6)),
    catchmentPopulation: Math.floor(Math.random() * 50000) + 10000,
    hasColdChain: Math.random() > 0.3, // 70% have cold chain
    hasGenerator: Math.random() > 0.5, // 50% have generator
    hasSolar: Math.random() > 0.6, // 40% have solar
    inCharge: `Dr. ${['Adebayo', 'Chukwu', 'Mohammed', 'Okon', 'Okafor'][facilityNum % 5]}`,
    stockData: generateStockData(),
    cceData: generateCCEData(),
    alerts: generateAlerts(`${facilityType} ${lga}`),
  };
}

// ============================================
// BACKEND API PROXY
// ============================================

/**
 * Fetch facility from backend OpenLMIS service
 */
async function fetchFacilityFromBackend(id: string): Promise<FacilityDetail | null> {
  try {
    // The backend has /api/v1/openlmis/facilities endpoint
    // We'll fetch all facilities and filter by ID
    const backendUrl = new URL(`${BACKEND_API_URL}/api/v1/openlmis/facilities`);
    
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control
      next: {
        revalidate: CACHE_REVALIDATE,
        tags: ['facilities', id],
      },
    });

    if (!response.ok) {
      console.error(`Backend returned ${response.status} for facilities endpoint`);
      throw new Error(`Backend API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Find the facility by ID in the response
    const facilities = result.data?.facilities || result.data || [];
    const facility = facilities.find((f: any) => f.id === id || f.code === id);
    
    if (!facility) {
      return null;
    }

    // Transform backend facility data to our format
    return {
      id: facility.id || id,
      name: facility.name || 'Unknown Facility',
      code: facility.code || 'N/A',
      type: facility.type || 'Health Center',
      state: facility.state || 'Unknown State',
      lga: facility.lga || facility.geographicZone || 'Unknown LGA',
      ward: facility.ward || 'N/A',
      address: facility.address || 'N/A',
      phone: facility.phone || 'N/A',
      email: facility.email || 'N/A',
      latitude: facility.latitude || facility.location?.latitude || 0,
      longitude: facility.longitude || facility.location?.longitude || 0,
      catchmentPopulation: facility.catchmentPopulation || 0,
      hasColdChain: facility.hasColdChain ?? false,
      hasGenerator: facility.hasGenerator ?? false,
      hasSolar: facility.hasSolar ?? false,
      inCharge: facility.inCharge || 'N/A',
      stockData: facility.stockData || [],
      cceData: facility.cceData || [],
      alerts: facility.alerts || [],
    };
  } catch (error) {
    console.error('Error fetching facility from backend:', error);
    return null; // Return null to trigger mock data fallback
  }
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate facility ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid facility ID',
        },
        { status: 400 }
      );
    }
    
    // Try to fetch from backend OpenLMIS service first
    let facility = await fetchFacilityFromBackend(id);
    let dataSource = 'backend';
    
    // Fall back to mock data if backend fails or facility not found
    if (!facility) {
      console.log(`Facility ${id} not found in backend, using mock data for development`);
      facility = generateMockFacility(id);
      dataSource = 'mock';
    }
    
    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          error: 'Facility not found',
          message: `Facility with ID '${id}' does not exist`,
        },
        { status: 404 }
      );
    }
    
    // Return facility data
    return NextResponse.json(
      {
        success: true,
        data: facility,
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          source: dataSource,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_REVALIDATE}, stale-while-revalidate=30`,
        },
      }
    );
  } catch (error) {
    console.error('Error in facility API route:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
