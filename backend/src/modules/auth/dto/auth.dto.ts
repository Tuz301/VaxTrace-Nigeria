/**
 * VaxTrace Nigeria - Authentication DTOs
 *
 * Data Transfer Objects for authentication operations
 *
 * SECURITY: All inputs are sanitized to prevent SQL Injection and XSS
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizedString, SanitizeEmail, Sanitize } from '../../../common/decorators/sanitize.decorator';

// ============================================
// REQUEST DTOS
// ============================================

export class LoginDto {
  @ApiProperty({
    description: 'User ID (staff ID, email, or username)',
    example: 'VT-ADMIN-001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Sanitize()
  userId: string;

  @ApiProperty({
    description: 'User password or PIN',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    description: 'Remember me flag for extended session',
    default: false,
  })
  @IsOptional()
  rememberMe?: boolean;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Sanitize()
  refreshToken: string;
}

export class BiometricLoginDto {
  @ApiProperty({
    description: 'Biometric credential ID',
    example: 'credential-abc-123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Sanitize()
  credentialId: string;

  @ApiProperty({
    description: 'Biometric authentication response',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Sanitize()
  authData: string;
}

export class PinLoginDto {
  @ApiProperty({
    description: '6-digit PIN code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Sanitize()
  pin: string;
}

// ============================================
// RESPONSE DTOS
// ============================================

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    example: {
      id: 'VT-ADMIN-001',
      email: 'admin@vaxtrace.gov.ng',
      name: 'System Administrator',
      role: 'NATIONAL_ADMIN',
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };

  @ApiProperty({
    description: 'User permissions',
    type: 'object',
    example: {
      canViewNational: true,
      canViewState: true,
      canViewLGA: true,
      canViewFacility: true,
      canEditStock: true,
      canEditUsers: true,
      canViewReports: true,
    },
  })
  permissions: Record<string, boolean>;
}

export class UserDto {
  @ApiProperty({
    description: 'User ID',
    example: 'VT-ADMIN-001',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'admin@vaxtrace.gov.ng',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'System Administrator',
  })
  name: string;

  @ApiProperty({
    description: 'User role',
    example: 'NATIONAL_ADMIN',
    enum: ['NATIONAL_ADMIN', 'STATE_MANAGER', 'LGA_SUPERVISOR', 'FACILITY_IN_CHARGE'],
  })
  role: string;

  @ApiProperty({
    description: 'User state assignment',
    example: 'FCT',
    required: false,
  })
  state?: string;

  @ApiProperty({
    description: 'User LGA assignment',
    example: 'Abuja Municipal',
    required: false,
  })
  lga?: string;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last login date',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  lastLogin?: Date;
}
