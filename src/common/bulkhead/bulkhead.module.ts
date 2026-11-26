import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BulkheadService } from './bulkhead.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [BulkheadService],
  exports: [BulkheadService],
})
export class BulkheadModule {}
