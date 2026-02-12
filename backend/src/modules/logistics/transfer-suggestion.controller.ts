/**
 * VaxTrace Nigeria - Transfer Suggestion Controller
 *
 * Exposes transfer suggestion endpoints for vaccine redistribution.
 * Provides AI-powered recommendations for optimal stock balancing.
 *
 * Endpoints:
 * - GET /api/v1/transfer-suggestions - Get transfer suggestions
 * - POST /api/v1/transfer-suggestions/:id/execute - Execute a transfer
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Controller, Get, Post, Body, HttpCode, HttpStatus, Logger, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty, ApiQuery } from '@nestjs/swagger';

import { TransferSuggestionService } from './transfer-suggestion.service';
import { TransferSuggestion } from './transfer-suggestion.service';

// ============================================
// DTOS
// ============================================

export class ExecuteTransferDto {
  @ApiProperty({ description: 'Reason for execution', example: 'Urgent stockout' })
  reason?: string;

  @ApiProperty({ description: 'Notes for the transfer', example: 'Transfer completed successfully' })
  notes?: string;

  @ApiProperty({ description: 'Estimated completion time (minutes)', example: 120 })
  estimatedCompletionTime?: number;
}

// ============================================
// CONTROLLER
// ============================================

@ApiTags('Transfer Suggestions')
@Controller('api/v1/transfer-suggestions')
export class TransferSuggestionController {
  private readonly logger = new Logger(TransferSuggestionController.name);

  constructor(private readonly transferSuggestionService: TransferSuggestionService) {
    this.logger.log('Transfer Suggestion Controller initialized');
  }

  // ============================================
  // QUERY ENDPOINTS
  // ============================================

  /**
   * Get transfer suggestions
   */
  @Get()
  @ApiOperation({
    summary: 'Get transfer suggestions',
    description: 'Retrieve AI-powered transfer suggestions for vaccine redistribution',
  })
  @ApiQuery({ name: 'targetLGAId', required: true, description: 'Target LGA ID that needs stock' })
  @ApiQuery({ name: 'vaccineId', required: true, description: 'Vaccine ID to transfer' })
  @ApiResponse({
    status: 200,
    description: 'Transfer suggestions retrieved successfully',
    type: [Object],
  })
  async getTransferSuggestions(
    @Query('targetLGAId') targetLGAId: string,
    @Query('vaccineId') vaccineId: string,
  ): Promise<TransferSuggestion[]> {
    this.logger.debug(`Get transfer suggestions for LGA: ${targetLGAId}, vaccine: ${vaccineId}`);
    return await this.transferSuggestionService.generateSuggestions(targetLGAId, vaccineId);
  }

  /**
   * Execute a transfer suggestion
   */
  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute transfer',
    description: 'Execute a suggested vaccine transfer',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer executed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transfer suggestion not found',
  })
  async executeTransfer(
    @Param('id') id: string,
    @Body() executeDto: ExecuteTransferDto,
  ) {
    this.logger.log(`Execute transfer: ${id}`);
    // In production, this would trigger the actual transfer workflow
    return {
      success: true,
      message: 'Transfer executed successfully',
      transferId: id,
      estimatedCompletionTime: executeDto.estimatedCompletionTime || 120,
      notes: executeDto.notes,
    };
  }
}
