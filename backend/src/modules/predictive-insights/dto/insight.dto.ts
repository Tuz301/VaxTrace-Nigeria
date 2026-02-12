/**
 * VaxTrace Nigeria - Predictive Insights DTOs
 *
 * Data Transfer Objects for predictive insight operations
 *
 * SECURITY: All inputs are sanitized to prevent SQL Injection and XSS
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../../common/decorators/sanitize.decorator';

// ============================================
// REQUEST DTOS
// ============================================

export class InsightQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by risk level',
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Sanitize()
  riskLevel?: string;

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
  @IsString()
  @MaxLength(100)
  @Sanitize()
  facilityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by product/vaccine code',
    example: 'BCG',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Sanitize()
  productId?: string;
}

// ============================================
// RESPONSE DTOS
// ============================================

export class PredictiveInsightDto {
  @ApiProperty({
    description: 'Insight ID',
    example: 'insight-123',
  })
  id: string;

  @ApiProperty({
    description: 'Facility ID',
    example: 'facility-1',
  })
  facilityId: string;

  @ApiProperty({
    description: 'Facility name',
    example: 'Central Hospital, Abuja',
  })
  facilityName: string;

  @ApiProperty({
    description: 'Product/Vaccine code',
    example: 'BCG',
  })
  productId: string;

  @ApiProperty({
    description: 'Product/Vaccine name',
    example: 'BCG Vaccine',
  })
  productName: string;

  @ApiProperty({
    description: 'Prediction text',
    example: 'Based on current consumption rate, BCG vaccine stock will be depleted within 3 days.',
  })
  prediction: string;

  @ApiProperty({
    description: 'Expected event date',
    example: '2024-01-18T00:00:00.000Z',
  })
  expectedDate: string;

  @ApiProperty({
    description: 'Confidence level (0-100)',
    example: 95,
    minimum: 0,
    maximum: 100,
  })
  confidence: number;

  @ApiProperty({
    description: 'Risk level',
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  })
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export class InsightsResponseDto {
  @ApiProperty({
    description: 'List of predictive insights',
    type: [PredictiveInsightDto],
  })
  data: PredictiveInsightDto[];

  @ApiProperty({
    description: 'Total number of insights',
    example: 6,
  })
  count: number;
}
