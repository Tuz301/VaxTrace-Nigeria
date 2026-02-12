/**
 * VaxTrace Nigeria - LMD (Last-Mile Delivery) DTOs
 *
 * Data Transfer Objects for LMD record synchronization
 *
 * SECURITY: All inputs are sanitized to prevent SQL Injection and XSS
 */

import { IsString, IsNumber, IsBoolean, IsDateString, IsArray, ValidateNested, IsOptional, IsEnum, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Sanitize } from '../../../common/decorators/sanitize.decorator';

/**
 * VVM Status Enum
 */
export enum VVMStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  NOT_TESTED = 'NOT_TESTED',
}

/**
 * LMD Delivery Item DTO
 */
export class LMDDeliveryItemDto {
  @IsString()
  @MaxLength(50)
  @Sanitize()
  productCode: string;

  @IsString()
  @MaxLength(200)
  @Sanitize()
  productName: string;

  @IsNumber()
  @Min(0)
  quantityDelivered: number;

  @IsNumber()
  @Min(0)
  quantityReceived: number;

  @IsString()
  @MaxLength(100)
  @Sanitize()
  batchNumber: string;

  @IsDateString()
  expiryDate: string;

  @IsEnum(VVMStatus)
  vvmStatus: VVMStatus;

  @IsBoolean()
  coldChainBreak: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Sanitize()
  notes?: string;
}

/**
 * Vehicle GPS DTO
 */
export class VehicleGPSDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0)
  accuracy: number;

  @IsDateString()
  timestamp: string;
}

/**
 * LMD Record DTO
 */
export class LMDDto {
  @IsString()
  @MaxLength(100)
  @Sanitize()
  id: string;

  @IsString()
  @MaxLength(100)
  @Sanitize()
  facilityId: string;

  @IsString()
  @MaxLength(200)
  @Sanitize()
  facilityName: string;

  @IsString()
  @MaxLength(50)
  @Sanitize()
  lgaCode: string;

  @IsString()
  @MaxLength(50)
  @Sanitize()
  stateCode: string;

  @IsDateString()
  deliveryTimestamp: string;

  @IsEnum(VVMStatus)
  vvmStatus: VVMStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleGPSDto)
  vehicleGPS?: VehicleGPSDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LMDDeliveryItemDto)
  deliveryItems: LMDDeliveryItemDto[];

  @IsString()
  officerId: string;

  @IsString()
  officerName: string;

  @IsBoolean()
  synced: boolean;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
