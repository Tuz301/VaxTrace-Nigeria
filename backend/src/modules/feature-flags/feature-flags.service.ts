/**
 * VaxTrace Nigeria - Feature Flags Service
 * 
 * Simple feature flag implementation for dynamic feature rollout.
 * Supports environment-based and user-based feature toggling.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private flags: Map<string, FeatureFlag>;

  // Feature flags definition
  private readonly featureFlags: FeatureFlag[] = [
    {
      key: 'OPENLMIS_INTEGRATION',
      enabled: true,
      description: 'Enable OpenLMIS data integration',
    },
    {
      key: 'REALTIME_SYNC',
      enabled: true,
      description: 'Enable real-time WebSocket sync',
    },
    {
      key: 'ML_PREDICTIONS',
      enabled: true,
      description: 'Enable ML-based stock predictions',
    },
    {
      key: 'ADVANCED_ANALYTICS',
      enabled: false,
      description: 'Enable advanced analytics dashboard',
      rolloutPercentage: 50,
    },
    {
      key: 'BATCH_EXPORT',
      enabled: true,
      description: 'Enable batch data export',
    },
    {
      key: 'MOBILE_OPTIMIZATIONS',
      enabled: true,
      description: 'Enable mobile-specific optimizations',
    },
    {
      key: 'DARK_MODE',
      enabled: true,
      description: 'Enable dark mode theme',
    },
    {
      key: 'BIOMETRIC_AUTH',
      enabled: false,
      description: 'Enable biometric authentication',
      rolloutPercentage: 10,
    },
  ];

  constructor(private readonly configService: ConfigService) {
    this.flags = new Map();
    this.initializeFlags();
  }

  /**
   * Initialize feature flags from config and defaults
   */
  private initializeFlags(): void {
    for (const flag of this.featureFlags) {
      // Check if flag is overridden by environment variable
      const envValue = this.configService.get<string>(`FEATURE_FLAG_${flag.key}`);
      
      if (envValue !== undefined) {
        flag.enabled = envValue === 'true' || envValue === '1';
      }

      this.flags.set(flag.key, flag);
      this.logger.debug(`Feature flag ${flag.key}: ${flag.enabled}`);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(key: string, userId?: string): boolean {
    const flag = this.flags.get(key);

    if (!flag) {
      this.logger.warn(`Unknown feature flag: ${key}`);
      return false;
    }

    // If flag is explicitly enabled/disabled
    if (flag.rolloutPercentage === undefined) {
      return flag.enabled;
    }

    // For percentage-based rollouts
    if (!flag.enabled) {
      return false;
    }

    // Use user ID for consistent rollout
    if (userId) {
      const hash = this.hashUserId(userId);
      return (hash % 100) < flag.rolloutPercentage!;
    }

    // Random rollout (not recommended for production)
    return Math.random() * 100 < flag.rolloutPercentage!;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific feature flag
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Enable a feature flag at runtime
   */
  enableFlag(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = true;
      this.logger.log(`Feature flag ${key} enabled`);
    }
  }

  /**
   * Disable a feature flag at runtime
   */
  disableFlag(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = false;
      this.logger.log(`Feature flag ${key} disabled`);
    }
  }

  /**
   * Set feature flag rollout percentage
   */
  setRolloutPercentage(key: string, percentage: number): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.rolloutPercentage = Math.min(100, Math.max(0, percentage));
      this.logger.log(`Feature flag ${key} rollout set to ${flag.rolloutPercentage}%`);
    }
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
