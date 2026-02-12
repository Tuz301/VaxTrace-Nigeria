/**
 * VaxTrace Nigeria - Alerts Controller
 *
 * Exposes alert management endpoints for the application.
 * Provides filtering and querying capabilities for alerts.
 *
 * Endpoints:
 * - GET /api/v1/alerts - Get all alerts with optional filtering
 * - GET /api/v1/alerts/active - Get active (unresolved) alerts
 * - GET /api/v1/alerts/:id - Get alert by ID
 * - POST /api/v1/alerts/:id/resolve - Resolve an alert
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Controller, Get, Post, Body, HttpCode, HttpStatus, Logger, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { AlertsService } from './alerts.service';
import {
  AlertQueryDto,
  AlertDto,
  AlertsResponseDto,
} from './dto/alert.dto';

// ============================================
// CONTROLLER
// ============================================

@ApiTags('Alerts')
@Controller('api/v1/alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly alertsService: AlertsService) {
    this.logger.log('Alerts Controller initialized');
  }

  // ============================================
  // QUERY ENDPOINTS
  // ============================================

  /**
   * Get all alerts with optional filtering
   */
  @Get()
  @ApiOperation({
    summary: 'Get alerts',
    description: 'Retrieve alerts with optional filtering by severity, type, state, and active status',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
    type: AlertsResponseDto,
  })
  async getAlerts(
    @Param('severity') severity?: string,
    @Param('type') type?: string,
    @Param('state') state?: string,
    @Param('active') active?: string,
  ): Promise<AlertsResponseDto> {
    this.logger.debug(`Get alerts request with filters: severity=${severity}, type=${type}, state=${state}, active=${active}`);
    return await this.alertsService.getAlerts({
      severity,
      type,
      state,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }

  /**
   * Get active (unresolved) alerts
   */
  @Get('active')
  @ApiOperation({
    summary: 'Get active alerts',
    description: 'Retrieve all active (unresolved) alerts with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Active alerts retrieved successfully',
    type: AlertsResponseDto,
  })
  async getActiveAlerts(
    @Param('severity') severity?: string,
    @Param('type') type?: string,
    @Param('state') state?: string,
  ): Promise<AlertsResponseDto> {
    this.logger.debug(`Get active alerts request with filters: severity=${severity}, type=${type}, state=${state}`);
    return await this.alertsService.getActiveAlerts({
      severity,
      type,
      state,
    });
  }

  /**
   * Get alert by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get alert by ID',
    description: 'Retrieve a specific alert by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert retrieved successfully',
    type: AlertDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found',
  })
  async getAlert(@Param('id') id: string): Promise<AlertDto | null> {
    this.logger.debug(`Get alert request: ${id}`);
    return await this.alertsService.getAlert(id);
  }

  /**
   * Resolve alert
   */
  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve alert',
    description: 'Mark an alert as resolved',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found',
  })
  async resolveAlert(@Param('id') id: string): Promise<void> {
    this.logger.log(`Resolve alert request: ${id}`);
    await this.alertsService.resolveAlert(id);
  }
}
