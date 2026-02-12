/**
 * VaxTrace Nigeria - Alerts Service
 *
 * Handles alert generation, tracking, and management.
 * Integrates with stock data and VVM status to generate
 * actionable alerts for vaccine supply chain.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { AlertDto, AlertQueryDto, AlertsResponseDto } from './dto/alert.dto';

// ============================================
// INTERFACES & TYPES
// ============================================

interface AlertRecord {
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

// ============================================
// MOCK ALERTS DATABASE
// ============================================

// In production, this would be replaced with actual database queries
const MOCK_ALERTS: AlertRecord[] = [
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

// ============================================
// ALERTS SERVICE
// ============================================

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Alerts Service initialized');
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Get alerts with optional filtering
   */
  async getAlerts(query: AlertQueryDto = {}): Promise<AlertsResponseDto> {
    this.logger.debug(`Fetching alerts with query: ${JSON.stringify(query)}`);

    let filteredAlerts = [...MOCK_ALERTS];

    // Filter by active status
    if (query.active === true || query.active === 'true') {
      filteredAlerts = filteredAlerts.filter((alert) => !alert.resolvedAt);
    }

    // Filter by severity
    if (query.severity) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.severity === query.severity);
    }

    // Filter by type
    if (query.type) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.type === query.type);
    }

    // Filter by state
    if (query.state) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.state === query.state);
    }

    // Sort by severity (CRITICAL first) and then by creation date (newest first)
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filteredAlerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate summary
    const summary = {
      critical: filteredAlerts.filter((a) => a.severity === 'CRITICAL').length,
      high: filteredAlerts.filter((a) => a.severity === 'HIGH').length,
      medium: filteredAlerts.filter((a) => a.severity === 'MEDIUM').length,
      low: filteredAlerts.filter((a) => a.severity === 'LOW').length,
    };

    this.logger.log(`Returning ${filteredAlerts.length} alerts`);

    return {
      data: filteredAlerts.map((alert) => this.toAlertDto(alert)),
      count: filteredAlerts.length,
      summary,
    };
  }

  /**
   * Get active alerts (unresolved)
   */
  async getActiveAlerts(query: AlertQueryDto = {}): Promise<AlertsResponseDto> {
    return this.getAlerts({ ...query, active: true });
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<AlertDto | null> {
    this.logger.debug(`Fetching alert: ${alertId}`);
    const alert = MOCK_ALERTS.find((a) => a.id === alertId);
    return alert ? this.toAlertDto(alert) : null;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    this.logger.log(`Resolving alert: ${alertId}`);
    const alert = MOCK_ALERTS.find((a) => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date().toISOString();
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private toAlertDto(alert: AlertRecord): AlertDto {
    return {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      facilityId: alert.facilityId,
      facilityName: alert.facilityName,
      lga: alert.lga,
      state: alert.state,
      message: alert.message,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
      vaccineCode: alert.vaccineCode,
      quantity: alert.quantity,
    };
  }
}
