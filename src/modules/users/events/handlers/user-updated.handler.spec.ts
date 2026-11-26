import { UserUpdatedHandler } from './user-updated.handler';
import { UserUpdatedEvent } from '../user-updated.event';

const mockUser = { id: 'u1', email: 'a@b.com' } as never;

function makeHandler() {
  const postgresRepo = { upsert: jest.fn().mockResolvedValue(undefined) };
  const dlq = {
    registerHandler: jest.fn(),
    push: jest.fn().mockResolvedValue(undefined),
  };
  const outbox = { publish: jest.fn().mockResolvedValue(undefined) };
  const cache = { delPattern: jest.fn().mockResolvedValue(undefined) };
  const opStatus = {
    complete: jest.fn().mockResolvedValue(undefined),
    fail: jest.fn().mockResolvedValue(undefined),
  };
  const handler = new UserUpdatedHandler(
    postgresRepo as never,
    dlq as never,
    outbox as never,
    cache as never,
    opStatus as never,
  );
  return { handler, postgresRepo, dlq, outbox, cache, opStatus };
}

describe('UserUpdatedHandler', () => {
  describe('onModuleInit()', () => {
    it('registers a DLQ handler', () => {
      const { handler, dlq } = makeHandler();
      handler.onModuleInit();
      expect(dlq.registerHandler).toHaveBeenCalledWith(
        'UserUpdatedEvent:syncToPostgres',
        expect.any(Function),
        expect.objectContaining({ onPermanentFailure: expect.any(Function) }),
      );
    });

    it('onPermanentFailure calls opStatus.fail', async () => {
      const { handler, dlq, opStatus } = makeHandler();
      handler.onModuleInit();
      const [, , { onPermanentFailure }] = (dlq.registerHandler as jest.Mock).mock.calls[0];
      await onPermanentFailure({ operationId: 'op-perm' });
      expect(opStatus.fail).toHaveBeenCalledWith('op-perm', expect.any(String));
    });
  });

  describe('handle()', () => {
    it('syncs update to Postgres, invalidates cache, publishes outbox, and completes op', async () => {
      const { handler, postgresRepo, cache, outbox, opStatus } = makeHandler();
      const event = new UserUpdatedEvent(mockUser, 'op-1', 'actor-1');

      await handler.handle(event);

      expect(postgresRepo.upsert).toHaveBeenCalledWith(mockUser);
      expect(cache.delPattern).toHaveBeenCalledWith(expect.stringContaining('u1'));
      expect(outbox.publish).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'user.updated' }));
      expect(opStatus.complete).toHaveBeenCalledWith('op-1', { userId: 'u1' });
    });

    it('pushes to DLQ when syncAndNotify throws', async () => {
      const { handler, postgresRepo, dlq, opStatus } = makeHandler();
      postgresRepo.upsert.mockRejectedValue(new Error('pg down'));
      const event = new UserUpdatedEvent(mockUser, 'op-2');

      await handler.handle(event);

      expect(dlq.push).toHaveBeenCalledWith('UserUpdatedEvent:syncToPostgres', expect.objectContaining({ operationId: 'op-2' }));
      expect(opStatus.complete).not.toHaveBeenCalled();
    });
  });
});
