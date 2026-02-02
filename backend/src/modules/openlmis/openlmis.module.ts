import { Module } from '@nestjs/common';
import { OpenLMISController } from './openlmis.controller';
import { OpenLMISService } from './openlmis.service';
import { CacheModule } from '../cache/cache.module';
import { ProtobufModule } from '../protobuf/protobuf.module';

@Module({
  imports: [CacheModule, ProtobufModule],
  controllers: [OpenLMISController],
  providers: [OpenLMISService],
  exports: [OpenLMISService],
})
export class OpenLMISModule {}
