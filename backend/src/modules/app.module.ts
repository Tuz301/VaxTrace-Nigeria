/**
 * VaxTrace Nigeria - Root Application Module
 * 
 * This is the root module that imports all other modules
 * and configures the application.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from './cache/cache.module';
import { OpenLMISModule } from './openlmis/openlmis.module';
import { ProtobufModule } from './protobuf/protobuf.module';
import { WebhookModule } from './webhook/webhook.module';
import { WebSocketModule } from './websocket/websocket.module';
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

    // TypeORM - Database configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'vaxtrace',
      entities: [],
      synchronize: false,
      logging: false,
      extra: {
        max: 35,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Rate limiting to prevent abuse
    ThrottlerModule.forRoot([{
      ttl: 60000, // Time window in milliseconds (1 minute)
      limit: 100, // Max requests per time window
    }]),

    // Feature modules
    CacheModule,
    OpenLMISModule,
    ProtobufModule,
    WebhookModule,
    WebSocketModule,
    HealthModule,
    LMDModule,
    AuthModule,
    DeliveryModule,
    AlertsModule,
    PredictiveInsightsModule,
  ],
  controllers: [],
  providers: [
    // Apply rate limiting globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [],
})
export class AppModule {
  static port: number;

  constructor(private readonly configService: ConfigService) {
    AppModule.port = this.configService.get<number>('PORT') || 3001;
  }
}
