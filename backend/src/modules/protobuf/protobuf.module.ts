import { Module, Global } from '@nestjs/common';
import { ProtobufService } from './protobuf.service';

@Global()
@Module({
  providers: [ProtobufService],
  exports: [ProtobufService],
})
export class ProtobufModule {}
