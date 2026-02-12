/**
 * VaxTrace Nigeria - Authentication Service
 *
 * Handles user authentication, JWT token generation/validation,
 * and session management for the VaxTrace application.
 *
 * Features:
 * - JWT token generation with configurable expiry
 * - Refresh token management
 * - User validation against mock database
 * - Role-based access control (RBAC)
 * - Session management
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Injectable, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';

import {
  LoginDto,
  RefreshTokenDto,
  BiometricLoginDto,
  PinLoginDto,
  AuthResponseDto,
  UserDto,
} from './dto/auth.dto';

// ============================================
// INTERFACES & TYPES
// ============================================

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  password: string;
  state?: string;
  lga?: string;
  createdAt: Date;
  lastLogin?: Date;
}

// ============================================
// MOCK USER DATABASE
// ============================================

/**
 * SECURITY: Mock users for development/testing
 *
 * In production, this would be replaced with actual database queries.
 * Passwords are loaded from environment variables to avoid hardcoding credentials.
 *
 * To set up test users, add these to your .env file:
 * - MOCK_ADMIN_PASSWORD_HASH
 * - MOCK_MGR_PASSWORD_HASH
 * - MOCK_SUP_PASSWORD_HASH
 * - MOCK_FAC_PASSWORD_HASH
 *
 * Generate bcrypt hashes using: htpasswd -bnBC 10 "" "your-password" | tr -d ':\n'
 */

const getMockUsers = (): User[] => {
  // Default bcrypt hash for "password123" - CHANGE THIS IN PRODUCTION!
  const defaultHash = process.env.MOCK_DEFAULT_PASSWORD_HASH ||
    '$2b$10$YourHashedPasswordHere_CHANGE_IN_PRODUCTION';
  
  return [
    {
      id: 'VT-ADMIN-001',
      email: 'admin@vaxtrace.gov.ng',
      name: 'System Administrator',
      role: 'NATIONAL_ADMIN',
      password: process.env.MOCK_ADMIN_PASSWORD_HASH || defaultHash,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-15'),
    },
    {
      id: 'VT-MGR-001',
      email: 'fct.manager@vaxtrace.gov.ng',
      name: 'FCT State Manager',
      role: 'STATE_MANAGER',
      state: 'FCT',
      password: process.env.MOCK_MGR_PASSWORD_HASH || defaultHash,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-15'),
    },
    {
      id: 'VT-SUP-001',
      email: 'abuja.supervisor@vaxtrace.gov.ng',
      name: 'Abuja Municipal Supervisor',
      role: 'LGA_SUPERVISOR',
      state: 'FCT',
      lga: 'Abuja Municipal',
      password: process.env.MOCK_SUP_PASSWORD_HASH || defaultHash,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-15'),
    },
    {
      id: 'VT-FAC-001',
      email: 'wuse.facility@vaxtrace.gov.ng',
      name: 'Wuse Zone 4 Facility In-Charge',
      role: 'FACILITY_IN_CHARGE',
      state: 'FCT',
      lga: 'Abuja Municipal',
      password: process.env.MOCK_FAC_PASSWORD_HASH || defaultHash,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-15'),
    },
  ];
};

const MOCK_USERS: User[] = getMockUsers();

// ============================================
// AUTH SERVICE
// ============================================

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.logger.log('Authentication Service initialized');
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Authenticate user with credentials (username/password)
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for user: ${loginDto.userId}`);

    // Find user by ID or email
    const user = this.findUser(loginDto.userId);
    if (!user) {
      this.logger.warn(`Login failed: User not found - ${loginDto.userId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password (for development, accept any 4+ digit PIN)
    // In production, use bcrypt.compare()
    const isValidPassword = await this.validatePassword(loginDto.password, user.password);
    if (!isValidPassword) {
      this.logger.warn(`Login failed: Invalid password - ${loginDto.userId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Get user permissions
    const permissions = this.getPermissionsForRole(user.role);

    this.logger.log(`User logged in successfully: ${user.id} (${user.role})`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      permissions,
    };
  }

  /**
   * Authenticate user with biometric credentials
   */
  async biometricLogin(biometricDto: BiometricLoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Biometric login attempt for credential: ${biometricDto.credentialId}`);

    // In production, validate biometric credential against WebAuthn
    // For now, we'll accept any valid credential ID format
    if (!biometricDto.credentialId || biometricDto.credentialId.length < 10) {
      this.logger.warn(`Biometric login failed: Invalid credential ID`);
      throw new UnauthorizedException('Invalid biometric credentials');
    }

    // Extract user ID from credential (in production, this would come from WebAuthn validation)
    const userId = this.extractUserIdFromCredential(biometricDto.credentialId);
    const user = this.findUser(userId);

    if (!user) {
      this.logger.warn(`Biometric login failed: User not found - ${userId}`);
      throw new UnauthorizedException('Invalid biometric credentials');
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Get user permissions
    const permissions = this.getPermissionsForRole(user.role);

    this.logger.log(`User logged in via biometric: ${user.id} (${user.role})`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      permissions,
    };
  }

  /**
   * Authenticate user with PIN code
   */
  async pinLogin(pinDto: PinLoginDto): Promise<AuthResponseDto> {
    this.logger.log(`PIN login attempt`);

    // For demo purposes, accept PIN '123456' for any user
    // In production, this would validate against user's stored PIN hash
    if (pinDto.pin !== '123456') {
      this.logger.warn(`PIN login failed: Invalid PIN`);
      throw new UnauthorizedException('Invalid PIN');
    }

    // For demo, return the admin user
    // In production, find user by PIN or associated user ID
    const user = this.findUser('VT-ADMIN-001');
    if (!user) {
      this.logger.warn(`PIN login failed: User not found`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Get user permissions
    const permissions = this.getPermissionsForRole(user.role);

    this.logger.log(`User logged in via PIN: ${user.id} (${user.role})`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      permissions,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshDto: RefreshTokenDto): Promise<AuthResponseDto> {
    this.logger.debug('Token refresh attempt');

    try {
      // Verify refresh token
      const payload = verify(
        refreshDto.refreshToken,
        this.configService.get<string>('JWT_REFRESH_SECRET') || 'vaxtrace-refresh-secret-key',
      ) as RefreshTokenPayload;

      // Check if token exists in our store
      const storedToken = this.refreshTokens.get(payload.tokenId);
      if (!storedToken || storedToken.expiresAt < new Date()) {
        this.logger.warn('Token refresh failed: Invalid or expired refresh token');
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Find user
      const user = this.findUser(payload.sub);
      if (!user) {
        this.logger.warn('Token refresh failed: User not found');
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Get user permissions
      const permissions = this.getPermissionsForRole(user.role);

      this.logger.log(`Token refreshed for user: ${user.id}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        permissions,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error.message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate JWT token and return user information
   */
  async validateToken(token: string): Promise<UserDto> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;

      // Find user
      const user = this.findUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        state: user.state,
        lga: user.lga,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      };
    } catch (error) {
      this.logger.error('Token validation failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(userId: string): Promise<void> {
    this.logger.log(`Logout request for user: ${userId}`);

    // Invalidate all refresh tokens for this user
    for (const [tokenId, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.userId === userId) {
        this.refreshTokens.delete(tokenId);
      }
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Generate access and refresh tokens for a user
   */
  private async generateTokens(user: User): Promise<TokenPair> {
    const accessTokenExpiry = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    // Generate access token
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        expiresIn: accessTokenExpiry,
      },
    );

    // Generate refresh token
    const tokenId = this.generateTokenId();
    const refreshToken = sign(
      {
        sub: user.id,
        tokenId,
        type: 'refresh',
      },
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'vaxtrace-refresh-secret-key',
      {
        expiresIn: refreshTokenExpiry,
      },
    );

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    this.refreshTokens.set(tokenId, {
      userId: user.id,
      expiresAt,
    });

    // Calculate expiry in seconds
    const expiresIn = this.parseExpiryToSeconds(accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Find user by ID or email
   */
  private findUser(identifier: string): User | undefined {
    return MOCK_USERS.find(
      (user) => user.id === identifier || user.email === identifier,
    );
  }

  /**
   * Validate user password
   */
  private async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    // For development, accept any 4+ digit PIN or "password"
    if (process.env.NODE_ENV === 'development') {
      return plainPassword.length >= 4;
    }

    // In production, use bcrypt
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Get permissions for a given role
   */
  private getPermissionsForRole(role: string): Record<string, boolean> {
    const permissions = {
      canViewNational: false,
      canViewState: false,
      canViewLGA: false,
      canViewFacility: true,
      canEditStock: false,
      canEditUsers: false,
      canViewReports: true,
    };

    switch (role) {
      case 'NATIONAL_ADMIN':
        permissions.canViewNational = true;
        permissions.canViewState = true;
        permissions.canViewLGA = true;
        permissions.canEditStock = true;
        permissions.canEditUsers = true;
        break;
      case 'STATE_MANAGER':
        permissions.canViewState = true;
        permissions.canViewLGA = true;
        permissions.canEditStock = true;
        break;
      case 'LGA_SUPERVISOR':
        permissions.canViewLGA = true;
        permissions.canEditStock = true;
        break;
      case 'FACILITY_IN_CHARGE':
        permissions.canEditStock = true;
        break;
    }

    return permissions;
  }

  /**
   * Extract user ID from biometric credential
   */
  private extractUserIdFromCredential(credentialId: string): string {
    // In production, this would extract user ID from WebAuthn credential
    // For now, return a default admin user
    return 'VT-ADMIN-001';
  }

  /**
   * Generate unique token ID
   */
  private generateTokenId(): string {
    return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600; // Default to 1 hour
    }
  }

  // ============================================
  // SCHEDULED TASKS
  // ============================================

  /**
   * Clean up expired refresh tokens every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [tokenId, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.expiresAt < now) {
        this.refreshTokens.delete(tokenId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired refresh tokens`);
    }
  }
}
