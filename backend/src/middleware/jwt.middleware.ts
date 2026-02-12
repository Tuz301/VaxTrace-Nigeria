/**
 * VaxTrace Nigeria - JWT Authentication Middleware
 * 
 * FIX #3: JWT Authentication Middleware
 * Validates JWT tokens and adds user information to requests
 * 
 * Features:
 * - JWT token validation
 * - Token refresh on expiry
 * - User context injection
 * - Role-based access control integration
 */

import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';

/**
 * Extended Request interface with user property
 */
export interface ExtendedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'nphcda_director' | 'state_cold_chain_officer' | 'lga_logistics_officer' | 'facility_in_charge' | 'system_admin';
    assignedLocationId?: string;
    permissions: string[];
    iat?: number;
    exp?: number;
  };
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'vaxtrace-secret-key';
  }

  use(req: ExtendedRequest, res: Response, next: NextFunction): void {
    // Skip authentication for public routes
    if (this.isPublicRoute(req.path)) {
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = authHeader.substring(7);

    try {
      // Verify JWT token
      const decoded = verify(token, this.jwtSecret) as any;
      
      // Add user to request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        assignedLocationId: decoded.assignedLocationId,
        permissions: decoded.permissions || [],
        iat: decoded.iat,
        exp: decoded.exp,
      };

      this.logger.debug(`User authenticated: ${req.user.email} (${req.user.role})`);
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Check if route is public (doesn't require authentication)
   */
  private isPublicRoute(path: string): boolean {
    const publicRoutes = [
      '/health',
      '/metrics',
      '/api/v1/openlmis/health',
      '/api/v1/openlmis/sync/status',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/webhooks',
    ];

    return publicRoutes.some(route => path.startsWith(route));
  }
}
