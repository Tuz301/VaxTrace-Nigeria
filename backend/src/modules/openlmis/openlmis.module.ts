import { Module } from '@nestjs/common';
import { OpenLMISController } from './openlmis.controller';
import { OpenLMISService } from './openlmis.service';
import { OpenLMISAuthService } from './openlmis-auth.service';
import { OpenLMISAPIClientService } from './openlmis-api-client.service';
import { CacheModule } from '../cache/cache.module';
import { ProtobufModule } from '../protobuf/protobuf.module';

@Module({
  imports: [CacheModule, ProtobufModule],
  controllers: [OpenLMISController],
  providers: [
    OpenLMISService,
    OpenLMISAuthService,
    OpenLMISAPIClientService,
  ],
  exports: [
    OpenLMISService,
    OpenLMISAuthService,
    OpenLMISAPIClientService,
  ],
})
export class OpenLMISModule {}
