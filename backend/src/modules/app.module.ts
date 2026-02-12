/**
 * VaxTrace Nigeria - Root Application Module
 * 
 * This is the root module that imports all other modules
 * and configures the application.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from './cache/cache.module';
import { OpenLMISModule } from './openlmis/openlmis.module';
import { ProtobufModule } from './protobuf/protobuf.module';
import { WebhookModule } from './webhook/webhook.module';
import { HealthModule } from './health/health.module';
import { LMDModule } from './lmd/lmd.module';
import { AuthModule } from './auth/auth.module';
import { DeliveryModule } from './delivery/delivery.module';
import { AlertsModule } from './alerts/alerts.module';
import { PredictiveInsightsModule } from './predictive-insights/predictive-insights.module';

@Module({
  imports: [
    // Configuration module - load .env file from project root
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env.local', '../.env', '.env.local', '.env'],
      cache: true,
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Feature modules
    CacheModule,
    OpenLMISModule,
    ProtobufModule,
    WebhookModule,
    HealthModule,
    LMDModule,
    AuthModule,
    DeliveryModule,
    AlertsModule,
    PredictiveInsightsModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppModule {
  static port: number;

  constructor(private readonly configService: ConfigService) {
    AppModule.port = this.configService.get<number>('PORT') || 3001;
  }
}
