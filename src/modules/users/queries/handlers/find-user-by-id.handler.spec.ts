import { FindUserByIdHandler } from './find-user-by-id.handler';
import { FindUserByIdQuery } from '../find-user-by-id.query';

const mockUser = { id: 'u1', email: 'a@b.com' } as never;

function makeHandler() {
  const postgresRepo = { findById: jest.fn() };
  const cacheService = { getOrCompute: jest.fn() };
  const handler = new FindUserByIdHandler(postgresRepo as never, cacheService as never);
  return { handler, postgresRepo, cacheService };
}

describe('FindUserByIdHandler', () => {
  it('bypasses cache and queries Postgres directly when includePassword=true', async () => {
    const { handler, postgresRepo, cacheService } = makeHandler();
    postgresRepo.findById.mockResolvedValue(mockUser);
    const query = new FindUserByIdQuery('u1', true);

    const result = await handler.execute(query);

    expect(postgresRepo.findById).toHaveBeenCalledWith('u1', true);
    expect(cacheService.getOrCompute).not.toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });

  it('uses cache (global namespace) when includePassword=false and no tenantId', async () => {
    const { handler, cacheService } = makeHandler();
    cacheService.getOrCompute.mockResolvedValue(mockUser);
    const query = new FindUserByIdQuery('u1');

    const result = await handler.execute(query);

    expect(cacheService.getOrCompute).toHaveBeenCalledWith(
      'users:findById:u1',
      expect.any(Function),
      expect.objectContaining({ namespace: 'global' }),
    );
    expect(result).toBe(mockUser);
  });

  it('uses tenant-scoped namespace when tenantId is provided', async () => {
    const { handler, cacheService } = makeHandler();
    cacheService.getOrCompute.mockResolvedValue(mockUser);
    const query = new FindUserByIdQuery('u1', false, 'tenant-42');

    await handler.execute(query);

    expect(cacheService.getOrCompute).toHaveBeenCalledWith(
      'users:findById:u1',
      expect.any(Function),
      expect.objectContaining({ namespace: 'tenant:tenant-42' }),
    );
  });

  it('cache factory calls postgresRepo.findById', async () => {
    const { handler, postgresRepo, cacheService } = makeHandler();
    postgresRepo.findById.mockResolvedValue(mockUser);
    cacheService.getOrCompute.mockImplementation((_key: string, factory: () => Promise<unknown>) => factory());
    const query = new FindUserByIdQuery('u1');

    await handler.execute(query);

    expect(postgresRepo.findById).toHaveBeenCalledWith('u1');
  });
});
