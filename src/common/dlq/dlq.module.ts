import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DlqService } from './dlq.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DlqService],
  exports: [DlqService],
})
export class DlqModule {}
