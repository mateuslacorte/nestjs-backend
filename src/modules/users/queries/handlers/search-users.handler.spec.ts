import { SearchUsersHandler } from './search-users.handler';
import { SearchUsersQuery } from '../search-users.query';

function makeUser(id: string, createdAt: Date) {
  return { id, email: `${id}@b.com`, createdAt } as never;
}

function makeHandler() {
  const postgresRepo = { search: jest.fn() };
  const handler = new SearchUsersHandler(postgresRepo as never);
  return { handler, postgresRepo };
}

describe('SearchUsersHandler', () => {
  it('returns all items and null cursor when results fit within limit', async () => {
    const { handler, postgresRepo } = makeHandler();
    const users = [makeUser('u1', new Date('2024-01-01')), makeUser('u2', new Date('2024-01-02'))];
    postgresRepo.search.mockResolvedValue(users);

    const result = await handler.execute(new SearchUsersQuery({ limit: 10 }));

    expect(postgresRepo.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 11 }));
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it('returns nextCursor when results exceed limit', async () => {
    const { handler, postgresRepo } = makeHandler();
    const users = Array.from({ length: 11 }, (_, i) => makeUser(`u${i}`, new Date(`2024-01-0${i + 1}`)));
    postgresRepo.search.mockResolvedValue(users);

    const result = await handler.execute(new SearchUsersQuery({ limit: 10 }));

    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).not.toBeNull();
  });

  it('defaults to page size 50 when no limit provided', async () => {
    const { handler, postgresRepo } = makeHandler();
    postgresRepo.search.mockResolvedValue([]);

    await handler.execute(new SearchUsersQuery());

    expect(postgresRepo.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 51 }));
  });

  it('clamps limit to MAX_PAGE_SIZE (100)', async () => {
    const { handler, postgresRepo } = makeHandler();
    postgresRepo.search.mockResolvedValue([]);

    await handler.execute(new SearchUsersQuery({ limit: 999 }));

    expect(postgresRepo.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 101 }));
  });

  it('clamps limit to 1 minimum', async () => {
    const { handler, postgresRepo } = makeHandler();
    postgresRepo.search.mockResolvedValue([]);

    await handler.execute(new SearchUsersQuery({ limit: 0 }));

    expect(postgresRepo.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 2 }));
  });

  it('decodes cursor and passes cursorCreatedAt and cursorId to search', async () => {
    const { handler, postgresRepo } = makeHandler();
    postgresRepo.search.mockResolvedValue([]);

    const baseUser = makeUser('u1', new Date('2024-06-15T10:00:00Z'));
    // Build a valid cursor by running a search that generates one
    const usersForCursor = Array.from({ length: 11 }, (_, i) =>
      makeUser(`u${i}`, new Date(`2024-01-0${i + 1}`)),
    );
    postgresRepo.search.mockResolvedValueOnce(usersForCursor);
    const page1 = await handler.execute(new SearchUsersQuery({ limit: 10 }));
    const cursor = page1.nextCursor!;

    postgresRepo.search.mockResolvedValue([]);
    await handler.execute(new SearchUsersQuery({ limit: 10, cursor }));

    const secondCall = (postgresRepo.search as jest.Mock).mock.calls[1][0];
    expect(secondCall.cursorCreatedAt).toBeInstanceOf(Date);
    expect(typeof secondCall.cursorId).toBe('string');
  });

  it('passes q and isActive filters through to search', async () => {
    const { handler, postgresRepo } = makeHandler();
    postgresRepo.search.mockResolvedValue([]);

    await handler.execute(new SearchUsersQuery({ q: 'alice', isActive: true }));

    expect(postgresRepo.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'alice', isActive: true }));
  });
});
