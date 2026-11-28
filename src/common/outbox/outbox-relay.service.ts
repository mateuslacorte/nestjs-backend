import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Counter, register } from '@prometheus-io/client';
import { OutboxEntry, OutboxStatus } from './entities/outbox-entry.entity';
import { OutboxPostgresRepository } from './repositories/outbox-postgres.repository';
import { OutboxMongoRepository, PendingMongoEntry } from './repositories/outbox-mongo.repository';
import { RedisPubSubService, PubSubMessage } from '@common/pubsub/redis-pubsub.service';

const MAX_RETRIES = 3;
const DEFAULT_INTERVAL_MS = 500;
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_FAILED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const OUTBOX_PUBLISHED_METRIC = 'outbox_published_total';
const OUTBOX_FAILED_METRIC = 'outbox_failed_total';

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly publishedCounter: Counter<string>;
  private readonly failedCounter: Counter<string>;
  private intervalId: NodeJS.Timeout | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private relaying = false;

  constructor(
    private readonly outboxRepo: OutboxPostgresRepository,
    private readonly outboxMongoRepo: OutboxMongoRepository,
    private readonly pubSub: RedisPubSubService,
    private readonly configService: ConfigService,
  ) {
    const existingPublished = register.getSingleMetric(OUTBOX_PUBLISHED_METRIC);
    this.publishedCounter = existingPublished
      ? (existingPublished as unknown as Counter<string>)
      : new Counter({
          name: OUTBOX_PUBLISHED_METRIC,
          help: 'Outbox entries successfully published',
          labelNames: ['store'],
        });

    const existingFailed = register.getSingleMetric(OUTBOX_FAILED_METRIC);
    this.failedCounter = existingFailed
      ? (existingFailed as unknown as Counter<string>)
      : new Counter({
          name: OUTBOX_FAILED_METRIC,
          help: 'Outbox entries that permanently failed (max retries exceeded)',
          labelNames: ['store'],
        });
  }

  onModuleInit(): void {
    const intervalMs =
      this.configService.get<number>('outbox.relayIntervalMs') ?? DEFAULT_INTERVAL_MS;

    const scheduleRelay = () => {
      this.intervalId = setTimeout(async () => {
        await this.relay();
        if (this.intervalId !== null) scheduleRelay();
      }, intervalMs);
    };
    scheduleRelay();

    const cleanupIntervalMs =
      this.configService.get<number>('outbox.cleanupIntervalMs') ?? DEFAULT_CLEANUP_INTERVAL_MS;

    const scheduleCleanup = () => {
      this.cleanupIntervalId = setTimeout(async () => {
        await this.purgeOldFailed();
        if (this.cleanupIntervalId !== null) scheduleCleanup();
      }, cleanupIntervalMs);
    };
    scheduleCleanup();

    console.log(`Outbox relay started (interval: ${intervalMs}ms, cleanup every: ${cleanupIntervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    if (this.cleanupIntervalId) {
      clearTimeout(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
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
      console.error('Outbox relay error', err);
    } finally {
      this.relaying = false;
    }
  }

  async purgeOldFailed(): Promise<void> {
    const ttlMs =
      this.configService.get<number>('outbox.failedTtlMs') ?? DEFAULT_FAILED_TTL_MS;
    const [pgDeleted, mongoDeleted] = await Promise.all([
      this.outboxRepo.purgeOldFailed(ttlMs),
      this.outboxMongoRepo.purgeOldFailed(ttlMs),
    ]);
    if (pgDeleted + mongoDeleted > 0) {
      console.log(
        `Outbox cleanup: purged ${pgDeleted} Postgres + ${mongoDeleted} Mongo FAILED entries older than ${ttlMs}ms`,
      );
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
      this.publishedCounter.inc({ store: 'postgres' });
      console.debug(`Outbox entry published: ${entry.id} (${entry.eventType})`);
    } catch (err) {
      const newRetries = entry.retries + 1;
      const error = err instanceof Error ? err.message : String(err);

      if (newRetries > MAX_RETRIES) {
        await this.outboxRepo.update(entry.id, {
          status: OutboxStatus.FAILED,
          retries: newRetries,
        });
        this.failedCounter.inc({ store: 'postgres' });
        console.error(`Outbox entry failed permanently: ${entry.id} — ${error}`);
      } else {
        await this.outboxRepo.update(entry.id, { retries: newRetries });
        console.warn(`Outbox entry retry ${newRetries}/${MAX_RETRIES}: ${entry.id} — ${error}`);
      }
    }
  }

  private async processMongoEntry(entry: PendingMongoEntry): Promise<void> {
    try {
      const { channel, message } = entry.payload as { channel: string; message: PubSubMessage };
      await this.pubSub.publish(channel, message);
      await this.outboxMongoRepo.update(entry.id, {
        status: OutboxStatus.PUBLISHED,
        publishedAt: new Date(),
      });
      this.publishedCounter.inc({ store: 'mongo' });
      console.debug(`Mongo outbox entry published: ${entry.id} (${entry.eventType})`);
    } catch (err) {
      const newRetries = entry.retries + 1;
      const error = err instanceof Error ? err.message : String(err);

      if (newRetries > MAX_RETRIES) {
        await this.outboxMongoRepo.update(entry.id, {
          status: OutboxStatus.FAILED,
          retries: newRetries,
        });
        this.failedCounter.inc({ store: 'mongo' });
        console.error(`Mongo outbox entry failed permanently: ${entry.id} — ${error}`);
      } else {
        await this.outboxMongoRepo.update(entry.id, { retries: newRetries });
        console.warn(`Mongo outbox entry retry ${newRetries}/${MAX_RETRIES}: ${entry.id} — ${error}`);
      }
    }
  }
}
