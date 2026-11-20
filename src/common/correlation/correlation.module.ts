import { Global, Module } from '@nestjs/common';
import { CorrelationMiddleware } from './correlation.middleware';

@Global()
@Module({
  providers: [CorrelationMiddleware],
  exports: [CorrelationMiddleware],
})
export class CorrelationModule {}
