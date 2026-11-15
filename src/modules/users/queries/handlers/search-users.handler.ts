import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchUsersQuery } from '../search-users.query';
import { UserPostgresRepository } from '../../repositories/postgres.repository';
import { UsersPage } from '../../interfaces/user.interface';
import { decodeUserCursor, encodeUserCursor } from '../../utils/cursor.util';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

@QueryHandler(SearchUsersQuery)
export class SearchUsersHandler implements IQueryHandler<SearchUsersQuery, UsersPage> {
  constructor(private readonly postgresRepo: UserPostgresRepository) {}

  async execute(query: SearchUsersQuery): Promise<UsersPage> {
    const p = query.params;
    const limit = Math.min(Math.max(p.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

    let cursorCreatedAt: Date | undefined;
    let cursorId: string | undefined;
    if (p.cursor) {
      const decoded = decodeUserCursor(p.cursor);
      cursorCreatedAt = decoded.createdAt;
      cursorId = decoded.id;
    }

    const rows = await this.postgresRepo.search({
      limit: limit + 1,
      cursorCreatedAt,
      cursorId,
      q: p.q,
      isActive: p.isActive,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last?.createdAt && last.id
        ? encodeUserCursor(last.createdAt, last.id)
        : null;

    return { items, nextCursor };
  }
}
