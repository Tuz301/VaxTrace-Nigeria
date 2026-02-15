/**
 * VaxTrace Nigeria - Authentication Controller
 *
 * Exposes authentication endpoints for user login, token refresh,
 * and session management.
 *
 * Endpoints:
 * - POST /api/v1/auth/login - User login with credentials
 * - POST /api/v1/auth/biometric - Biometric authentication
 * - POST /api/v1/auth/pin - PIN authentication
 * - POST /api/v1/auth/refresh - Refresh access token
 * - POST /api/v1/auth/logout - Logout and invalidate tokens
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Logger, UseGuards, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshTokenDto,
  BiometricLoginDto,
  PinLoginDto,
  AuthResponseDto,
  UserDto,
} from './dto/auth.dto';

// ============================================
// CONTROLLER
// ============================================

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {
    this.logger.log('Authentication Controller initialized');
  }

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * User login with credentials (username/password or PIN)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with credentials (username/password or PIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Login request for user: ${loginDto.userId}`);
    return await this.authService.login(loginDto);
  }

  /**
   * Biometric authentication (WebAuthn)
   */
  @Post('biometric')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Biometric authentication',
    description: 'Authenticate user using biometric credentials (WebAuthn)',
  })
  @ApiResponse({
    status: 200,
    description: 'Biometric authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid biometric credentials',
  })
  @ApiBody({ type: BiometricLoginDto })
  async biometricLogin(@Body() biometricDto: BiometricLoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Biometric login request for credential: ${biometricDto.credentialId}`);
    return await this.authService.biometricLogin(biometricDto);
  }

  /**
   * PIN authentication
   */
  @Post('pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PIN authentication',
    description: 'Authenticate user using 6-digit PIN code',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid PIN',
  })
  @ApiBody({ type: PinLoginDto })
  async pinLogin(@Body() pinDto: PinLoginDto): Promise<AuthResponseDto> {
    this.logger.log(`PIN login request`);
    return await this.authService.pinLogin(pinDto);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Obtain a new access token using a valid refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() refreshDto: RefreshTokenDto): Promise<AuthResponseDto> {
    this.logger.debug('Token refresh request');
    return await this.authService.refreshToken(refreshDto);
  }

  // ============================================
  // PROTECTED ENDPOINTS
  // ============================================

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards() // Will be replaced with JWT guard
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get the currently authenticated user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getCurrentUser(@Req() req: Request): Promise<UserDto> {
    // Extract user from JWT (added by middleware)
    const user = req['user'] as any;
    this.logger.debug(`Get current user request: ${user?.id}`);
    return await this.authService.validateToken(req.headers.authorization?.substring(7));
  }

  /**
   * Logout user and invalidate tokens
   */
  @Post('logout')
  @UseGuards() // Will be replaced with JWT guard
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Logout user and invalidate refresh tokens',
  })
  @ApiResponse({
    status: 204,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async logout(@Req() req: Request): Promise<void> {
    // Extract user from JWT (added by middleware)
    const user = req['user'] as any;
    this.logger.log(`Logout request for user: ${user?.id}`);
    await this.authService.logout(user?.sub);
  }
}
