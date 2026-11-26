import { UsersCacheWarmer } from './users-cache-warmer';
import { UsersService } from '../users.service';
import { CacheService } from '@common/cache/cache.service';
import { IUser } from '../interfaces/user.interface';

function makeUser(id: string): IUser {
  return {
    id,
    username: `user_${id}`,
    firstName: 'Test',
    lastName: 'User',
    email: `${id}@example.com`,
    password: null,
    isActive: true,
    roles: [],
  };
}

describe('UsersCacheWarmer', () => {
  let usersService: jest.Mocked<Pick<UsersService, 'search'>>;
  let cacheService: jest.Mocked<Pick<CacheService, 'getOrCompute'>>;
  let warmer: UsersCacheWarmer;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    usersService = { search: jest.fn() };
    cacheService = { getOrCompute: jest.fn().mockResolvedValue(undefined) };
    warmer = new UsersCacheWarmer(
      usersService as unknown as UsersService,
      cacheService as unknown as CacheService,
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('calls search with isActive:true and limit:100', async () => {
    usersService.search.mockResolvedValue({ items: [], nextCursor: null });

    await warmer.warm();

    expect(usersService.search).toHaveBeenCalledWith({ isActive: true, limit: 100 });
  });

  it('calls getOrCompute for each user with correct key and opts', async () => {
    const users = [makeUser('1'), makeUser('2')];
    usersService.search.mockResolvedValue({ items: users, nextCursor: null });

    await warmer.warm();

    expect(cacheService.getOrCompute).toHaveBeenCalledTimes(2);
    expect(cacheService.getOrCompute).toHaveBeenCalledWith(
      'user:1',
      expect.any(Function),
      { namespace: 'users', freshTtl: 60, staleTtl: 300 },
    );
    expect(cacheService.getOrCompute).toHaveBeenCalledWith(
      'user:2',
      expect.any(Function),
      { namespace: 'users', freshTtl: 60, staleTtl: 300 },
    );
  });

  it('the fetcher function resolves with the user', async () => {
    const user = makeUser('42');
    usersService.search.mockResolvedValue({ items: [user], nextCursor: null });

    let capturedFetcher!: () => Promise<IUser>;
    cacheService.getOrCompute.mockImplementation(
      (_key, fetcher) => { capturedFetcher = fetcher as () => Promise<IUser>; return Promise.resolve(user); },
    );

    await warmer.warm();

    await expect(capturedFetcher()).resolves.toBe(user);
  });

  it('logs the count of warmed users', async () => {
    const users = [makeUser('a'), makeUser('b'), makeUser('c')];
    usersService.search.mockResolvedValue({ items: users, nextCursor: null });

    await warmer.warm();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3'));
  });

  it('handles an empty page without calling getOrCompute', async () => {
    usersService.search.mockResolvedValue({ items: [], nextCursor: null });

    await warmer.warm();

    expect(cacheService.getOrCompute).not.toHaveBeenCalled();
  });
});
