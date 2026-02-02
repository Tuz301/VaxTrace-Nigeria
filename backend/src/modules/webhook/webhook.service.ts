import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET') || 'default-secret';
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  /**
   * Process webhook event
   */
  async processEvent(event: any): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'requisition.created':
      case 'requisition.updated':
      case 'requisition.approved':
      case 'requisition.released':
      case 'requisition.completed':
        await this.handleRequisitionEvent(event);
        break;

      case 'stock.stocked':
      case 'stock.stockout':
      case 'stock.adjustment':
        await this.handleStockEvent(event);
        break;

      case 'facility.created':
      case 'facility.updated':
        await this.handleFacilityEvent(event);
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * Handle requisition events
   */
  private async handleRequisitionEvent(event: any): Promise<void> {
    const { requisitionId, facilityId } = event.data;

    // Invalidate relevant cache
    await this.cacheService.invalidateMapCache();
    await this.cacheService.del(`vax:requisition:${requisitionId}`);
    await this.cacheService.del(`vax:facility:${facilityId}:requisitions`);

    this.logger.log(`Requisition event processed: ${event.type} for requisition ${requisitionId}`);
  }

  /**
   * Handle stock events
   */
  private async handleStockEvent(event: any): Promise<void> {
    const { facilityId, productId } = event.data;

    // Invalidate relevant cache
    await this.cacheService.invalidateMapCache();
    await this.cacheService.del(`vax:facility:${facilityId}:stock`);
    await this.cacheService.del(`vax:product:${productId}:stock`);

    // Check if stockout and create alert
    if (event.type === 'stock.stockout') {
      await this.createStockoutAlert(facilityId, productId);
    }

    this.logger.log(`Stock event processed: ${event.type} for facility ${facilityId}`);
  }

  /**
   * Handle facility events
   */
  private async handleFacilityEvent(event: any): Promise<void> {
    const { facilityId } = event.data;

    // Invalidate relevant cache
    await this.cacheService.invalidateMapCache();
    await this.cacheService.del(`vax:facility:${facilityId}`);
    await this.cacheService.del(`vax:facilities:all`);

    this.logger.log(`Facility event processed: ${event.type} for facility ${facilityId}`);
  }

  /**
   * Create stockout alert
   */
  private async createStockoutAlert(facilityId: string, productId: string): Promise<void> {
    const alert = {
      id: `alert-${Date.now()}`,
      type: 'STOCKOUT',
      severity: 'CRITICAL',
      facilityId,
      productId,
      message: `Stockout detected for product ${productId} at facility ${facilityId}`,
      createdAt: new Date().toISOString(),
    };

    // Store alert in cache for immediate visibility
    await this.cacheService.set(`vax:alert:${alert.id}`, alert, { ttl: 3600 });

    this.logger.log(`Stockout alert created: ${alert.id}`);
  }
}
