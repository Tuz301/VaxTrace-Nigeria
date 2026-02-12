/**
 * VaxTrace Nigeria - Alerts DTOs
 *
 * Data Transfer Objects for alert operations
 *
 * SECURITY: All inputs are sanitized to prevent SQL Injection and XSS
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { IsString, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../../common/decorators/sanitize.decorator';

// ============================================
// REQUEST DTOS
// ============================================

export class AlertQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by severity level',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;

  @ApiPropertyOptional({
    description: 'Filter by alert type',
    enum: ['STOCKOUT', 'EXPIRY', 'COLD_CHAIN', 'DAMAGE', 'QUALITY'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Sanitize()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by state',
    example: 'FCT',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Sanitize()
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by facility ID',
    example: 'facility-123',
  })
  @IsOptional()
  @IsUUID()
  @MaxLength(50)
  @Sanitize()
  facilityId?: string;

  @ApiPropertyOptional({
    description: 'Include only active (unresolved) alerts',
    example: true,
  })
  @IsOptional()
  active?: boolean | string;
}

// ============================================
// RESPONSE DTOS
// ============================================

export class AlertDto {
  @ApiProperty({
    description: 'Alert ID',
    example: 'alert-123',
  })
  id: string;

  @ApiProperty({
    description: 'Alert type',
    enum: ['STOCKOUT', 'EXPIRY', 'COLD_CHAIN', 'DAMAGE', 'QUALITY'],
  })
  type: string;

  @ApiProperty({
    description: 'Alert severity',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  severity: string;

  @ApiProperty({
    description: 'Facility ID',
    example: 'facility-123',
  })
  facilityId: string;

  @ApiProperty({
    description: 'Facility name',
    example: 'Central Hospital, Abuja',
  })
  facilityName: string;

  @ApiProperty({
    description: 'LGA name',
    example: 'AMAC',
  })
  lga: string;

  @ApiProperty({
    description: 'State name',
    example: 'FCT',
  })
  state: string;

  @ApiProperty({
    description: 'Alert message',
    example: 'BCG vaccine stockout - 0 doses remaining',
  })
  message: string;

  @ApiProperty({
    description: 'Alert creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Alert resolution timestamp',
    example: '2024-01-15T11:00:00.000Z',
  })
  resolvedAt?: string;

  @ApiPropertyOptional({
    description: 'Vaccine code (if applicable)',
    example: 'BCG',
  })
  vaccineCode?: string;

  @ApiPropertyOptional({
    description: 'Quantity affected',
    example: 0,
  })
  quantity?: number;
}

export class AlertsResponseDto {
  @ApiProperty({
    description: 'List of alerts',
    type: [AlertDto],
  })
  data: AlertDto[];

  @ApiProperty({
    description: 'Total number of alerts',
    example: 5,
  })
  count: number;

  @ApiPropertyOptional({
    description: 'Summary statistics by severity',
    type: 'object',
  })
  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
