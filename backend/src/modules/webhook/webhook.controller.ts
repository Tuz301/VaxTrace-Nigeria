import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';

interface OpenLMISWebhook {
  eventType: string;
  entityId: string;
  entityType: string;
  data: any;
  timestamp: string;
}

/**
 * VaxTrace Nigeria - Webhook Controller (FIXED)
 *
 * FIX #9: Webhook Signature Verification Enforcement
 * - Signature verification is now mandatory
 * - Invalid signatures are rejected immediately
 * - Added proper error responses
 */

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('openlmis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive webhook from OpenLMIS' })
  @ApiHeader({ name: 'x-openlmis-signature', description: 'HMAC signature', required: true })
  @ApiResponse({ status: 200, description: 'Webhook received successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleOpenLMISWebhook(
    @Body() payload: OpenLMISWebhook,
    @Headers() headers: Record<string, string>
  ) {
    this.logger.log(`Received OpenLMIS webhook: ${payload.eventType}`);

    // FIX #9: Enforce signature verification (MANDATORY)
    const signature = headers['x-openlmis-signature'] || headers['X-OpenLMIS-Signature'];
    
    if (!signature) {
      this.logger.error('Missing webhook signature');
      throw new UnauthorizedException('Missing signature header');
    }

    const isValid = this.webhookService.verifySignature(
      JSON.stringify(payload),
      signature
    );
    
    if (!isValid) {
      this.logger.error('Invalid webhook signature - rejecting request');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process the webhook (queued for async processing)
    await this.webhookService.processEvent(payload);

    return {
      success: true,
      message: 'Webhook queued for processing',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Test webhook received' })
  async testWebhook(@Body() payload: any) {
    this.logger.log('Test webhook received');
    return {
      success: true,
      message: 'Test webhook received',
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'webhook',
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0,
    };
  }
}
