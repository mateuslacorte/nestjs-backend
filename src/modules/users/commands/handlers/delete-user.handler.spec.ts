jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-uuid') }));

import { DeleteUserHandler } from './delete-user.handler';
import { DeleteUserCommand } from '../delete-user.command';

const mockUser = { id: 'u1', email: 'a@b.com' } as never;

function makeHandler() {
  const mongoRepo = { remove: jest.fn() };
  const eventBus = { publish: jest.fn() };
  const opStatus = { pending: jest.fn().mockResolvedValue(undefined), fail: jest.fn().mockResolvedValue(undefined) };
  const handler = new DeleteUserHandler(mongoRepo as never, eventBus as never, opStatus as never);
  return { handler, mongoRepo, eventBus, opStatus };
}

describe('DeleteUserHandler', () => {
  it('removes user, publishes event, and returns user on success', async () => {
    const { handler, mongoRepo, eventBus, opStatus } = makeHandler();
    mongoRepo.remove.mockResolvedValue(mockUser);
    const cmd = new DeleteUserCommand('u1', 'op-1', 'actor-1');

    const result = await handler.execute(cmd);

    expect(opStatus.pending).toHaveBeenCalledWith('op-1');
    expect(mongoRepo.remove).toHaveBeenCalledWith('u1');
    expect(eventBus.publish).toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });

  it('calls opStatus.fail and rethrows when mongoRepo.remove rejects', async () => {
    const { handler, mongoRepo, opStatus } = makeHandler();
    const err = new Error('not found');
    mongoRepo.remove.mockRejectedValue(err);
    const cmd = new DeleteUserCommand('u1', 'op-2');

    await expect(handler.execute(cmd)).rejects.toThrow('not found');
    expect(opStatus.fail).toHaveBeenCalledWith('op-2', 'not found');
  });
});
