import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';

interface OpenLMISWebhook {
  eventType: string;
  entityId: string;
  entityType: string;
  data: any;
  timestamp: string;
}

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
  @ApiResponse({ status: 200, description: 'Webhook received successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleOpenLMISWebhook(@Body() payload: OpenLMISWebhook) {
    this.logger.log(`Received OpenLMIS webhook: ${payload.eventType}`);

    // Verify signature if secret is configured
    const signature = this.configService.get<string>('WEBHOOK_SIGNATURE');
    if (signature) {
      const isValid = this.webhookService.verifySignature(
        JSON.stringify(payload),
        signature
      );
      
      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new Error('Invalid signature');
      }
    }

    // Process the webhook
    await this.webhookService.processEvent(payload);

    return {
      success: true,
      message: 'Webhook processed successfully',
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
