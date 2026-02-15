/**
 * VaxTrace Nigeria - Webhook Service Unit Tests
 * 
 * Tests for webhook processing including:
 * - Event queuing and processing
 * - Write-through cache pattern (race condition fix)
 * - Signature verification
 * - Alert deduplication
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { CacheService } from '../cache/cache.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        WEBHOOK_SECRET: 'test-webhook-secret',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock CacheService
    const cacheServiceMock = {
      invalidateMapCache: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      publishInvalidation: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    mockCacheService = cacheServiceMock as any;
    mockConfigService = mockConfig as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (service) {
      service.onModuleDestroy();
    }
  });

  describe('Signature Verification', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ type: 'test', data: {} });
      const secret = 'test-webhook-secret';
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(payload).digest('hex');
      const signature = digest;

      const result = service.verifySignature(payload, signature);

      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({ type: 'test', data: {} });
      const signature = 'invalid-signature';

      const result = service.verifySignature(payload, signature);

      expect(result).toBe(false);
    });

    it('should reject missing signature', () => {
      const payload = JSON.stringify({ type: 'test', data: {} });

      const result = service.verifySignature(payload, '');

      expect(result).toBe(false);
    });
  });

  describe('Event Processing (Race Condition Fix)', () => {
    it('should queue event for processing', async () => {
      const event = {
        type: 'stock.stockout',
        data: { facilityId: 'fac-123', productId: 'prod-456' },
      };

      await service.processEvent(event);

      const queueStatus = service.getQueueStatus();
      expect(queueStatus.queued).toBeGreaterThan(0);
    });

    it('should process stock event with write-through pattern', async () => {
      const event = {
        type: 'stock.stockout',
        data: { facilityId: 'fac-123', productId: 'prod-456' },
      };

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Verify cache invalidation happens (step 2 of write-through pattern)
      expect(mockCacheService.invalidateMapCache).toHaveBeenCalled();
      expect(mockCacheService.del).toHaveBeenCalledWith('vax:facility:fac-123:stock');
      expect(mockCacheService.del).toHaveBeenCalledWith('vax:product:prod-456:stock');
    });

    it('should process requisition event with write-through pattern', async () => {
      const event = {
        type: 'requisition.created',
        data: { requisitionId: 'req-789', facilityId: 'fac-123' },
      };

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Verify cache invalidation
      expect(mockCacheService.del).toHaveBeenCalledWith('vax:requisition:req-789');
      expect(mockCacheService.del).toHaveBeenCalledWith('vax:facility:fac-123:requisitions');
    });

    it('should process facility event with write-through pattern', async () => {
      const event = {
        type: 'facility.updated',
        data: { facilityId: 'fac-123' },
      };

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Verify cache invalidation
      expect(mockCacheService.del).toHaveBeenCalledWith('vax:facility:fac-123');
      expect(mockCacheService.del).toHaveBeenCalledWith('vax:facilities:all');
    });

    it('should publish cache invalidation event after processing', async () => {
      const event = {
        type: 'stock.stockout',
        data: { facilityId: 'fac-123', productId: 'prod-456' },
      };

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Verify publishInvalidation is called (step 3 of write-through pattern)
      expect(mockCacheService.publishInvalidation).toHaveBeenCalledWith('stock', 'fac-123');
    });
  });

  describe('Alert Deduplication', () => {
    it('should create stockout alert', async () => {
      const event = {
        type: 'stock.stockout',
        data: { facilityId: 'fac-123', productId: 'prod-456' },
      };

      mockCacheService.get = jest.fn().mockResolvedValue(null);

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Verify alert is created
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'vax:alert:stockout:fac-123:prod-456',
        expect.objectContaining({
          type: 'stockout',
          severity: 'critical',
          facilityId: 'fac-123',
          productId: 'prod-456',
        }),
        expect.any(Object)
      );
    });

    it('should deduplicate existing stockout alert', async () => {
      const event = {
        type: 'stock.stockout',
        data: { facilityId: 'fac-123', productId: 'prod-456' },
      };

      // Mock existing alert
      const existingAlert = {
        id: 'stockout:fac-123:prod-456',
        type: 'stockout',
        createdAt: new Date().toISOString(),
      };
      mockCacheService.get = jest.fn().mockResolvedValue(existingAlert);

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Verify alert is NOT created again (deduplication)
      expect(mockCacheService.set).not.toHaveBeenCalledWith(
        'vax:alert:stockout:fac-123:prod-456',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Queue Management', () => {
    it('should track queue status', async () => {
      const event1 = { type: 'test1', data: {} };
      const event2 = { type: 'test2', data: {} };

      await service.processEvent(event1);
      await service.processEvent(event2);

      const status = service.getQueueStatus();

      expect(status.queued).toBe(2);
      expect(status.processed).toBe(0);
    });

    it('should remove processed events from queue', async () => {
      const event = {
        type: 'stock.stockout',
        data: { facilityId: 'fac-123', productId: 'prod-456' },
      };

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      const status = service.getQueueStatus();

      expect(status.queued).toBe(0);
    });

    it('should keep failed events in queue for retry', async () => {
      const event = {
        type: 'stock.stockout',
        data: { facilityId: 'fac-123', productId: 'prod-456' },
      };

      // Simulate processing failure
      mockCacheService.invalidateMapCache = jest.fn().mockRejectedValue(
        new Error('Cache invalidation failed')
      );

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      const status = service.getQueueStatus();

      // Event should still be in queue (not processed)
      expect(status.queued).toBeGreaterThan(0);
    });
  });

  describe('Event Type Handling', () => {
    it('should handle unknown event types', async () => {
      const event = {
        type: 'unknown.event',
        data: {},
      };

      await service.processEvent(event);

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // Should not throw error, just log warning
      expect(mockCacheService.invalidateMapCache).not.toHaveBeenCalled();
    });

    it('should handle all requisition event types', async () => {
      const requisitionEvents = [
        'requisition.created',
        'requisition.updated',
        'requisition.approved',
        'requisition.released',
        'requisition.completed',
      ];

      for (const eventType of requisitionEvents) {
        const event = {
          type: eventType,
          data: { requisitionId: 'req-123', facilityId: 'fac-456' },
        };

        await service.processEvent(event);
      }

      // Fast forward timer to trigger processing
      jest.advanceTimersByTime(1000);

      // Wait for async processing
      await new Promise(resolve => setImmediate(resolve));

      // All events should be processed
      expect(mockCacheService.invalidateMapCache).toHaveBeenCalledTimes(5);
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on module destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
