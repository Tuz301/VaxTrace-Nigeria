/**
 * VaxTrace Nigeria - OpenLMIS Integration Service
 * 
 * This module handles the OAuth2 authentication and API communication
 * with OpenLMIS. It implements the "Headless Service Account" pattern
 * where credentials never reach the frontend.
 * 
 * Features:
 * - OAuth2 token exchange with automatic refresh
 * - Request/response logging for audit trails
 * - Retry logic with exponential backoff
 * - Circuit breaker for fault tolerance
 * - Request signing for webhook verification
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';

// ============================================
// TYPES
// ============================================

interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface TokenCache {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  params?: Record<string, unknown>;
  data?: unknown;
  retries?: number;
}

interface CircuitBreakerState {
  isOpen: boolean;
  lastFailureTime: Date;
  failureCount: number;
  lastSuccessTime: Date;
}

// ============================================
// SERVICE
// ============================================

@Injectable()
export class OpenLMISService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenLMISService.name);
  private readonly axiosInstance: AxiosInstance;
  private tokenCache: TokenCache | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private mockMode: boolean = false;
  
  // Circuit breaker state
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    lastFailureTime: new Date(),
    failureCount: 0,
    lastSuccessTime: new Date(),
  };
  
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // Reset after 60 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // Base delay in ms

  constructor(private readonly configService: ConfigService) {
    // Configure axios instance
    this.axiosInstance = axios.create({
      baseURL: this.configService.get<string>('OPENLMIS_BASE_URL'),
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(
          `[OpenLMIS Request] ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        this.logger.error(`[OpenLMIS Request Error] ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `[OpenLMIS Response] ${response.status} ${response.config.url}`
        );
        // Reset circuit breaker on success
        this.resetCircuitBreaker();
        return response;
      },
      (error: AxiosError) => {
        this.logger.error(
          `[OpenLMIS Response Error] ${error.response?.status || 'NETWORK'} ${error.config?.url}`
        );
        // Increment circuit breaker failure count
        this.incrementCircuitBreakerFailure();
        return Promise.reject(error);
      }
    );
  }

  async onModuleInit() {
    this.logger.log('Initializing OpenLMIS Service...');
    
    // Check if OpenLMIS credentials are configured
    const clientId = this.configService.get<string>('OPENLMIS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('OPENLMIS_CLIENT_SECRET');
    const username = this.configService.get<string>('OPENLMIS_USERNAME');
    const password = this.configService.get<string>('OPENLMIS_PASSWORD');

    if (!clientId || !clientSecret || !username || !password ||
          clientId === 'your_openlmis_api_key_here' ||
          password === 'your_service_account_password_here') {
      this.logger.warn('OpenLMIS credentials not configured. Service will run in mock mode.');
      this.mockMode = true;
      this.logger.log('OpenLMIS Service initialized in mock mode');
      return;
    }

    // Real mode - credentials are properly configured
    this.mockMode = false;
    this.logger.log('OpenLMIS Service initialized in real mode');
    
    // Initial token fetch
    await this.ensureValidToken();
    
    // Schedule token refresh before expiry
    this.scheduleTokenRefresh();
    
    // FIX #4: Start circuit breaker auto-reset checker
    this.startCircuitBreakerChecker();
    
    this.logger.log('OpenLMIS Service initialized successfully');
  }

  onModuleDestroy() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Ensures a valid access token is available
   * Fetches new token if current one is expired or missing
   */
  private async ensureValidToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expiresAt > new Date()) {
      return this.tokenCache.token;
    }

    // Fetch new token
    return this.fetchAccessToken();
  }

  /**
   * Fetches a new access token from OpenLMIS
   * Uses OAuth2 password grant flow
   */
  private async fetchAccessToken(): Promise<string> {
    const clientId = this.configService.get<string>('OPENLMIS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('OPENLMIS_CLIENT_SECRET');
    const username = this.configService.get<string>('OPENLMIS_USERNAME');
    const password = this.configService.get<string>('OPENLMIS_PASSWORD');

    if (!clientId || !clientSecret || !username || !password) {
      throw new Error('OpenLMIS credentials not configured');
    }

    try {
      // Create Basic Auth header
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await this.axiosInstance.post<TokenResponse>(
        '/api/oauth/token',
        new URLSearchParams({
          grant_type: 'password',
          username,
          password,
        }),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData = response.data;
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Cache token (refresh 5 minutes before expiry)
      this.tokenCache = {
        token: tokenData.access_token,
        expiresAt: new Date(expiresAt.getTime() - 5 * 60 * 1000),
        refreshToken: tokenData.refresh_token,
      };

      this.logger.log('Successfully fetched new OpenLMIS access token');
      
      return tokenData.access_token;
    } catch (error) {
      this.logger.error('Failed to fetch OpenLMIS access token', error.stack);
      throw new Error('OpenLMIS authentication failed');
    }
  }

  /**
   * Schedules automatic token refresh before expiry
   */
  private scheduleTokenRefresh() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    if (!this.tokenCache) {
      return;
    }

    const timeUntilExpiry = this.tokenCache.expiresAt.getTime() - Date.now();
    
    // Refresh 5 minutes before expiry
    const refreshDelay = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0);

    this.tokenRefreshTimer = setTimeout(async () => {
      this.logger.log('Refreshing OpenLMIS token...');
      await this.fetchAccessToken();
      this.scheduleTokenRefresh();
    }, refreshDelay);
  }

  /**
   * FIX #4: Start circuit breaker auto-reset checker
   * Proactively checks and resets circuit breaker after timeout
   */
  private startCircuitBreakerChecker(): void {
    // Check every 30 seconds
    setInterval(async () => {
      if (this.circuitBreaker.isOpen) {
        const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime.getTime();
        
        if (timeSinceLastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
          this.logger.log('Circuit breaker timeout elapsed - attempting reset...');
          
          // Try a health check to see if OpenLMIS is back
          try {
            await this.healthCheck();
            this.resetCircuitBreaker();
            this.logger.log('Circuit breaker reset successfully after timeout');
          } catch (error) {
            this.logger.warn('Circuit breaker reset failed - OpenLMIS still unavailable');
          }
        }
      }
    }, 30000); // Check every 30 seconds
    
    this.logger.log('Circuit breaker auto-reset checker started');
  }

  // ============================================
  // API REQUEST METHODS
  // ============================================

  /**
   * Makes an authenticated request to OpenLMIS
   * Handles token refresh, retries, and circuit breaker
   */
  async request<T>(config: RequestConfig): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('Circuit breaker is open. OpenLMIS requests are temporarily disabled.');
    }

    // Ensure valid token
    const token = await this.ensureValidToken();

    // Build request config
    const axiosConfig = {
      method: config.method,
      url: config.endpoint,
      params: config.params,
      data: config.data,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };

    // Execute request with retries
    return this.executeWithRetry<T>(axiosConfig, config.retries || this.MAX_RETRIES);
  }

  /**
   * Executes request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    config: any,
    retriesLeft: number
  ): Promise<T> {
    try {
      const response = await this.axiosInstance.request<T>(config);
      return response.data;
    } catch (error) {
      if (retriesLeft <= 0) {
        throw error;
      }

      // Check if error is retryable
      const axiosError = error as AxiosError;
      const isRetryable = 
        !axiosError.response || 
        axiosError.response.status >= 500 || 
        axiosError.code === 'ECONNRESET' ||
        axiosError.code === 'ETIMEDOUT';

      if (!isRetryable) {
        throw error;
      }

      // Exponential backoff
      const delay = this.RETRY_DELAY * Math.pow(2, this.MAX_RETRIES - retriesLeft);
      this.logger.warn(`Request failed, retrying in ${delay}ms... (${retriesLeft} retries left)`);

      await this.sleep(delay);
      return this.executeWithRetry<T>(config, retriesLeft - 1);
    }
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ method: 'GET', endpoint, params });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: 'POST', endpoint, data });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: 'PUT', endpoint, data });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', endpoint, data });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', endpoint });
  }

  // ============================================
  // CIRCUIT BREAKER
  // ============================================

  private incrementCircuitBreakerFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.isOpen = true;
      this.logger.warn('Circuit breaker opened due to repeated failures');
    }
  }

  private resetCircuitBreaker() {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastSuccessTime = new Date();
    
    if (this.circuitBreaker.isOpen) {
      this.circuitBreaker.isOpen = false;
      this.logger.log('Circuit breaker closed');
    }
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }

    // Check if timeout has elapsed
    const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime.getTime();
    if (timeSinceLastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
      this.resetCircuitBreaker();
      return false;
    }

    return true;
  }

  // ============================================
  // WEBHOOK SIGNATURE
  // ============================================

  /**
   * Verifies webhook signature from OpenLMIS
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    // Create HMAC SHA256 signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const crypto2 = require('crypto');
    return crypto2.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ============================================
  // UTILITIES
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check for OpenLMIS connectivity
   * Returns true if OpenLMIS is accessible, false otherwise
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck(): Promise<boolean> {
    if (this.mockMode) {
      this.logger.debug('OpenLMIS in mock mode - health check skipped');
      return false;
    }

    try {
      await this.get('/api/system/info');
      this.logger.debug('OpenLMIS health check passed');
      return true;
    } catch (error) {
      this.logger.warn('OpenLMIS health check failed');
      return false;
    }
  }

  /**
   * Get current mock mode status
   */
  isMockMode(): boolean {
    return this.mockMode;
  }
}
