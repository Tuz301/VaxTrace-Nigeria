/**
 * VaxTrace Nigeria - Authentication Module
 *
 * Provides authentication and authorization functionality for the VaxTrace application.
 * This module handles user login, token generation/validation, and session management.
 *
 * Features:
 * - JWT-based authentication
 * - Role-based access control (RBAC)
 * - Refresh token management
 * - Biometric authentication support (WebAuthn)
 * - Token cleanup and expiration handling
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// ============================================
// MODULE CONFIGURATION
// ============================================

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'vaxtrace-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {
  constructor(private readonly authService: AuthService) {
    // Log initialization
    console.log('✅ Authentication Module initialized');
  }
}
