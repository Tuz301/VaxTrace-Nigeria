/**
 * VaxTrace Nigeria - Delivery Module
 *
 * Handles delivery confirmation and tracking for field operations.
 * Integrates with LMD (Last-Mile Delivery) module for
 * offline-captured delivery data synchronization.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Module } from '@nestjs/common';

import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
