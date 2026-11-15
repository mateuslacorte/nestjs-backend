import { RevokeUserSessionsHandler } from './revoke-user-sessions.handler';
import { RevokeUserSessionsCommand } from '../revoke-user-sessions.command';

describe('RevokeUserSessionsHandler', () => {
  let handler: RevokeUserSessionsHandler;
  let cacheService: { set: jest.Mock };

  beforeEach(() => {
    cacheService = { set: jest.fn().mockResolvedValue(undefined) };
    handler = new RevokeUserSessionsHandler(cacheService as any);
  });

  it('sets a user-level revocation key in the cache', async () => {
    const command = new RevokeUserSessionsCommand('user-1', 'op-1');

    await handler.execute(command);

    expect(cacheService.set).toHaveBeenCalledTimes(1);
    expect(cacheService.set).toHaveBeenCalledWith(
      'auth:user:revoked:user-1',
      expect.any(Number),
      7 * 24 * 60 * 60,
    );
  });

  it('propagates errors from cacheService', async () => {
    cacheService.set.mockRejectedValue(new Error('Redis down'));
    const command = new RevokeUserSessionsCommand('user-1', 'op-1');

    await expect(handler.execute(command)).rejects.toThrow('Redis down');
  });
});
