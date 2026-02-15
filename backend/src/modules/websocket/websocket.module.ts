import { Module } from '@nestjs/common';
import { VaxTraceGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  providers: [VaxTraceGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
