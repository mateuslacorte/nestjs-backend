import { OutboxRelayService } from './outbox-relay.service';
import { OutboxEntry, OutboxStatus } from './entities/outbox-entry.entity';
import { OutboxPostgresRepository } from './repositories/outbox-postgres.repository';
import { OutboxMongoRepository, PendingMongoEntry } from './repositories/outbox-mongo.repository';
import { RedisPubSubService } from '@common/pubsub/redis-pubsub.service';
import { ConfigService } from '@nestjs/config';

jest.useFakeTimers();

const makeEntry = (overrides: Partial<OutboxEntry> = {}): OutboxEntry => ({
  id: 'entry-1',
  aggregateType: 'User',
  aggregateId: 'user-1',
  eventType: 'user.created',
  payload: {
    channel: 'domain',
    message: { event: 'user.created', operationId: 'op-1', payload: { userId: 'user-1' } },
  },
  status: OutboxStatus.PENDING,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  publishedAt: null,
  retries: 0,
  ...overrides,
});

const makeMongoEntry = (overrides: Partial<PendingMongoEntry> = {}): PendingMongoEntry => ({
  id: 'mongo-id-1',
  eventType: 'user.created',
  payload: {
    channel: 'domain',
    message: { event: 'user.created', operationId: 'op-1', payload: { userId: 'user-1' } },
  },
  retries: 0,
  ...overrides,
});

describe('OutboxRelayService', () => {
  let outboxRepo: jest.Mocked<Pick<OutboxPostgresRepository, 'findPending' | 'update' | 'purgeOldFailed'>>;
  let outboxMongoRepo: jest.Mocked<Pick<OutboxMongoRepository, 'findPending' | 'update' | 'purgeOldFailed'>>;
  let pubSub: jest.Mocked<Pick<RedisPubSubService, 'publish'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let service: OutboxRelayService;

  beforeEach(() => {
    outboxRepo = { findPending: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue(undefined), purgeOldFailed: jest.fn().mockResolvedValue(0) };
    outboxMongoRepo = { findPending: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue(undefined), purgeOldFailed: jest.fn().mockResolvedValue(0) };
    pubSub = { publish: jest.fn() } as unknown as jest.Mocked<Pick<RedisPubSubService, 'publish'>>;
    configService = { get: jest.fn().mockReturnValue(undefined) } as unknown as jest.Mocked<Pick<ConfigService, 'get'>>;
    service = new OutboxRelayService(
      outboxRepo as unknown as OutboxPostgresRepository,
      outboxMongoRepo as unknown as OutboxMongoRepository,
      pubSub as unknown as RedisPubSubService,
      configService as unknown as ConfigService,
    );
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllTimers();
  });

  describe('onModuleInit', () => {
    it('starts the interval with 500ms default', () => {
      service.onModuleInit();
      expect(service['intervalId']).not.toBeNull();
    });

    it('uses the configured interval when set', () => {
      configService.get.mockReturnValue(1000);
      service.onModuleInit();
      expect(service['intervalId']).not.toBeNull();
    });

    it('fires relay on tick', async () => {
      service.onModuleInit();

      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(outboxRepo.findPending).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('clears the interval', () => {
      service.onModuleInit();
      service.onModuleDestroy();
      expect(service['intervalId']).toBeNull();
    });

    it('is safe to call when not initialised', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('relay', () => {
    it('finds pending entries from both Postgres and MongoDB', async () => {
      await service.relay();

      expect(outboxRepo.findPending).toHaveBeenCalled();
      expect(outboxMongoRepo.findPending).toHaveBeenCalled();
    });

    it('processes Postgres and MongoDB entries in one tick', async () => {
      const pgEntries = [makeEntry({ id: 'pg-1' }), makeEntry({ id: 'pg-2' })];
      const mongoEntries = [makeMongoEntry({ id: 'mg-1' })];
      outboxRepo.findPending.mockResolvedValue(pgEntries);
      outboxMongoRepo.findPending.mockResolvedValue(mongoEntries);
      pubSub.publish.mockResolvedValue(undefined);

      await service.relay();

      expect(pubSub.publish).toHaveBeenCalledTimes(3);
    });

    it('skips when already relaying (concurrent guard)', async () => {
      service['relaying'] = true;

      await service.relay();

      expect(outboxRepo.findPending).not.toHaveBeenCalled();
      expect(outboxMongoRepo.findPending).not.toHaveBeenCalled();
    });

    it('resets relaying flag even when findPending throws', async () => {
      outboxRepo.findPending.mockRejectedValue(new Error('db error'));

      await service.relay();

      expect(service['relaying']).toBe(false);
    });

    it('does nothing when no pending entries', async () => {
      await service.relay();

      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('purgeOldFailed', () => {
    it('calls purgeOldFailed on both repos with the configured TTL', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'outbox.failedTtlMs') return 86_400_000; // 1 day
        return undefined;
      });
      await service.purgeOldFailed();
      expect(outboxRepo.purgeOldFailed).toHaveBeenCalledWith(86_400_000);
      expect(outboxMongoRepo.purgeOldFailed).toHaveBeenCalledWith(86_400_000);
    });

    it('uses default 7-day TTL when config is absent', async () => {
      await service.purgeOldFailed();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(outboxRepo.purgeOldFailed).toHaveBeenCalledWith(sevenDaysMs);
      expect(outboxMongoRepo.purgeOldFailed).toHaveBeenCalledWith(sevenDaysMs);
    });

    it('logs when entries are purged', async () => {
      outboxRepo.purgeOldFailed.mockResolvedValue(3);
      outboxMongoRepo.purgeOldFailed.mockResolvedValue(1);
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

      await service.purgeOldFailed();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('purged 3 Postgres + 1 Mongo'));
    });

    it('does not log when nothing was purged', async () => {
      outboxRepo.purgeOldFailed.mockResolvedValue(0);
      outboxMongoRepo.purgeOldFailed.mockResolvedValue(0);
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

      await service.purgeOldFailed();

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('cleanup interval is started on onModuleInit', () => {
      service.onModuleInit();
      expect(service['cleanupIntervalId']).not.toBeNull();
    });

    it('cleanup interval is cleared on onModuleDestroy', () => {
      service.onModuleInit();
      service.onModuleDestroy();
      expect(service['cleanupIntervalId']).toBeNull();
    });
  });

  describe('processEntry — Postgres (via relay)', () => {
    it('publishes the message and marks entry as published', async () => {
      const entry = makeEntry();
      outboxRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockResolvedValue(undefined);

      await service.relay();

      expect(pubSub.publish).toHaveBeenCalledWith('domain', {
        event: 'user.created',
        operationId: 'op-1',
        payload: { userId: 'user-1' },
      });
      expect(outboxRepo.update).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ status: OutboxStatus.PUBLISHED }),
      );
    });

    it('increments retries on publish failure (below max)', async () => {
      const entry = makeEntry({ retries: 0 });
      outboxRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(outboxRepo.update).toHaveBeenCalledWith('entry-1', { retries: 1 });
      expect(outboxRepo.update).not.toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ status: OutboxStatus.FAILED }),
      );
    });

    it('marks entry as FAILED after max retries exceeded', async () => {
      const entry = makeEntry({ retries: 3 });
      outboxRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(outboxRepo.update).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ status: OutboxStatus.FAILED, retries: 4 }),
      );
    });

    it('handles non-Error throws when logging failure', async () => {
      const entry = makeEntry({ retries: 3 });
      outboxRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockRejectedValue('string error');

      await service.relay();

      expect(outboxRepo.update).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ status: OutboxStatus.FAILED }),
      );
    });

    it('publishes to the correct channel from payload', async () => {
      const entry = makeEntry({
        payload: {
          channel: 'my-channel',
          message: { event: 'user.deleted', operationId: 'op-2', payload: { userId: 'u2' } },
        },
      });
      outboxRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockResolvedValue(undefined);

      await service.relay();

      expect(pubSub.publish).toHaveBeenCalledWith('my-channel', expect.objectContaining({ event: 'user.deleted' }));
    });
  });

  describe('Prometheus metrics', () => {
    let publishedSpy: jest.SpyInstance;
    let failedSpy: jest.SpyInstance;

    beforeEach(() => {
      publishedSpy = jest.spyOn(service['publishedCounter'], 'inc');
      failedSpy = jest.spyOn(service['failedCounter'], 'inc');
    });

    it('increments publishedCounter with store=postgres on successful Postgres publish', async () => {
      outboxRepo.findPending.mockResolvedValue([makeEntry()]);
      pubSub.publish.mockResolvedValue(undefined);

      await service.relay();

      expect(publishedSpy).toHaveBeenCalledWith({ store: 'postgres' });
    });

    it('increments failedCounter with store=postgres when Postgres entry exceeds max retries', async () => {
      outboxRepo.findPending.mockResolvedValue([makeEntry({ retries: 3 })]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(failedSpy).toHaveBeenCalledWith({ store: 'postgres' });
    });

    it('does NOT increment failedCounter for Postgres retries below max', async () => {
      outboxRepo.findPending.mockResolvedValue([makeEntry({ retries: 0 })]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(failedSpy).not.toHaveBeenCalled();
    });

    it('increments publishedCounter with store=mongo on successful Mongo publish', async () => {
      outboxMongoRepo.findPending.mockResolvedValue([makeMongoEntry()]);
      pubSub.publish.mockResolvedValue(undefined);

      await service.relay();

      expect(publishedSpy).toHaveBeenCalledWith({ store: 'mongo' });
    });

    it('increments failedCounter with store=mongo when Mongo entry exceeds max retries', async () => {
      outboxMongoRepo.findPending.mockResolvedValue([makeMongoEntry({ retries: 3 })]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(failedSpy).toHaveBeenCalledWith({ store: 'mongo' });
    });

    it('does NOT increment failedCounter for Mongo retries below max', async () => {
      outboxMongoRepo.findPending.mockResolvedValue([makeMongoEntry({ retries: 0 })]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(failedSpy).not.toHaveBeenCalled();
    });
  });

  describe('processMongoEntry (via relay)', () => {
    it('publishes the message and marks mongo entry as published', async () => {
      const entry = makeMongoEntry();
      outboxMongoRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockResolvedValue(undefined);

      await service.relay();

      expect(pubSub.publish).toHaveBeenCalledWith('domain', {
        event: 'user.created',
        operationId: 'op-1',
        payload: { userId: 'user-1' },
      });
      expect(outboxMongoRepo.update).toHaveBeenCalledWith(
        'mongo-id-1',
        expect.objectContaining({ status: 'published' }),
      );
    });

    it('increments retries on publish failure (below max)', async () => {
      const entry = makeMongoEntry({ retries: 0 });
      outboxMongoRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(outboxMongoRepo.update).toHaveBeenCalledWith('mongo-id-1', { retries: 1 });
      expect(outboxMongoRepo.update).not.toHaveBeenCalledWith(
        'mongo-id-1',
        expect.objectContaining({ status: 'failed' }),
      );
    });

    it('marks mongo entry as failed after max retries exceeded', async () => {
      const entry = makeMongoEntry({ retries: 3 });
      outboxMongoRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));

      await service.relay();

      expect(outboxMongoRepo.update).toHaveBeenCalledWith(
        'mongo-id-1',
        expect.objectContaining({ status: 'failed', retries: 4 }),
      );
    });

    it('handles non-Error throws when logging mongo failure', async () => {
      const entry = makeMongoEntry({ retries: 3 });
      outboxMongoRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockRejectedValue('string error');

      await service.relay();

      expect(outboxMongoRepo.update).toHaveBeenCalledWith(
        'mongo-id-1',
        expect.objectContaining({ status: 'failed' }),
      );
    });

    it('publishes to the correct channel from mongo entry payload', async () => {
      const entry = makeMongoEntry({
        payload: {
          channel: 'mongo-channel',
          message: { event: 'order.placed', operationId: 'op-3', payload: { orderId: 'o1' } },
        },
      });
      outboxMongoRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockResolvedValue(undefined);

      await service.relay();

      expect(pubSub.publish).toHaveBeenCalledWith('mongo-channel', expect.objectContaining({ event: 'order.placed' }));
    });
  });
});
