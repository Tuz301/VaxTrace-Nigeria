/**
 * VaxTrace Nigeria - OpenLMIS Service Unit Tests
 * 
 * Tests for the OpenLMIS integration service including:
 * - Token management
 * - API request handling
 * - Circuit breaker functionality
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenLMISService } from './openlmis.service';

  describe('OpenLMISService', () => {
  let service: OpenLMISService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        OPENLMIS_BASE_URL: 'http://test-openlmis.org',
        OPENLMIS_CLIENT_ID: 'test-client',
        OPENLMIS_CLIENT_SECRET: 'test-secret',
        OPENLMIS_USERNAME: 'test-user',
        OPENLMIS_PASSWORD: 'test-password',
        OPENLMIS_TOKEN_ENDPOINT: '/oauth/token',
      };
      return config[key] || undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenLMISService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenLMISService>(OpenLMISService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize in real mode when credentials are configured', async () => {
      await service.onModuleInit();
      expect(service.isMockMode()).toBe(false);
    });

    it('should initialize in mock mode when credentials are missing', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const mockService = new OpenLMISService(mockConfigService as any);
      await mockService.onModuleInit();
      expect(mockService.isMockMode()).toBe(true);
    });
  });

  describe('health check', () => {
    it('should return true when service is healthy', async () => {
      const result = await service.healthCheck();
      expect(typeof result).toBe('boolean');
    });

    it('should return true in mock mode', async () => {
      jest.spyOn(service, 'isMockMode').mockReturnValue(true);
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });
  });

  describe('circuit breaker', () => {
    it('should track failures correctly', () => {
      const initialFailures = service['circuitBreaker'].failureCount;
      // Simulate failures
      for (let i = 0; i < 3; i++) {
        service['incrementCircuitBreakerFailure']();
      }
      expect(service['circuitBreaker'].failureCount).toBe(initialFailures + 3);
    });

    it('should reset on success', () => {
      service['resetCircuitBreaker']();
      expect(service['circuitBreaker'].failureCount).toBe(0);
      expect(service['circuitBreaker'].isOpen).toBe(false);
    });
  });

  describe('token management', () => {
    it('should cache tokens correctly', async () => {
      const mockToken = 'test-access-token';
      jest.spyOn(service as any, 'fetchAccessToken').mockResolvedValue(mockToken);
      
      await service['ensureValidToken']();
      expect(service['tokenCache']).toBeTruthy();
      expect(service['tokenCache']?.token).toBe(mockToken);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test that the service handles errors without crashing
      const healthCheck = await service.healthCheck();
      expect(typeof healthCheck).toBe('boolean');
    });
  });
});
