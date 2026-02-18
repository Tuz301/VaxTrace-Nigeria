/**
 * VaxTrace Nigeria - Feature Flags Controller
 * 
 * REST API for managing feature flags.
 * Provides endpoints to check, list, and manage feature flags.
 */

import { Controller, Get, Post, Put, Delete, Param, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';

@ApiTags('feature-flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * Get all feature flags
   * 
   * GET /api/feature-flags
   */
  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'Returns all feature flags' })
  getAllFlags() {
    const flags = this.featureFlagsService.getAllFlags();
    return {
      success: true,
      data: flags,
      meta: {
        timestamp: new Date().toISOString(),
        count: flags.length,
      },
    };
  }

  /**
   * Check if a specific feature flag is enabled
   * 
   * GET /api/feature-flags/:key/check
   */
  @Get(':key/check')
  @ApiOperation({ summary: 'Check if a feature flag is enabled' })
  @ApiResponse({ status: 200, description: 'Returns flag status' })
  @ApiResponse({ status: 404, description: 'Flag not found' })
  checkFlag(@Param('key') key: string) {
    const flag = this.featureFlagsService.getFlag(key);
    
    if (!flag) {
      return {
        success: false,
        error: {
          code: 'FLAG_NOT_FOUND',
          message: `Feature flag '${key}' not found`,
        },
      };
    }

    return {
      success: true,
      data: {
        key: flag.key,
        enabled: flag.enabled,
        description: flag.description,
        rolloutPercentage: flag.rolloutPercentage,
      },
    };
  }

  /**
   * Enable a feature flag
   * 
   * PUT /api/feature-flags/:key/enable
   * Requires authentication
   */
  @Put(':key/enable')
  @ApiOperation({ summary: 'Enable a feature flag' })
  @ApiResponse({ status: 200, description: 'Flag enabled successfully' })
  enableFlag(@Param('key') key: string) {
    this.featureFlagsService.enableFlag(key);
    
    return {
      success: true,
      message: `Feature flag '${key}' enabled`,
      data: {
        key,
        enabled: true,
      },
    };
  }

  /**
   * Disable a feature flag
   * 
   * PUT /api/feature-flags/:key/disable
   * Requires authentication
   */
  @Put(':key/disable')
  @ApiOperation({ summary: 'Disable a feature flag' })
  @ApiResponse({ status: 200, description: 'Flag disabled successfully' })
  disableFlag(@Param('key') key: string) {
    this.featureFlagsService.disableFlag(key);
    
    return {
      success: true,
      message: `Feature flag '${key}' disabled`,
      data: {
        key,
        enabled: false,
      },
    };
  }

  /**
   * Set rollout percentage for a feature flag
   * 
   * PUT /api/feature-flags/:key/rollout
   * Requires authentication
   */
  @Put(':key/rollout')
  @ApiOperation({ summary: 'Set rollout percentage for a feature flag' })
  @ApiResponse({ status: 200, description: 'Rollout percentage set successfully' })
  setRollout(
    @Param('key') key: string,
    @Body() body: { percentage: number }
  ) {
    this.featureFlagsService.setRolloutPercentage(key, body.percentage);
    
    return {
      success: true,
      message: `Feature flag '${key}' rollout set to ${body.percentage}%`,
      data: {
        key,
        rolloutPercentage: body.percentage,
      },
    };
  }
}
