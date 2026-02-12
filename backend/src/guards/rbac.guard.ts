/**
 * VaxTrace Nigeria - RBAC Guard
 *
 * FIX #3: Role-Based Access Control Guard
 * Enforces role-based access control on protected routes
 *
 * Usage:
 * @UseGuards(RBACGuard)
 * @Roles('nphcda_director', 'state_cold_chain_officer')
 * async getStockData() { ... }
 */

import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Role decorator for specifying required roles
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

export type UserRole =
  | 'nphcda_director'
  | 'state_cold_chain_officer'
  | 'lga_logistics_officer'
  | 'facility_in_charge'
  | 'system_admin';

export type Permission =
  | 'view_national'
  | 'view_state'
  | 'view_lga'
  | 'view_facility'
  | 'edit_stock'
  | 'edit_users'
  | 'view_reports'
  | 'manage_alerts';

/**
 * Role permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  nphcda_director: ['view_national', 'view_state', 'view_lga', 'view_facility', 'edit_users', 'view_reports', 'manage_alerts'],
  state_cold_chain_officer: ['view_state', 'view_lga', 'view_facility', 'view_reports', 'manage_alerts'],
  lga_logistics_officer: ['view_lga', 'view_facility', 'edit_stock', 'view_reports'],
  facility_in_charge: ['view_facility', 'edit_stock', 'view_reports'],
  system_admin: ['view_national', 'view_state', 'view_lga', 'view_facility', 'edit_stock', 'edit_users', 'view_reports', 'manage_alerts'],
};

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    
    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtMiddleware)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is authenticated
    if (!user) {
      return false;
    }

    // Check if user has required role
    if (!requiredRoles.includes(user.role)) {
      return false;
    }

    // Check if user has required permissions
    const requiredPermissions = this.reflector.get<Permission[]>('permissions', context.getHandler());
    if (requiredPermissions) {
      const userPermissions = ROLE_PERMISSIONS[user.role] || [];
      const hasAllPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));
      
      if (!hasAllPermissions) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Permission decorator for specifying required permissions
 */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata('permissions', permissions);
