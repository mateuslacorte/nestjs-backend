import { UserDeletedHandler } from './user-deleted.handler';
import { UserDeletedEvent } from '../user-deleted.event';

const mockUser = { id: 'u1', email: 'a@b.com' } as never;

function makeHandler() {
  const postgresRepo = {
    remove: jest.fn().mockResolvedValue(undefined),
  };
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
  const handler = new UserDeletedHandler(
    postgresRepo as never,
    dlq as never,
    outbox as never,
    cache as never,
    opStatus as never,
  );
  return { handler, postgresRepo, dlq, outbox, cache, opStatus };
}

describe('UserDeletedHandler', () => {
  describe('onModuleInit()', () => {
    it('registers a DLQ handler', () => {
      const { handler, dlq } = makeHandler();
      handler.onModuleInit();
      expect(dlq.registerHandler).toHaveBeenCalledWith(
        'UserDeletedEvent:syncToPostgres',
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
    it('syncs delete to Postgres, invalidates cache, publishes outbox, and completes op', async () => {
      const { handler, postgresRepo, cache, outbox, opStatus } = makeHandler();
      const event = new UserDeletedEvent(mockUser, 'op-1', 'actor-1');

      await handler.handle(event);

      expect(postgresRepo.remove).toHaveBeenCalledWith('u1');
      expect(cache.delPattern).toHaveBeenCalledWith(expect.stringContaining('u1'));
      expect(outbox.publish).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'user.deleted' }));
      expect(opStatus.complete).toHaveBeenCalledWith('op-1', { userId: 'u1' });
    });

    it('swallows NotFoundException from postgresRepo.remove (already deleted)', async () => {
      const { handler, postgresRepo, outbox, opStatus } = makeHandler();
      postgresRepo.remove.mockRejectedValue(new Error('not found'));
      const event = new UserDeletedEvent(mockUser, 'op-2');

      await handler.handle(event);

      expect(outbox.publish).toHaveBeenCalled();
      expect(opStatus.complete).toHaveBeenCalledWith('op-2', { userId: 'u1' });
    });

    it('pushes to DLQ when outbox.publish throws', async () => {
      const { handler, outbox, dlq, opStatus } = makeHandler();
      outbox.publish.mockRejectedValue(new Error('outbox down'));
      const event = new UserDeletedEvent(mockUser, 'op-3');

      await handler.handle(event);

      expect(dlq.push).toHaveBeenCalledWith('UserDeletedEvent:syncToPostgres', expect.objectContaining({ operationId: 'op-3' }));
      expect(opStatus.complete).not.toHaveBeenCalled();
    });
  });
});
