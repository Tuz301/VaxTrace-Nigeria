/**
 * VaxTrace Nigeria - OpenLMIS Type Definitions
 * 
 * This module defines the TypeScript types for OpenLMIS integration.
 * These types map OpenLMIS responses to VaxTrace internal structures.
 * 
 * Data Flow: OpenLMIS → Normalizer → VaxTrace → Frontend
 */

// ============================================
// OPENLMIS AUTH TYPES
// ============================================

/**
 * OAuth2 Token Response from OpenLMIS
 */
export interface OpenLMISTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/**
 * VaxTrace Session Token (stored in HTTP-only cookie)
 */
export interface VaxTraceSession {
  token: string;
  expiresAt: Date;
  permissions: string[];
  userRole: UserRole;
}

// ============================================
// USER ROLE ENUMS (RBAC)
// ============================================

export enum UserRole {
  NATIONAL_DIRECTOR = 'nphcda_director',
  STATE_COLD_CHAIN_OFFICER = 'state_cold_chain_officer',
  LGA_LOGISTICS_OFFICER = 'lga_logistics_officer',
  FACILITY_IN_CHARGE = 'facility_in_charge',
  SYSTEM_ADMIN = 'system_admin',
}

export interface UserPermissions {
  canViewNational: boolean;
  canViewState: boolean;
  canViewLGA: boolean;
  canViewFacility: boolean;
  canEditStock: boolean;
  canEditUsers: boolean;
  canViewReports: boolean;
}

// ============================================
// OPENLMIS STOCK TYPES
// ============================================

/**
 * Raw OpenLMIS Stock on Hand Response
 */
export interface OpenLMISStockOnHandResponse {
  stockCard: {
    id: string;
    stockCardId: string;
    orderable: {
      id: string;
      productCode: string;
      fullProductName: string;
    };
    lot: {
      id: string;
      lotCode: string;
      expirationDate: string;
    };
    stockOnHand: number;
    quantity: number;
    facility: {
      id: string;
      name: string;
      code: string;
      geographicZone: {
        id: string;
        code: string;
        name: string;
        level: string;
      };
    };
  }[];
  pagination?: {
    totalPages: number;
    totalRecords: number;
  };
}

/**
 * VaxTrace Normalized Stock Data
 */
export interface VaxTraceStockData {
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

// ============================================
// OPENLMIS FACILITY TYPES
// ============================================

/**
 * Raw OpenLMIS Facility Response
 */
export interface OpenLMISFacilityResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  geographicZone: {
    id: string;
    code: string;
    name: string;
    level: string;
    parent?: {
      id: string;
      code: string;
      name: string;
    };
  };
  location: {
    latitude: string;
    longitude: string;
  };
  type: {
    id: string;
    code: string;
    name: string;
  };
  supportedPrograms: Array<{
    id: string;
    code: string;
  }>;
}

/**
 * VaxTrace Normalized Facility (Map Node)
 */
export interface VaxTraceMapNode {
  id: string;
  label: string;
  code: string;
  state: string;
  lga: string;
  lat: number;
  lng: number;
  nodeType: 'WAREHOUSE' | 'CLINIC' | 'HOSPITAL' | 'PHC';
  hasColdChain: boolean;
  hasRTM: boolean;
  stockStatus: 'OPTIMAL' | 'UNDERSTOCKED' | 'STOCKOUT' | 'OVERSTOCKED';
  alertCount: number;
  lastSync: string;
}

// ============================================
// OPENLMIS VVM STATUS TYPES
// ============================================

/**
 * Raw OpenLMIS VVM Status Response
 */
export interface OpenLMISVVMStatusResponse {
  facilityId: string;
  productId: string;
  lotId: string;
  vvmStage: number;
  lastReading: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  alerts: Array<{
    type: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
  }>;
}

/**
 * VaxTrace Normalized VVM Status
 */
export interface VaxTraceVVMStatus {
  facilityId: string;
  facilityName: string;
  productId: string;
  productName: string;
  lotCode: string;
  vvmStage: 1 | 2 | 3 | 4;
  uiState: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  temperature: number;
  humidity: number;
  lastReading: string;
  alerts: VaxTraceAlert[];
}

// ============================================
// ALERT TYPES
// ============================================

export interface VaxTraceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  facilityId: string;
  facilityName: string;
  state: string;
  lga: string;
  message: string;
  createdAt: string;
  isResolved: boolean;
}

export enum AlertType {
  STOCKOUT = 'stockout',
  NEAR_EXPIRY = 'near_expiry',
  TEMPERATURE_EXCURSION = 'temperature_excursion',
  VVM_STAGE_3 = 'vvm_stage_3',
  VVM_STAGE_4 = 'vvm_stage_4',
  POWER_OUTAGE = 'power_outage',
  DELIVERY_DELAY = 'delivery_delay',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ============================================
// REQUISITION TYPES
// ============================================

/**
 * Raw OpenLMIS Requisition Response
 */
export interface OpenLMISRequisitionResponse {
  id: string;
  program: {
    id: string;
    code: string;
    name: string;
  };
  facility: {
    id: string;
    name: string;
    code: string;
  };
  status: RequisitionStatus;
  createdDate: string;
  submittedDate: string;
  approvedDate: string;
  shippedDate: string;
  receivedDate: string;
  requisitionLines: Array<{
    id: string;
    orderable: {
      id: string;
      productCode: string;
      fullProductName: string;
    };
    requestedQuantity: number;
    approvedQuantity: number;
    receivedQuantity: number;
  }>;
}

export enum RequisitionStatus {
  INITIATED = 'INITIATED',
  SUBMITTED = 'SUBMITTED',
  AUTHORIZED = 'AUTHORIZED',
  APPROVED = 'APPROVED',
  RELEASED = 'RELEASED',
  SHIPPED = 'SHIPPED',
  RECEIVED = 'RECEIVED',
  REJECTED = 'REJECTED',
}

/**
 * VaxTrace Normalized Requisition
 */
export interface VaxTraceRequisition {
  id: string;
  facilityId: string;
  facilityName: string;
  state: string;
  lga: string;
  program: string;
  status: RequisitionStatus;
  statusDisplay: string;
  items: VaxTraceRequisitionItem[];
  createdDate: string;
  submittedDate: string;
  approvedDate: string;
  shippedDate: string;
  receivedDate: string;
  leadTimeDays: number;
}

export interface VaxTraceRequisitionItem {
  productCode: string;
  productName: string;
  requestedQuantity: number;
  approvedQuantity: number;
  receivedQuantity: number;
  fillRate: number;
}

// ============================================
// WEBHOOK TYPES
// ============================================

/**
 * OpenLMIS Webhook Payload
 */
export interface OpenLMISWebhookPayload {
  eventType: WebhookEventType;
  timestamp: string;
  entityId: string;
  entityType: 'REQUISITION' | 'STOCK_CARD' | 'FACILITY' | 'ORDER';
  data: Record<string, unknown>;
  signature?: string;
}

export enum WebhookEventType {
  REQUISITION_CREATED = 'requisition.created',
  REQUISITION_UPDATED = 'requisition.updated',
  REQUISITION_APPROVED = 'requisition.approved',
  REQUISITION_SHIPPED = 'requisition.shipped',
  REQUISITION_RECEIVED = 'requisition.received',
  STOCK_ADDED = 'stock.added',
  STOCK_REMOVED = 'stock.removed',
  STOCK_UPDATED = 'stock.updated',
  FACILITY_CREATED = 'facility.created',
  FACILITY_UPDATED = 'facility.updated',
}

// ============================================
// API RESPONSE WRAPPERS
// ============================================

/**
 * Standard VaxTrace API Response
 */
export interface VaxTraceApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Paginated Response
 */
export interface VaxTracePaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ============================================
// CACHE TYPES
// ============================================

/**
 * Redis Cache Entry
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
}

/**
 * Cache Invalidation Event
 */
export interface CacheInvalidationEvent {
  pattern: string;
  keys: string[];
  timestamp: Date;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Deep partial type (all properties optional recursively)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Required keys
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Nullable fields
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
