/**
 * VaxTrace Nigeria - Delivery DTOs
 *
 * Data Transfer Objects for delivery confirmation operations
 *
 * SECURITY: All inputs are sanitized to prevent SQL Injection and XSS
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../../common/decorators/sanitize.decorator';

// ============================================
// REQUEST DTOS
// ============================================

export class ConfirmDeliveryDto {
  @ApiProperty({
    description: 'QR Code ID from the scanned delivery',
    example: 'QR-DEL-12345',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Sanitize()
  qrCodeId: string;

  @ApiProperty({
    description: 'Transfer ID associated with this delivery',
    example: 'transfer-abc-123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Sanitize()
  transferId: string;

  @ApiProperty({
    description: 'VVM (Vaccine Vial Monitor) stage (1-4)',
    example: 2,
    minimum: 1,
    maximum: 4,
  })
  @IsNumber()
  @Min(1)
  @Max(4)
  vvmStage: number;

  @ApiProperty({
    description: 'Temperature recorded at delivery (in Celsius)',
    example: 4.5,
  })
  @IsNumber()
  @Min(-50)
  @Max(50)
  temperature: number;

  @ApiPropertyOptional({
    description: 'Additional notes about the delivery',
    example: 'Delivery completed successfully, no issues',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @Sanitize()
  notes?: string;

  @ApiProperty({
    description: 'Timestamp of delivery confirmation',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @ApiPropertyOptional({
    description: 'GPS location of delivery confirmation',
    example: { lat: 9.0765, lng: 7.3986 },
    type: 'object',
  })
  @IsOptional()
  location?: {
    lat: number;
    lng: number;
  };
}

// ============================================
// RESPONSE DTOS
// ============================================

export class DeliveryConfirmationResponseDto {
  @ApiProperty({
    description: 'Confirmation ID',
    example: 'conf-abc-123',
  })
  confirmationId: string;

  @ApiProperty({
    description: 'Transfer ID',
    example: 'transfer-abc-123',
  })
  transferId: string;

  @ApiProperty({
    description: 'Delivery status',
    example: 'CONFIRMED',
    enum: ['CONFIRMED', 'REJECTED', 'PENDING'],
  })
  status: string;

  @ApiProperty({
    description: 'Confirmation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  confirmedAt: string;

  @ApiProperty({
    description: 'Additional metadata',
    type: 'object',
  })
  meta?: {
    facilityId?: string;
    facilityName?: string;
    vvmStatus?: string;
    temperatureStatus?: string;
  };
}
