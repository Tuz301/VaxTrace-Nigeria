/**
 * VaxTrace Nigeria - Donabedian Outcome Metrics Module
 * 
 * AUDIT FIX: Module for outcome metrics calculation and reporting
 * Implements Donabedian framework outcome measurements
 * 
 * @author Security Audit Implementation
 * @date 2026-02-24
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutcomeMetricsController } from './outcome-metrics.controller';
import { OutcomeMetricsService } from './outcome-metrics.service';

@Module({
  imports: [ConfigModule],
  controllers: [OutcomeMetricsController],
  providers: [OutcomeMetricsService],
  exports: [OutcomeMetricsService],
})
export class OutcomeMetricsModule {}
