/**
 * VaxTrace Nigeria - Audit Logging Service
 * 
 * FIX #19: Audit Logging
 * Tracks all important actions for compliance and debugging
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly AUDIT_LOG_PREFIX = 'vax:audit:';

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event,
    };

    // Store in Redis with 30-day TTL
    const key = `${this.AUDIT_LOG_PREFIX}${auditLog.id}`;
    await this.cacheService.set(key, auditLog, { ttl: 30 * 24 * 60 * 60 });

    // Also log to application logger for immediate visibility
    this.logger.log(
      `[AUDIT] ${auditLog.userId} - ${auditLog.action} on ${auditLog.resource}` +
        (auditLog.resourceId ? `:${auditLog.resourceId}` : '')
    );
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    // In production, this would query a dedicated audit log database
    // For now, return empty array as audit logs are stored in Redis
    return [];
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
