import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ClientSession } from 'mongoose';
import { randomUUID } from 'crypto';
import { OutboxEntry, OutboxStatus } from './entities/outbox-entry.entity';
import { OutboxPostgresRepository } from './repositories/outbox-postgres.repository';
import { OutboxMongoRepository } from './repositories/outbox-mongo.repository';

export interface OutboxPublishInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class OutboxService {
  constructor(
    private readonly outboxRepo: OutboxPostgresRepository,
    private readonly outboxMongoRepo: OutboxMongoRepository,
  ) {}

  async publish(input: OutboxPublishInput, entityManager?: EntityManager): Promise<void> {
    const entry: Partial<OutboxEntry> = {
      id: randomUUID(),
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      status: OutboxStatus.PENDING,
      createdAt: new Date(),
      publishedAt: null,
      retries: 0,
    };

    await this.outboxRepo.save(entry, entityManager);
  }

  async publishMongo(input: OutboxPublishInput, session?: ClientSession): Promise<void> {
    const doc = {
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      status: OutboxStatus.PENDING,
      createdAt: new Date(),
      publishedAt: null,
      retries: 0,
    };

    await this.outboxMongoRepo.create(doc, session);
  }
}
