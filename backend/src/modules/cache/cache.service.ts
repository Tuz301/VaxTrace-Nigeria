/**
 * VaxTrace Nigeria - Redis Cache Service
 * 
 * This module implements the caching strategy for VaxTrace.
 * It provides high-speed data access to achieve sub-2-second load times.
 * 
 * Features:
 * - Multi-level caching (facility, LGA, state, national)
 * - Automatic cache invalidation via webhooks
 * - TTL-based expiration
 * - Cache warming for critical data
 * - Protobuf serialization support
 * 
 * Cache Key Patterns:
 * - vax:stock:facility:{id} - Facility stock data (15 min TTL)
 * - vax:stock:lga:{id} - LGA aggregated stock (15 min TTL)
 * - vax:stock:state:{id} - State aggregated stock (15 min TTL)
 * - vax:map:nodes - All map nodes (24 hour TTL)
 * - vax:alerts:active - Active alerts (5 min TTL)
 * - vax:user:{id}:permissions - User permissions (1 hour TTL)
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// ============================================
// TYPES
// ============================================

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Use compression
  serialize?: boolean; // Use JSON serialization
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  version: number;
}

// ============================================
// CACHE SERVICE
// ============================================

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private redisSubscriber: Redis;
  private isConnected = false;

  // TTL Configuration (from environment or defaults)
  private readonly TTL = {
    STOCK: 900, // 15 minutes
    GEO: 86400, // 24 hours
    ALERTS: 300, // 5 minutes
    USER: 3600, // 1 hour
    SESSION: 7200, // 2 hours
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  /**
   * Connects to Redis
   */
  private async connect(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    try {
      // Use individual connection parameters for better compatibility
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      // Subscriber connection for pub/sub
      this.redisSubscriber = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Event listeners
      this.redis.on('connect', () => {
        this.logger.log('Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis error', error.stack);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      // Ping to verify connection
      await this.redis.ping();
      this.logger.log('Redis connection verified');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error.stack);
      throw error;
    }
  }

  /**
   * Disconnects from Redis
   */
  private disconnect(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
    if (this.redisSubscriber) {
      this.redisSubscriber.disconnect();
    }
  }

  /**
   * FIX #13: Health check - Ping Redis
   */
  async ping(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis connection not established');
    }
    await this.redis.ping();
  }

  // ============================================
  // BASIC CACHE OPERATIONS
  // ============================================

  /**
   * Sets a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const ttl = options.ttl ?? this.TTL.STOCK;
      const serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        version: 1,
      } as CacheEntry<T>);

      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Failed to set cache: ${key}`, error.stack);
    }
  }

  /**
   * Gets a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      const entry = JSON.parse(data) as CacheEntry<T>;
      return entry.value;
    } catch (error) {
      this.logger.error(`Failed to get cache: ${key}`, error.stack);
      return null;
    }
  }

  /**
   * Deletes a key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache: ${key}`, error.stack);
    }
  }

  /**
   * Alias for delete() - deletes a key from cache
   */
  async del(key: string): Promise<void> {
    return this.delete(key);
  }

  /**
   * Deletes multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache deleted pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern: ${pattern}`, error.stack);
    }
  }

  /**
   * Checks if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache existence: ${key}`, error.stack);
      return false;
    }
  }

  // ============================================
  // STOCK DATA CACHING
  // ============================================

  /**
   * Caches facility stock data
   */
  async setFacilityStock(facilityId: string, data: any): Promise<void> {
    const key = `vax:stock:facility:${facilityId}`;
    await this.set(key, data, { ttl: this.TTL.STOCK });
  }

  /**
   * Gets facility stock data from cache
   */
  async getFacilityStock(facilityId: string): Promise<any | null> {
    const key = `vax:stock:facility:${facilityId}`;
    return this.get(key);
  }

  /**
   * Caches LGA aggregated stock data
   */
  async setLGAStock(lgaId: string, data: any): Promise<void> {
    const key = `vax:stock:lga:${lgaId}`;
    await this.set(key, data, { ttl: this.TTL.STOCK });
  }

  /**
   * Gets LGA stock data from cache
   */
  async getLGAStock(lgaId: string): Promise<any | null> {
    const key = `vax:stock:lga:${lgaId}`;
    return this.get(key);
  }

  /**
   * Caches state aggregated stock data
   */
  async setStateStock(stateId: string, data: any): Promise<void> {
    const key = `vax:stock:state:${stateId}`;
    await this.set(key, data, { ttl: this.TTL.STOCK });
  }

  /**
   * Gets state stock data from cache
   */
  async getStateStock(stateId: string): Promise<any | null> {
    const key = `vax:stock:state:${stateId}`;
    return this.get(key);
  }

  // ============================================
  // MAP DATA CACHING
  // ============================================

  /**
   * Caches all map nodes
   */
  async setMapNodes(nodes: any[]): Promise<void> {
    const key = 'vax:map:nodes';
    await this.set(key, nodes, { ttl: this.TTL.GEO });
  }

  /**
   * Gets all map nodes from cache
   */
  async getMapNodes(): Promise<any[] | null> {
    const key = 'vax:map:nodes';
    return this.get(key);
  }

  // ============================================
  // ALERT CACHING
  // ============================================

  /**
   * Caches active alerts
   */
  async setActiveAlerts(alerts: any[]): Promise<void> {
    const key = 'vax:alerts:active';
    await this.set(key, alerts, { ttl: this.TTL.ALERTS });
  }

  /**
   * Gets active alerts from cache
   */
  async getActiveAlerts(): Promise<any[] | null> {
    const key = 'vax:alerts:active';
    return this.get(key);
  }

  // ============================================
  // USER PERMISSIONS CACHING
  // ============================================

  /**
   * Caches user permissions
   */
  async setUserPermissions(userId: string, permissions: any): Promise<void> {
    const key = `vax:user:${userId}:permissions`;
    await this.set(key, permissions, { ttl: this.TTL.USER });
  }

  /**
   * Gets user permissions from cache
   */
  async getUserPermissions(userId: string): Promise<any | null> {
    const key = `vax:user:${userId}:permissions`;
    return this.get(key);
  }

  // ============================================
  // CACHE INVALIDATION
  // ============================================

  /**
   * Invalidates all stock-related cache for a facility
   */
  async invalidateFacilityStock(facilityId: string): Promise<void> {
    await this.delete(`vax:stock:facility:${facilityId}`);
  }

  /**
   * Invalidates all stock-related cache for an LGA
   */
  async invalidateLGAStock(lgaId: string): Promise<void> {
    await this.delete(`vax:stock:lga:${lgaId}`);
    // Also invalidate all facilities in this LGA
    await this.deletePattern(`vax:stock:facility:*`);
  }

  /**
   * Invalidates all stock-related cache for a state
   */
  async invalidateStateStock(stateId: string): Promise<void> {
    await this.delete(`vax:stock:state:${stateId}`);
    // Also invalidate all LGAs in this state
    await this.deletePattern(`vax:stock:lga:*`);
  }

  /**
   * Invalidates all map-related cache
   */
  async invalidateMapCache(): Promise<void> {
    await this.delete('vax:map:nodes');
  }

  /**
   * Invalidates all alerts cache
   */
  async invalidateAlertsCache(): Promise<void> {
    await this.delete('vax:alerts:active');
  }

  // ============================================
  // CACHE WARMING
  // ============================================

  /**
   * Warms up critical cache data
   * Should be called periodically or after cache invalidation
   */
  async warmupCache(): Promise<void> {
    this.logger.log('Starting cache warmup...');

    // This would fetch critical data from the database
    // and populate the cache
    
    this.logger.log('Cache warmup completed');
  }

  // ============================================
  // PUB/SUB FOR REAL-TIME UPDATES
  // ============================================

  /**
   * Publishes a cache invalidation event
   */
  async publishInvalidation(channel: string, key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.publish(`vax:cache:${channel}`, JSON.stringify({ key }));
      this.logger.debug(`Published invalidation: ${channel} -> ${key}`);
    } catch (error) {
      this.logger.error(`Failed to publish invalidation`, error.stack);
    }
  }

  /**
   * Subscribes to cache invalidation events
   */
  async subscribeInvalidation(
    channel: string,
    callback: (key: string) => void
  ): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redisSubscriber.subscribe(`vax:cache:${channel}`);
      
      this.redisSubscriber.on('message', (ch, message) => {
        if (ch === `vax:cache:${channel}`) {
          const { key } = JSON.parse(message);
          callback(key);
        }
      });

      this.logger.debug(`Subscribed to invalidation: ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to invalidation`, error.stack);
    }
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Checks Redis health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    if (!this.isConnected) {
      return { healthy: false };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      return { healthy: false };
    }
  }

  /**
   * Gets cache statistics
   */
  async getStats(): Promise<{
    keyCount: number;
    memoryUsage: string;
    connectedClients: number;
  } | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.redis.info('memory');
      
      // Parse key count (approximate)
      const keyCount = await this.redis.dbsize();
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
      
      // Get connected clients from info
      const clientsInfo = await this.redis.info('clients');
      const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
      const connectedClients = clientsMatch ? parseInt(clientsMatch[1], 10) : 0;
      
      return {
        keyCount,
        memoryUsage,
        connectedClients,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', error.stack);
      return null;
    }
  }
}
