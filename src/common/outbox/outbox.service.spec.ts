import { OutboxService, OutboxPublishInput } from './outbox.service';
import { OutboxEntry, OutboxStatus } from './entities/outbox-entry.entity';
import { OutboxPostgresRepository } from './repositories/outbox-postgres.repository';
import { OutboxMongoRepository } from './repositories/outbox-mongo.repository';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => 'test-uuid-1234',
}));

const makeInput = (overrides: Partial<OutboxPublishInput> = {}): OutboxPublishInput => ({
  aggregateType: 'User',
  aggregateId: 'user-1',
  eventType: 'user.created',
  payload: { channel: 'domain', message: { event: 'user.created', operationId: 'op-1', payload: {} } },
  ...overrides,
});

describe('OutboxService', () => {
  let outboxRepo: jest.Mocked<Pick<OutboxPostgresRepository, 'save'>>;
  let outboxMongoRepo: jest.Mocked<Pick<OutboxMongoRepository, 'create'>>;
  let service: OutboxService;

  beforeEach(() => {
    outboxRepo = { save: jest.fn() };
    outboxMongoRepo = { create: jest.fn() };
    service = new OutboxService(
      outboxRepo as unknown as OutboxPostgresRepository,
      outboxMongoRepo as unknown as OutboxMongoRepository,
    );
  });

  describe('publish', () => {
    it('inserts a pending outbox entry via the repo when no entityManager given', async () => {
      outboxRepo.save.mockResolvedValue(undefined);
      const input = makeInput();

      await service.publish(input);

      expect(outboxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-1234',
          aggregateType: 'User',
          aggregateId: 'user-1',
          eventType: 'user.created',
          payload: input.payload,
          status: OutboxStatus.PENDING,
          publishedAt: null,
          retries: 0,
        }),
        undefined,
      );
    });

    it('passes entityManager through to the repo', async () => {
      outboxRepo.save.mockResolvedValue(undefined);
      const em = {} as never;
      const input = makeInput();

      await service.publish(input, em);

      expect(outboxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-1234',
          status: OutboxStatus.PENDING,
        }),
        em,
      );
    });

    it('sets createdAt to now', async () => {
      outboxRepo.save.mockResolvedValue(undefined);
      const before = new Date();

      await service.publish(makeInput());

      const after = new Date();
      const saved = (outboxRepo.save.mock.calls[0][0] as Partial<OutboxEntry>).createdAt!;
      expect(saved.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(saved.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('publishMongo', () => {
    it('calls mongo repo create with the event data when no session given', async () => {
      outboxMongoRepo.create.mockResolvedValue(undefined);
      const input = makeInput({ aggregateType: 'Product', aggregateId: 'p-1', eventType: 'product.created' });

      await service.publishMongo(input);

      expect(outboxMongoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'Product',
          aggregateId: 'p-1',
          eventType: 'product.created',
          status: 'pending',
          publishedAt: null,
          retries: 0,
        }),
        undefined,
      );
    });

    it('passes session to mongo repo create when session is supplied', async () => {
      const session = {} as never;
      outboxMongoRepo.create.mockResolvedValue(undefined);
      const input = makeInput();

      await service.publishMongo(input, session);

      expect(outboxMongoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          aggregateType: 'User',
        }),
        session,
      );
    });

    it('sets createdAt to now for mongo entry', async () => {
      outboxMongoRepo.create.mockResolvedValue(undefined);
      const before = new Date();

      await service.publishMongo(makeInput());

      const after = new Date();
      const docArg = outboxMongoRepo.create.mock.calls[0][0] as { createdAt: Date };
      expect(docArg.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(docArg.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
