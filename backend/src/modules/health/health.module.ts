/**
 * VaxTrace Nigeria - Health Module
 *
 * FIX #13: Metrics/Monitoring
 * Provides health check endpoints for monitoring
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { CacheModule } from '../cache/cache.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [CacheModule, TypeOrmModule],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class HealthModule {}
