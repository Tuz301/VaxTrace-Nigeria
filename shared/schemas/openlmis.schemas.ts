/**
 * VaxTrace Nigeria - Zod Schemas for Data Normalization
 * 
 * This module defines Zod schemas for validating and transforming
 * OpenLMIS data into VaxTrace format.
 * 
 * The "Normalizer" ensures:
 * - Data integrity (fallback values for missing fields)
 * - Type safety (string → number conversions)
 * - Business logic (MOS calculation, expiry risk)
 * - UI-ready data (stoplight status, alert triggers)
 * 
 * Using Zod provides:
 * - Runtime validation
 * - TypeScript inference
 * - Automatic error messages
 * - Schema composition
 */

import { z } from 'zod';

// ============================================
// BASE SCHEMAS
// ============================================

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid();

/**
 * Coordinate validation (must be valid lat/lng)
 */
const coordinateSchema = z
  .string()
  .transform((val) => parseFloat(val))
  .pipe(z.number().min(-90).max(90));

const longitudeSchema = z
  .string()
  .transform((val) => parseFloat(val))
  .pipe(z.number().min(-180).max(180));

/**
 * Date validation with fallback
 */
const dateSchema = z.string().transform((val) => new Date(val)).pipe(z.date());

/**
 * Numeric validation with fallback to 0
 */
const numberWithFallback = (fallback: number = 0) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') return fallback;
      if (typeof val === 'number') return val;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    });

// ============================================
// AUTH SCHEMAS
// ============================================

/**
 * OpenLMIS Token Response Schema
 */
export const OpenLMISTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.number().positive(),
  refresh_token: z.string().optional(),
  scope: z.string().default('read write'),
});

export type OpenLMISToken = z.infer<typeof OpenLMISTokenSchema>;

/**
 * VaxTrace Session Schema
 */
export const VaxTraceSessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: dateSchema,
  permissions: z.array(z.string()),
  userRole: z.enum([
    'nphcda_director',
    'state_cold_chain_officer',
    'lga_logistics_officer',
    'facility_in_charge',
    'system_admin',
  ]),
});

export type VaxTraceSession = z.infer<typeof VaxTraceSessionSchema>;

// ============================================
// STOCK DATA SCHEMAS
// ============================================

/**
 * Raw OpenLMIS Stock Card Schema
 */
const OpenLMISStockCardSchema = z.object({
  id: uuidSchema,
  stockCardId: z.string(),
  orderable: z.object({
    id: uuidSchema,
    productCode: z.string(),
    fullProductName: z.string(),
  }),
  lot: z.object({
    id: uuidSchema,
    lotCode: z.string(),
    expirationDate: z.string(),
  }),
  stockOnHand: numberWithFallback(0),
  quantity: numberWithFallback(0),
  facility: z.object({
    id: uuidSchema,
    name: z.string().default('Unknown Facility'),
    code: z.string(),
    geographicZone: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      level: z.string(),
    }),
  }),
});

/**
 * OpenLMIS Stock Response Schema
 */
export const OpenLMISStockResponseSchema = z.object({
  stockCard: z.array(OpenLMISStockCardSchema),
  pagination: z
    .object({
      totalPages: z.number(),
      totalRecords: z.number(),
    })
    .optional(),
});

export type OpenLMISStockResponse = z.infer<typeof OpenLMISStockResponseSchema>;

/**
 * VaxTrace Normalized Stock Schema
 */
export const VaxTraceStockSchema = z.object({
  nodeId: uuidSchema,
  facilityName: z.string(),
  facilityCode: z.string(),
  state: z.string(),
  lga: z.string(),
  productCode: z.string(),
  productName: z.string(),
  quantity: z.number().nonnegative(),
  lotCode: z.string(),
  lotExpiry: z.string(),
  expiryRisk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXPIRED']),
  vvmStage: z.number().int().min(1).max(4),
  vvmStatus: z.enum(['HEALTHY', 'WARNING', 'CRITICAL']),
  monthsOfStock: z.number().nonnegative(),
  lastUpdated: z.string(),
});

export type VaxTraceStock = z.infer<typeof VaxTraceStockSchema>;

// ============================================
// FACILITY MAP NODE SCHEMAS
// ============================================

/**
 * Raw OpenLMIS Facility Schema
 */
export const OpenLMISFacilitySchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string().default('Unknown Facility'),
  description: z.string().optional(),
  active: z.boolean().default(true),
  geographicZone: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    level: z.string(),
    parent: z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
      })
      .optional(),
  }),
  location: z.object({
    latitude: z.string().transform((val) => parseFloat(val)),
    longitude: z.string().transform((val) => parseFloat(val)),
  }),
  type: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  supportedPrograms: z
    .array(
      z.object({
        id: z.string(),
        code: z.string(),
      })
    )
    .optional(),
});

export type OpenLMISFacility = z.infer<typeof OpenLMISFacilitySchema>;

/**
 * VaxTrace Map Node Schema
 */
export const VaxTraceMapNodeSchema = z.object({
  id: uuidSchema,
  label: z.string(),
  code: z.string(),
  state: z.string(),
  lga: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  nodeType: z.enum(['WAREHOUSE', 'CLINIC', 'HOSPITAL', 'PHC']),
  hasColdChain: z.boolean(),
  hasRTM: z.boolean(),
  stockStatus: z.enum(['OPTIMAL', 'UNDERSTOCKED', 'STOCKOUT', 'OVERSTOCKED']),
  alertCount: z.number().nonnegative(),
  lastSync: z.string(),
});

export type VaxTraceMapNode = z.infer<typeof VaxTraceMapNodeSchema>;

// ============================================
// VVM STATUS SCHEMAS
// ============================================

/**
 * Raw OpenLMIS VVM Status Schema
 */
export const OpenLMISVVMStatusSchema = z.object({
  facilityId: uuidSchema,
  productId: uuidSchema,
  lotId: uuidSchema,
  vvmStage: z.number().int().min(1).max(4),
  lastReading: z.string(),
  deviceId: z.string().optional(),
  temperature: numberWithFallback(0),
  humidity: numberWithFallback(0),
  alerts: z.array(
    z.object({
      type: z.string(),
      message: z.string(),
      severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
    })
  ),
});

export type OpenLMISVVMStatus = z.infer<typeof OpenLMISVVMStatusSchema>;

/**
 * VaxTrace VVM Status Schema
 */
export const VaxTraceVVMStatusSchema = z.object({
  facilityId: uuidSchema,
  facilityName: z.string(),
  productId: uuidSchema,
  productName: z.string(),
  lotCode: z.string(),
  vvmStage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  uiState: z.enum(['HEALTHY', 'WARNING', 'CRITICAL']),
  temperature: z.number(),
  humidity: z.number(),
  lastReading: z.string(),
  alerts: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        'stockout',
        'near_expiry',
        'temperature_excursion',
        'vvm_stage_3',
        'vvm_stage_4',
        'power_outage',
        'delivery_delay',
      ]),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      facilityId: z.string(),
      facilityName: z.string(),
      state: z.string(),
      lga: z.string(),
      message: z.string(),
      createdAt: z.string(),
      isResolved: z.boolean(),
    })
  ),
});

export type VaxTraceVVMStatus = z.infer<typeof VaxTraceVVMStatusSchema>;

// ============================================
// REQUISITION SCHEMAS
// ============================================

/**
 * Raw OpenLMIS Requisition Schema
 */
export const OpenLMISRequisitionSchema = z.object({
  id: uuidSchema,
  program: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  facility: z.object({
    id: uuidSchema,
    name: z.string(),
    code: z.string(),
  }),
  status: z.enum([
    'INITIATED',
    'SUBMITTED',
    'AUTHORIZED',
    'APPROVED',
    'RELEASED',
    'SHIPPED',
    'RECEIVED',
    'REJECTED',
  ]),
  createdDate: z.string(),
  submittedDate: z.string().optional(),
  approvedDate: z.string().optional(),
  shippedDate: z.string().optional(),
  receivedDate: z.string().optional(),
  requisitionLines: z.array(
    z.object({
      id: z.string(),
      orderable: z.object({
        id: z.string(),
        productCode: z.string(),
        fullProductName: z.string(),
      }),
      requestedQuantity: numberWithFallback(0),
      approvedQuantity: numberWithFallback(0),
      receivedQuantity: numberWithFallback(0),
    })
  ),
});

export type OpenLMISRequisition = z.infer<typeof OpenLMISRequisitionSchema>;

/**
 * VaxTrace Requisition Schema
 */
export const VaxTraceRequisitionSchema = z.object({
  id: uuidSchema,
  facilityId: uuidSchema,
  facilityName: z.string(),
  state: z.string(),
  lga: z.string(),
  program: z.string(),
  status: z.enum([
    'INITIATED',
    'SUBMITTED',
    'AUTHORIZED',
    'APPROVED',
    'RELEASED',
    'SHIPPED',
    'RECEIVED',
    'REJECTED',
  ]),
  statusDisplay: z.string(),
  items: z.array(
    z.object({
      productCode: z.string(),
      productName: z.string(),
      requestedQuantity: z.number(),
      approvedQuantity: z.number(),
      receivedQuantity: z.number(),
      fillRate: z.number().min(0).max(1),
    })
  ),
  createdDate: z.string(),
  submittedDate: z.string().optional(),
  approvedDate: z.string().optional(),
  shippedDate: z.string().optional(),
  receivedDate: z.string().optional(),
  leadTimeDays: z.number().int().nonnegative(),
});

export type VaxTraceRequisition = z.infer<typeof VaxTraceRequisitionSchema>;

// ============================================
// WEBHOOK SCHEMAS
// ============================================

/**
 * OpenLMIS Webhook Payload Schema
 */
export const OpenLMISWebhookSchema = z.object({
  eventType: z.enum([
    'requisition.created',
    'requisition.updated',
    'requisition.approved',
    'requisition.shipped',
    'requisition.received',
    'stock.added',
    'stock.removed',
    'stock.updated',
    'facility.created',
    'facility.updated',
  ]),
  timestamp: z.string(),
  entityId: uuidSchema,
  entityType: z.enum(['REQUISITION', 'STOCK_CARD', 'FACILITY', 'ORDER']),
  data: z.record(z.any()),
  signature: z.string().optional(),
});

export type OpenLMISWebhook = z.infer<typeof OpenLMISWebhookSchema>;

// ============================================
// API RESPONSE SCHEMAS
// ============================================

/**
 * Standard API Response Schema
 */
export const VaxTraceApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: z
      .object({
        timestamp: z.string(),
        requestId: z.string().uuid(),
        version: z.string(),
      })
      .optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional(),
      })
      .optional(),
  });

/**
 * Paginated Response Schema
 */
export const VaxTracePaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().positive(),
      pageSize: z.number().positive(),
      totalRecords: z.number().nonnegative(),
      totalPages: z.number().nonnegative(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
    }),
  });

// ============================================
// TRANSFORMATION FUNCTIONS
// ============================================

/**
 * Calculate expiry risk based on days until expiry
 */
export function calculateExpiryRisk(expiryDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED' {
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'EXPIRED';
  if (daysUntilExpiry < 30) return 'HIGH';
  if (daysUntilExpiry < 90) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate VVM UI state from stage
 */
export function calculateVVMUIState(stage: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
  if (stage <= 2) return 'HEALTHY';
  if (stage === 3) return 'WARNING';
  return 'CRITICAL';
}

/**
 * Calculate stock status from months of stock
 */
export function calculateStockStatus(
  monthsOfStock: number
): 'OPTIMAL' | 'UNDERSTOCKED' | 'STOCKOUT' | 'OVERSTOCKED' {
  if (monthsOfStock === 0) return 'STOCKOUT';
  if (monthsOfStock < 3) return 'UNDERSTOCKED';
  if (monthsOfStock > 6) return 'OVERSTOCKED';
  return 'OPTIMAL';
}

/**
 * Calculate fill rate percentage
 */
export function calculateFillRate(requested: number, received: number): number {
  if (requested === 0) return 1;
  return Math.min(received / requested, 1);
}

// ============================================
// BATCH VALIDATION
// ============================================

/**
 * Validate an array of stock cards
 */
export function validateStockCards(data: unknown) {
  return z.array(OpenLMISStockCardSchema).safeParse(data);
}

/**
 * Validate an array of facilities
 */
export function validateFacilities(data: unknown) {
  return z.array(OpenLMISFacilitySchema).safeParse(data);
}

/**
 * Validate webhook payload
 */
export function validateWebhook(data: unknown) {
  return OpenLMISWebhookSchema.safeParse(data);
}
