/**
 * VaxTrace Nigeria - OpenLMIS OAuth2 Authentication Service
 * 
 * Handles OAuth2 authentication with OpenLMIS
 * Manages token lifecycle (fetch, refresh, cache)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

export interface OpenLMISToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface OpenLMISAuthConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  baseUrl: string;
  tokenEndpoint: string;
}

@Injectable()
export class OpenLMISAuthService {
  private readonly logger = new Logger(OpenLMISAuthService.name);
  private readonly TOKEN_CACHE_KEY = 'openlmis:access_token';
  private readonly TOKEN_EXPIRY_BUFFER = 300; // 5 minutes buffer before expiry

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get the OAuth2 configuration from environment variables
   */
  getAuthConfig(): OpenLMISAuthConfig {
    return {
      clientId: this.configService.get<string>('OPENLMIS_CLIENT_ID') || '',
      clientSecret: this.configService.get<string>('OPENLMIS_CLIENT_SECRET') || '',
      username: this.configService.get<string>('OPENLMIS_USERNAME') || '',
      password: this.configService.get<string>('OPENLMIS_PASSWORD') || '',
      baseUrl: this.configService.get<string>('OPENLMIS_BASE_URL') || '',
      tokenEndpoint: this.configService.get<string>('OPENLMIS_TOKEN_ENDPOINT') || '/oauth/token',
    };
  }

  /**
   * Check if OpenLMIS credentials are configured
   */
  isConfigured(): boolean {
    const config = this.getAuthConfig();
    return !!(
      config.clientId &&
      config.clientSecret &&
      config.username &&
      config.password &&
      config.baseUrl
    );
  }

  /**
   * Get a valid access token
   * Returns cached token if valid, otherwise fetches a new one
   */
  async getValidToken(): Promise<string> {
    // Check if we have a valid cached token
    const cachedToken = await this.cacheService.get<OpenLMISToken>(this.TOKEN_CACHE_KEY);
    
    if (cachedToken && this.isTokenValid(cachedToken)) {
      this.logger.debug('Using cached OpenLMIS access token');
      return cachedToken.access_token;
    }

    // Fetch new token
    this.logger.debug('Fetching new OpenLMIS access token');
    return await this.fetchNewToken();
  }

  /**
   * Fetch a new access token from OpenLMIS
   */
  async fetchNewToken(): Promise<string> {
    if (!this.isConfigured()) {
      this.logger.warn('OpenLMIS credentials not configured, using mock mode');
      return this.getMockToken();
    }

    const config = this.getAuthConfig();
    const tokenUrl = `${config.baseUrl}${config.tokenEndpoint}`;

    try {
      // OAuth2 Password Grant Flow
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', config.username);
      params.append('password', config.password);
      params.append('client_id', config.clientId);
      params.append('client_secret', config.clientSecret);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`OpenLMIS token request failed: ${response.statusText}`);
      }

      const tokenData: OpenLMISToken = await response.json();

      // Cache the token with expiry
      const cacheTTL = tokenData.expires_in - this.TOKEN_EXPIRY_BUFFER;
      await this.cacheService.set(this.TOKEN_CACHE_KEY, tokenData, { ttl: cacheTTL });

      this.logger.log('Successfully fetched and cached OpenLMIS access token');
      return tokenData.access_token;
    } catch (error) {
      this.logger.error('Failed to fetch OpenLMIS token:', error.message);
      
      // Fall back to mock mode for development
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Falling back to mock mode due to token fetch failure');
        return this.getMockToken();
      }
      
      throw error;
    }
  }

  /**
   * Refresh the access token using refresh token (if available)
   */
  async refreshToken(refreshToken: string): Promise<string> {
    const config = this.getAuthConfig();
    const tokenUrl = `${config.baseUrl}${config.tokenEndpoint}`;

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`OpenLMIS token refresh failed: ${response.statusText}`);
    }

    const tokenData: OpenLMISToken = await response.json();

    // Cache the new token
    const cacheTTL = tokenData.expires_in - this.TOKEN_EXPIRY_BUFFER;
    await this.cacheService.set(this.TOKEN_CACHE_KEY, tokenData, { ttl: cacheTTL });

    return tokenData.access_token;
  }

  /**
   * Check if a token is still valid
   */
  private isTokenValid(token: OpenLMISToken): boolean {
    // For simplicity, we rely on cache expiry
    // In production, you might want to check the token's expiry time
    return true;
  }

  /**
   * Get a mock token for development/testing
   */
  private getMockToken(): string {
    return 'mock_openlmis_token_' + Date.now();
  }

  /**
   * Invalidate the cached token (useful for logout or token revocation)
   */
  async invalidateToken(): Promise<void> {
    await this.cacheService.delete(this.TOKEN_CACHE_KEY);
    this.logger.log('OpenLMIS access token invalidated');
  }

  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
}
