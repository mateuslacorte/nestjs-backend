import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxEntry } from './entities/outbox-entry.entity';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema';
import { OutboxPostgresRepository } from './repositories/outbox-postgres.repository';
import { OutboxMongoRepository } from './repositories/outbox-mongo.repository';
import { OutboxService } from './outbox.service';
import { OutboxRelayService } from './outbox-relay.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEntry]),
    MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }]),
  ],
  providers: [OutboxPostgresRepository, OutboxMongoRepository, OutboxService, OutboxRelayService],
  exports: [OutboxService],
})
export class OutboxModule {}
