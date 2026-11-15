import { Global, Module } from '@nestjs/common';
import { OperationStatusService } from './operation-status.service';
import { OperationsController } from './operations.controller';

@Global()
@Module({
  controllers: [OperationsController],
  providers: [OperationStatusService],
  exports: [OperationStatusService],
})
export class OperationsModule {}
