/**
 * VaxTrace Nigeria - Delivery Controller
 *
 * Exposes delivery confirmation endpoints for field operations.
 * Integrates with QR scanning for last-mile delivery tracking.
 *
 * Endpoints:
 * - POST /api/v1/delivery/confirm - Confirm delivery from QR scan
 * - GET /api/v1/delivery/:id - Get delivery by ID
 * - GET /api/v1/delivery/transfer/:transferId - Get deliveries by transfer ID
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { DeliveryService } from './delivery.service';
import {
  ConfirmDeliveryDto,
  DeliveryConfirmationResponseDto,
} from './dto/delivery.dto';

// ============================================
// CONTROLLER
// ============================================

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  private readonly logger = new Logger(DeliveryController.name);

  constructor(private readonly deliveryService: DeliveryService) {
    this.logger.log('Delivery Controller initialized');
  }

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Confirm delivery from QR scan
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm delivery',
    description: 'Confirm delivery using scanned QR code data',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery confirmed successfully',
    type: DeliveryConfirmationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid delivery data',
  })
  @ApiBody({ type: ConfirmDeliveryDto })
  async confirmDelivery(
    @Body() confirmDto: ConfirmDeliveryDto,
  ): Promise<DeliveryConfirmationResponseDto> {
    this.logger.log(`Delivery confirmation for QR: ${confirmDto.qrCodeId}`);
    return await this.deliveryService.confirmDelivery(confirmDto);
  }

  // ============================================
  // QUERY ENDPOINTS
  // ============================================

  /**
   * Get delivery by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get delivery by ID',
    description: 'Retrieve a specific delivery record by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Delivery not found',
  })
  async getDelivery(@Param('id') id: string) {
    this.logger.debug(`Get delivery request: ${id}`);
    return await this.deliveryService.getDelivery(id);
  }

  /**
   * Get deliveries by transfer ID
   */
  @Get('transfer/:transferId')
  @ApiOperation({
    summary: 'Get deliveries by transfer ID',
    description: 'Retrieve all delivery confirmations for a specific transfer',
  })
  @ApiResponse({
    status: 200,
    description: 'Deliveries retrieved successfully',
  })
  async getDeliveriesByTransfer(@Param('transferId') transferId: string) {
    this.logger.debug(`Get deliveries by transfer request: ${transferId}`);
    return await this.deliveryService.getDeliveriesByTransfer(transferId);
  }
}
