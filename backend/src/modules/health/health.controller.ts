/**
 * VaxTrace Nigeria - Health Check Controller
 *
 * FIX #13: Metrics/Monitoring
 * Provides health check endpoints for monitoring
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheService } from '../cache/cache.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly cacheService: CacheService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'healthy',
      service: 'vaxtrace-api',
      timestamp: new Date().toISOString(),
      uptime: (process as any).uptime?.() || 0,
      version: '1.0.0',
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check' })
  @ApiResponse({ status: 200, description: 'All services are healthy' })
  @ApiResponse({ status: 503, description: 'Some services are unhealthy' })
  async detailedHealthCheck() {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      service: 'vaxtrace-api',
      timestamp: new Date().toISOString(),
      uptime: (process as any).uptime?.() || 0,
      version: '1.0.0',
      checks: {
        api: { status: 'up' as const },
        redis: { status: 'unknown' as 'up' | 'down' | 'unknown' },
        database: { status: 'unknown' as 'up' | 'down' | 'unknown' },
        memory: this.getMemoryStats(),
      },
    };

    // Check Redis connection
    try {
      await this.cacheService.ping();
      health.checks.redis.status = 'up';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      health.checks.redis.status = 'down';
      health.status = 'degraded';
    }

    // Check Database connection
    try {
      await this.dataSource.query('SELECT 1');
      health.checks.database.status = 'up';
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      health.checks.database.status = 'down';
      health.status = 'degraded';
    }

    // Check memory usage
    const memUsage = (process as any).memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    if (heapUsedMB / heapTotalMB > 0.9) {
      health.status = 'degraded';
    }

    return health;
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe - checks if the container is still running' })
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe - checks if the container is ready to serve traffic' })
  async readiness() {
    const ready = {
      status: 'ready' as 'ready' | 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        redis: false,
        database: false,
      },
    };

    // Check if Redis is ready
    try {
      await this.cacheService.ping();
      ready.checks.redis = true;
    } catch (error) {
      // Redis not ready
    }

    // Check if Database is ready
    try {
      await this.dataSource.query('SELECT 1');
      ready.checks.database = true;
    } catch (error) {
      // Database not ready
    }

    // Set status based on checks
    if (!ready.checks.redis || !ready.checks.database) {
      ready.status = 'not_ready';
    }

    return ready;
  }

  private getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      external: `${Math.round((memUsage.external || 0) / 1024 / 1024)}MB`,
    };
  }
}
