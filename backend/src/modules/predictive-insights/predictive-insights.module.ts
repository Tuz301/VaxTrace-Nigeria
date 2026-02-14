/**
 * VaxTrace Nigeria - Predictive Insights Module
 *
 * Implements "Crystal Ball" predictive analytics for vaccine supply chain.
 * Phase 1: Rule-Based Foundation
 * Phase 2: Lightweight ML (ETS, Isolation Forest, Random Forest)
 * Phase 3: Advanced ML (LSTM, Ensemble, Transfer Learning)
 *
 * @author VaxTrace Team
 * @version 2.0.0
 */

import { Module } from '@nestjs/common';

import { PredictiveInsightsController } from './predictive-insights.controller';
import { PredictiveInsightsService } from './predictive-insights.service';
import { MLModelService } from './ml-model.service';

@Module({
  controllers: [PredictiveInsightsController],
  providers: [PredictiveInsightsService, MLModelService],
  exports: [PredictiveInsightsService, MLModelService],
})
export class PredictiveInsightsModule {}
