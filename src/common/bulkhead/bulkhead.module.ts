import { Global, Module } from '@nestjs/common';
import { BulkheadService } from './bulkhead.service';

@Global()
@Module({
  providers: [BulkheadService],
  exports: [BulkheadService],
})
export class BulkheadModule {}
