/**
 * VaxTrace Nigeria - Alerts Module
 *
 * Handles alert generation, tracking, and management.
 * Integrates with stock data and VVM status to generate
 * actionable alerts for vaccine supply chain.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Module } from '@nestjs/common';

import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
