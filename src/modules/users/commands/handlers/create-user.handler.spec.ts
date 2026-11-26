jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-uuid') }));

import { CreateUserHandler } from './create-user.handler';
import { CreateUserCommand } from '../create-user.command';

const mockUser = { id: 'u1', email: 'a@b.com' } as never;

function makeHandler() {
  const mongoRepo = { create: jest.fn() };
  const eventBus = { publish: jest.fn() };
  const opStatus = { pending: jest.fn().mockResolvedValue(undefined), fail: jest.fn().mockResolvedValue(undefined) };
  const handler = new CreateUserHandler(mongoRepo as never, eventBus as never, opStatus as never);
  return { handler, mongoRepo, eventBus, opStatus };
}

describe('CreateUserHandler', () => {
  it('creates user, publishes event, and returns user on success', async () => {
    const { handler, mongoRepo, eventBus, opStatus } = makeHandler();
    mongoRepo.create.mockResolvedValue(mockUser);
    const cmd = new CreateUserCommand({ email: 'a@b.com' } as never, 'op-1', 'actor-1');

    const result = await handler.execute(cmd);

    expect(opStatus.pending).toHaveBeenCalledWith('op-1');
    expect(mongoRepo.create).toHaveBeenCalledWith(cmd.dto, false);
    expect(eventBus.publish).toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });

  it('calls opStatus.fail and rethrows when mongoRepo.create rejects', async () => {
    const { handler, mongoRepo, opStatus } = makeHandler();
    const err = new Error('Mongo down');
    mongoRepo.create.mockRejectedValue(err);
    const cmd = new CreateUserCommand({ email: 'a@b.com' } as never, 'op-2');

    await expect(handler.execute(cmd)).rejects.toThrow('Mongo down');
    expect(opStatus.fail).toHaveBeenCalledWith('op-2', 'Mongo down');
  });
});
