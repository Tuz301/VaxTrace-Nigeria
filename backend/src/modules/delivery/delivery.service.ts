/**
 * VaxTrace Nigeria - Delivery Service
 *
 * Handles delivery confirmation and tracking for field operations.
 * Integrates with LMD (Last-Mile Delivery) module for
 * offline-captured delivery data synchronization.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import {
  ConfirmDeliveryDto,
  DeliveryConfirmationResponseDto,
} from './dto/delivery.dto';

// ============================================
// INTERFACES & TYPES
// ============================================

interface DeliveryRecord {
  id: string;
  qrCodeId: string;
  transferId: string;
  vvmStage: number;
  temperature: number;
  notes?: string;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
  };
  confirmedAt: string;
  status: 'CONFIRMED' | 'REJECTED' | 'PENDING';
  facilityId?: string;
  facilityName?: string;
}

// ============================================
// ============================================
// TYPES EXPORTS
// ============================================

export type { DeliveryRecord };

// ============================================
// MOCK DELIVERY DATABASE
// ============================================

// In production, this would be replaced with actual database queries
const MOCK_DELIVERIES: DeliveryRecord[] = [];

// ============================================
// DELIVERY SERVICE
// ============================================

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.logger.log('Delivery Service initialized');
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Confirm delivery from QR scan
   */
  async confirmDelivery(
    confirmDto: ConfirmDeliveryDto,
  ): Promise<DeliveryConfirmationResponseDto> {
    this.logger.log(
      `Delivery confirmation for QR: ${confirmDto.qrCodeId}, Transfer: ${confirmDto.transferId}`,
    );

    // Validate VVM stage (1-4)
    if (confirmDto.vvmStage < 1 || confirmDto.vvmStage > 4) {
      throw new Error('Invalid VVM stage. Must be between 1 and 4.');
    }

    // Validate temperature (typical cold chain: 2°C to 8°C)
    if (confirmDto.temperature < -10 || confirmDto.temperature > 15) {
      this.logger.warn(
        `Suspicious temperature: ${confirmDto.temperature}°C for delivery ${confirmDto.qrCodeId}`,
      );
    }

    // Create delivery record
    const deliveryRecord: DeliveryRecord = {
      id: randomUUID(),
      qrCodeId: confirmDto.qrCodeId,
      transferId: confirmDto.transferId,
      vvmStage: confirmDto.vvmStage,
      temperature: confirmDto.temperature,
      notes: confirmDto.notes,
      timestamp: confirmDto.timestamp,
      location: confirmDto.location,
      confirmedAt: new Date().toISOString(),
      status: 'CONFIRMED',
      facilityId: 'FAC-001', // In production, derive from user context
      facilityName: 'Demo Facility',
    };

    // Store delivery record (in production, save to database)
    MOCK_DELIVERIES.push(deliveryRecord);

    // Determine VVM status based on stage
    const vvmStatus = this.getVVMStatus(confirmDto.vvmStage);

    // Determine temperature status
    const temperatureStatus = this.getTemperatureStatus(confirmDto.temperature);

    this.logger.log(
      `Delivery confirmed successfully: ${deliveryRecord.id} (VVM: ${vvmStatus}, Temp: ${temperatureStatus})`,
    );

    return {
      confirmationId: deliveryRecord.id,
      transferId: confirmDto.transferId,
      status: 'CONFIRMED',
      confirmedAt: deliveryRecord.confirmedAt,
      meta: {
        facilityId: deliveryRecord.facilityId,
        facilityName: deliveryRecord.facilityName,
        vvmStatus,
        temperatureStatus,
      },
    };
  }

  /**
   * Get delivery by ID
   */
  async getDelivery(deliveryId: string): Promise<DeliveryRecord | null> {
    this.logger.debug(`Fetching delivery: ${deliveryId}`);
    return MOCK_DELIVERIES.find((d) => d.id === deliveryId) || null;
  }

  /**
   * Get deliveries by transfer ID
   */
  async getDeliveriesByTransfer(transferId: string): Promise<DeliveryRecord[]> {
    this.logger.debug(`Fetching deliveries for transfer: ${transferId}`);
    return MOCK_DELIVERIES.filter((d) => d.transferId === transferId);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Get VVM status description based on stage
   */
  private getVVMStatus(stage: number): string {
    if (stage === 1) return 'STAGE_1_OK';
    if (stage === 2) return 'STAGE_2_OK';
    if (stage === 3) return 'STAGE_3_WARNING';
    if (stage === 4) return 'STAGE_4_CRITICAL';
    return 'UNKNOWN';
  }

  /**
   * Get temperature status description
   */
  private getTemperatureStatus(temp: number): string {
    if (temp < 2) return 'TOO_COLD';
    if (temp > 8) return 'TOO_HOT';
    return 'OPTIMAL';
  }
}
