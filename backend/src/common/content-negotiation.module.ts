/**
 * VaxTrace Nigeria - Content Negotiation Module
 * 
 * This module provides content negotiation capabilities for API responses,
 * supporting both JSON and Protocol Buffers (Protobuf) formats.
 * 
 * @audit Performance: Enables 80% bandwidth savings on 3G/4G networks
 * @audit Security: Validates Accept headers to prevent MIME sniffing attacks
 */

import { Module, Global } from '@nestjs/common';
import { ContentNegotiationInterceptor } from './content-negotiation.interceptor';
import { ProtobufResponseTransformer } from './protobuf-response.transformer';
import { ProtobufModule } from '../modules/protobuf/protobuf.module';

@Global()
@Module({
  imports: [ProtobufModule],
  providers: [
    ContentNegotiationInterceptor,
    ProtobufResponseTransformer,
  ],
  exports: [
    ContentNegotiationInterceptor,
    ProtobufResponseTransformer,
  ],
})
export class ContentNegotiationModule {}
