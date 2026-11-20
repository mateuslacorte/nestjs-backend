import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEntry, OutboxStatus } from './entities/outbox-entry.entity';
import { OutboxPostgresRepository } from './repositories/outbox-postgres.repository';
import { OutboxMongoRepository, PendingMongoEntry } from './repositories/outbox-mongo.repository';
import { RedisPubSubService, PubSubMessage } from '@common/pubsub/redis-pubsub.service';

const MAX_RETRIES = 3;
const DEFAULT_INTERVAL_MS = 500;

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private relaying = false;

  constructor(
    private readonly outboxRepo: OutboxPostgresRepository,
    private readonly outboxMongoRepo: OutboxMongoRepository,
    private readonly pubSub: RedisPubSubService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs =
      this.configService.get<number>('outbox.relayIntervalMs') ?? DEFAULT_INTERVAL_MS;
    this.intervalId = setInterval(() => void this.relay(), intervalMs);
    this.logger.log(`Outbox relay started (interval: ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async relay(): Promise<void> {
    if (this.relaying) return;
    this.relaying = true;
    try {
      const [pgPending, mongoPending] = await Promise.all([
        this.outboxRepo.findPending(),
        this.outboxMongoRepo.findPending(),
      ]);

      for (const entry of pgPending) {
        await this.processEntry(entry);
      }
      for (const entry of mongoPending) {
        await this.processMongoEntry(entry);
      }
    } catch (err) {
      this.logger.error('Outbox relay error', err);
    } finally {
      this.relaying = false;
    }
  }

  private async processEntry(entry: OutboxEntry): Promise<void> {
    try {
      const { channel, message } = entry.payload as { channel: string; message: PubSubMessage };
      await this.pubSub.publish(channel, message);
      await this.outboxRepo.update(entry.id, {
        status: OutboxStatus.PUBLISHED,
        publishedAt: new Date(),
      });
      this.logger.debug(`Outbox entry published: ${entry.id} (${entry.eventType})`);
    } catch (err) {
      const newRetries = entry.retries + 1;
      const error = err instanceof Error ? err.message : String(err);

      if (newRetries > MAX_RETRIES) {
        await this.outboxRepo.update(entry.id, {
          status: OutboxStatus.FAILED,
          retries: newRetries,
        });
        this.logger.error(`Outbox entry failed permanently: ${entry.id} — ${error}`);
      } else {
        await this.outboxRepo.update(entry.id, { retries: newRetries });
        this.logger.warn(`Outbox entry retry ${newRetries}/${MAX_RETRIES}: ${entry.id} — ${error}`);
      }
    }
  }

  private async processMongoEntry(entry: PendingMongoEntry): Promise<void> {
    try {
      const { channel, message } = entry.payload as { channel: string; message: PubSubMessage };
      await this.pubSub.publish(channel, message);
      await this.outboxMongoRepo.update(entry.id, {
        status: 'published',
        publishedAt: new Date(),
      });
      this.logger.debug(`Mongo outbox entry published: ${entry.id} (${entry.eventType})`);
    } catch (err) {
      const newRetries = entry.retries + 1;
      const error = err instanceof Error ? err.message : String(err);

      if (newRetries > MAX_RETRIES) {
        await this.outboxMongoRepo.update(entry.id, {
          status: 'failed',
          retries: newRetries,
        });
        this.logger.error(`Mongo outbox entry failed permanently: ${entry.id} — ${error}`);
      } else {
        await this.outboxMongoRepo.update(entry.id, { retries: newRetries });
        this.logger.warn(`Mongo outbox entry retry ${newRetries}/${MAX_RETRIES}: ${entry.id} — ${error}`);
      }
    }
  }
}
