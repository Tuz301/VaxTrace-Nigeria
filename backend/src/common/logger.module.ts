/**
 * VaxTrace Nigeria - Winston Logger Module
 *
 * Module configuration for Winston logger
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Module, Global } from '@nestjs/common';
import { WinstonLogger } from './logger.service';

@Global()
@Module({
  providers: [WinstonLogger],
  exports: [WinstonLogger],
})
export class WinstonLoggerModule {}
