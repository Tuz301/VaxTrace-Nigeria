/**
 * VaxTrace Nigeria - Cache Service Unit Tests
 * 
 * Tests for Redis caching functionality including:
 * - Basic CRUD operations
 * - Cache invalidation
 * - Pub/Sub for cache invalidation events
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: jest.Mocked<Redis>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'test-password',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create mock Redis instance
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    mockRedis.on = jest.fn();
    mockRedis.disconnect = jest.fn();
    
    // Mock the Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    mockConfigService = mockConfig as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(async () => {
    if (service) {
      service.onModuleDestroy();
    }
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set and get a value', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };

      mockRedis.set = jest.fn().mockResolvedValue('OK');
      mockRedis.get = jest.fn().mockResolvedValue(JSON.stringify(value));

      await service.set(key, value);
      const result = await service.get(key);

      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non:existent:key';
      mockRedis.get = jest.fn().mockResolvedValue(null);

      const result = await service.get(key);

      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test:key';
      mockRedis.del = jest.fn().mockResolvedValue(1);

      await service.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should check if key exists', async () => {
      const key = 'test:key';
      mockRedis.exists = jest.fn().mockResolvedValue(1);

      const result = await service.exists(key);

      expect(mockRedis.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate map cache', async () => {
      mockRedis.del = jest.fn().mockResolvedValue(1);

      await service.invalidateMapCache();

      expect(mockRedis.del).toHaveBeenCalledWith('vax:map:nodes');
    });

    it('should invalidate facility cache', async () => {
      const facilityId = 'facility-123';
      mockRedis.del = jest.fn().mockResolvedValue(1);

      await service.invalidateFacilityStock(facilityId);

      expect(mockRedis.del).toHaveBeenCalledWith(`vax:stock:facility:${facilityId}`);
    });

    it('should publish cache invalidation event', async () => {
      const channel = 'stock';
      const key = 'facility-123';
      mockRedis.publish = jest.fn().mockResolvedValue(1);

      await service.publishInvalidation(channel, key);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        `vax:cache:${channel}`,
        JSON.stringify({ key })
      );
    });
  });

  describe('TTL Configuration', () => {
    it('should set value with custom TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 600; // 10 minutes

      mockRedis.set = jest.fn().mockResolvedValue('OK');

      await service.set(key, value, { ttl });

      expect(mockRedis.set).toHaveBeenCalledWith(
        key,
        expect.stringContaining('"data":"test"'),
        'EX',
        ttl
      );
    });

    it('should use default TTL for stock data', async () => {
      const key = 'vax:stock:facility:123';
      const value = { quantity: 100 };

      mockRedis.set = jest.fn().mockResolvedValue('OK');

      await service.set(key, value);

      // Default stock TTL is 900 seconds (15 minutes)
      expect(mockRedis.set).toHaveBeenCalledWith(
        key,
        expect.any(String),
        'EX',
        900
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.ping = jest.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(service.onModuleInit()).rejects.toThrow();
    });

    it('should return null on get error', async () => {
      const key = 'test:key';
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Redis error'));

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should log error on set failure', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      mockRedis.set = jest.fn().mockRejectedValue(new Error('Set failed'));

      await expect(service.set(key, value)).resolves.not.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when connected', async () => {
      mockRedis.ping = jest.fn().mockResolvedValue('PONG');

      const health = await service.healthCheck();

      expect(health).toEqual({
        healthy: true,
        latency: expect.any(Number),
      });
    });

    it('should return down status on ping failure', async () => {
      mockRedis.ping = jest.fn().mockRejectedValue(new Error('Ping failed'));

      const health = await service.healthCheck();

      expect(health).toEqual({
        healthy: false,
      });
    });
  });
});
