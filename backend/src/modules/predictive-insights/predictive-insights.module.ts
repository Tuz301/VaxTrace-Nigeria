/**
 * VaxTrace Nigeria - Predictive Insights Module
 *
 * Implements "Crystal Ball" predictive analytics for vaccine supply chain.
 * Uses ML/AI models to forecast stockouts, expiry risks, and demand.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Module } from '@nestjs/common';

import { PredictiveInsightsController } from './predictive-insights.controller';
import { PredictiveInsightsService } from './predictive-insights.service';

@Module({
  controllers: [PredictiveInsightsController],
  providers: [PredictiveInsightsService],
  exports: [PredictiveInsightsService],
})
export class PredictiveInsightsModule {}
