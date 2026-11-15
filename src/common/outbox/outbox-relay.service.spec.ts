import { OutboxRelayService } from './outbox-relay.service';
import { OutboxEntry, OutboxStatus } from './entities/outbox-entry.entity';
import { OutboxPostgresRepository } from './repositories/outbox-postgres.repository';
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

describe('OutboxRelayService', () => {
  let outboxRepo: jest.Mocked<Pick<OutboxPostgresRepository, 'findPending' | 'update'>>;
  let pubSub: jest.Mocked<Pick<RedisPubSubService, 'publish'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let service: OutboxRelayService;

  beforeEach(() => {
    outboxRepo = { findPending: jest.fn(), update: jest.fn() };
    pubSub = { publish: jest.fn() } as unknown as jest.Mocked<Pick<RedisPubSubService, 'publish'>>;
    configService = { get: jest.fn().mockReturnValue(undefined) } as unknown as jest.Mocked<Pick<ConfigService, 'get'>>;
    service = new OutboxRelayService(
      outboxRepo as unknown as OutboxPostgresRepository,
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
      outboxRepo.findPending.mockResolvedValue([]);
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
    it('finds pending entries and processes each', async () => {
      const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })];
      outboxRepo.findPending.mockResolvedValue(entries);
      pubSub.publish.mockResolvedValue(undefined);
      outboxRepo.update.mockResolvedValue(undefined);

      await service.relay();

      expect(outboxRepo.findPending).toHaveBeenCalled();
      expect(pubSub.publish).toHaveBeenCalledTimes(2);
    });

    it('skips when already relaying (concurrent guard)', async () => {
      service['relaying'] = true;

      await service.relay();

      expect(outboxRepo.findPending).not.toHaveBeenCalled();
    });

    it('resets relaying flag even when findPending throws', async () => {
      outboxRepo.findPending.mockRejectedValue(new Error('db error'));

      await service.relay();

      expect(service['relaying']).toBe(false);
    });

    it('does nothing when no pending entries', async () => {
      outboxRepo.findPending.mockResolvedValue([]);

      await service.relay();

      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('processEntry (via relay)', () => {
    it('publishes the message and marks entry as published', async () => {
      const entry = makeEntry();
      outboxRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockResolvedValue(undefined);
      outboxRepo.update.mockResolvedValue(undefined);

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
      outboxRepo.update.mockResolvedValue(undefined);

      await service.relay();

      expect(outboxRepo.update).toHaveBeenCalledWith('entry-1', { retries: 1 });
      expect(outboxRepo.update).not.toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ status: OutboxStatus.FAILED }),
      );
    });

    it('marks entry as FAILED after max retries exceeded', async () => {
      const entry = makeEntry({ retries: 3 }); // 3 retries → next attempt → newRetries=4 > MAX_RETRIES=3 → FAILED
      outboxRepo.findPending.mockResolvedValue([entry]);
      pubSub.publish.mockRejectedValue(new Error('redis down'));
      outboxRepo.update.mockResolvedValue(undefined);

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
      outboxRepo.update.mockResolvedValue(undefined);

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
      outboxRepo.update.mockResolvedValue(undefined);

      await service.relay();

      expect(pubSub.publish).toHaveBeenCalledWith('my-channel', expect.objectContaining({ event: 'user.deleted' }));
    });
  });
});
