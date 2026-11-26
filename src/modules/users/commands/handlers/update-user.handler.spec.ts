jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-uuid') }));

import { UpdateUserHandler } from './update-user.handler';
import { UpdateUserCommand } from '../update-user.command';

const mockUser = { id: 'u1', email: 'a@b.com' } as never;

function makeHandler() {
  const mongoRepo = { update: jest.fn() };
  const eventBus = { publish: jest.fn() };
  const opStatus = { pending: jest.fn().mockResolvedValue(undefined), fail: jest.fn().mockResolvedValue(undefined) };
  const handler = new UpdateUserHandler(mongoRepo as never, eventBus as never, opStatus as never);
  return { handler, mongoRepo, eventBus, opStatus };
}

describe('UpdateUserHandler', () => {
  it('updates user, publishes event, and returns user on success', async () => {
    const { handler, mongoRepo, eventBus, opStatus } = makeHandler();
    mongoRepo.update.mockResolvedValue(mockUser);
    const cmd = new UpdateUserCommand('u1', { email: 'new@b.com' } as never, 'op-1', 'actor-1');

    const result = await handler.execute(cmd);

    expect(opStatus.pending).toHaveBeenCalledWith('op-1');
    expect(mongoRepo.update).toHaveBeenCalledWith('u1', cmd.dto);
    expect(eventBus.publish).toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });

  it('calls opStatus.fail and rethrows when mongoRepo.update rejects', async () => {
    const { handler, mongoRepo, opStatus } = makeHandler();
    const err = new Error('conflict');
    mongoRepo.update.mockRejectedValue(err);
    const cmd = new UpdateUserCommand('u1', {} as never, 'op-2');

    await expect(handler.execute(cmd)).rejects.toThrow('conflict');
    expect(opStatus.fail).toHaveBeenCalledWith('op-2', 'conflict');
  });
});
