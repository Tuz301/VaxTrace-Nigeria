import { Module } from '@nestjs/common';
import { LMDController } from './lmd.controller';
import { LMDService } from './lmd.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [LMDController],
  providers: [LMDService],
  exports: [LMDService],
})
export class LMDModule {}
