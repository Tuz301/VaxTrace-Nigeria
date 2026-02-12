/**
 * VaxTrace Nigeria - Feature Flags Service
 * 
 * FIX #20: Feature Flags
 * Enables/disables features dynamically without deployment
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  whitelist?: string[];
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly FLAG_PREFIX = 'vax:feature:';

  // Default feature flags
  private readonly defaultFlags: Record<string, FeatureFlag> = {
    'dashboard-analytics': {
      name: 'dashboard-analytics',
      enabled: true,
      description: 'Enable advanced analytics dashboard',
    },
    'offline-mode': {
      name: 'offline-mode',
      enabled: true,
      description: 'Enable offline PWA mode',
    },
    'real-time-updates': {
      name: 'real-time-updates',
      enabled: true,
      description: 'Enable real-time stock updates',
    },
    'advanced-filters': {
      name: 'advanced-filters',
      enabled: false,
      description: 'Enable advanced filtering options',
    },
    'export-reports': {
      name: 'export-reports',
      enabled: true,
      description: 'Enable report export functionality',
    },
  };

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Check if a feature is enabled
   */
  async isEnabled(featureName: string, userId?: string): Promise<boolean> {
    const flag = await this.getFlag(featureName);
    
    if (!flag) {
      this.logger.warn(`Feature flag not found: ${featureName}`);
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage && userId) {
      const hash = this.hashUserId(userId);
      return hash < flag.rolloutPercentage;
    }

    // Check whitelist
    if (flag.whitelist && userId) {
      return flag.whitelist.includes(userId);
    }

    return true;
  }

  /**
   * Get a feature flag
   */
  async getFlag(featureName: string): Promise<FeatureFlag | null> {
    const key = `${this.FLAG_PREFIX}${featureName}`;
    const cached = await this.cacheService.get<FeatureFlag>(key);
    
    if (cached) {
      return cached;
    }

    // Return default flag if exists
    return this.defaultFlags[featureName] || null;
  }

  /**
   * Set a feature flag
   */
  async setFlag(flag: FeatureFlag): Promise<void> {
    const key = `${this.FLAG_PREFIX}${flag.name}`;
    await this.cacheService.set(key, flag, { ttl: 24 * 60 * 60 }); // 24 hour TTL
    this.logger.log(`Feature flag updated: ${flag.name} = ${flag.enabled}`);
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    return Object.values(this.defaultFlags);
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}
