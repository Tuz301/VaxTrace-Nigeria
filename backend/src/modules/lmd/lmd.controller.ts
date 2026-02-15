/**
 * VaxTrace Nigeria - LMD (Last-Mile Delivery) Controller
 * 
 * Handles LMD record synchronization from field officers
 * Receives offline-captured delivery data and stores it in the database
 */

import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { LMDDto } from './dto/lmd.dto';
import { LMDService } from './lmd.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('lmd')
@Controller('lmd')
export class LMDController {
  constructor(private readonly lmdService: LMDService) {}

  /**
   * Sync LMD record from field officer
   * Receives offline-captured delivery data
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync LMD record from field officer' })
  @ApiResponse({ status: 200, description: 'LMD record synced successfully' })
  @ApiResponse({ status: 400, description: 'Invalid LMD data' })
  async syncLMDRecord(@Body() lmdDto: LMDDto) {
    return this.lmdService.syncRecord(lmdDto);
  }

  /**
   * Get LMD records by facility
   */
  @Get('facility/:facilityId')
  @ApiOperation({ summary: 'Get LMD records for a facility' })
  @ApiResponse({ status: 200, description: 'LMD records retrieved successfully' })
  async getFacilityRecords(@Param('facilityId') facilityId: string) {
    return this.lmdService.getRecordsByFacility(facilityId);
  }

  /**
   * Get LMD records by state
   */
  @Get('state/:stateCode')
  @ApiOperation({ summary: 'Get LMD records for a state' })
  @ApiResponse({ status: 200, description: 'LMD records retrieved successfully' })
  async getStateRecords(@Param('stateCode') stateCode: string) {
    return this.lmdService.getRecordsByState(stateCode);
  }

  /**
   * Get LMD records by date range
   */
  @Get('range/:startDate/:endDate')
  @ApiOperation({ summary: 'Get LMD records within date range' })
  @ApiResponse({ status: 200, description: 'LMD records retrieved successfully' })
  async getRecordsByDateRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.lmdService.getRecordsByDateRange(startDate, endDate);
  }

  /**
   * Get LMD statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get LMD statistics' })
  @ApiResponse({ status: 200, description: 'LMD statistics retrieved successfully' })
  async getLMDStats() {
    return this.lmdService.getStatistics();
  }
}
