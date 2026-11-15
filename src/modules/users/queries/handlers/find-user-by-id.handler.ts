import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindUserByIdQuery } from '../find-user-by-id.query';
import { UserPostgresRepository } from '../../repositories/postgres.repository';
import { CacheService } from '@common/cache/cache.service';
import { IUser } from '../../interfaces/user.interface';

const FRESH_TTL = 60;
const STALE_TTL = 300;

@QueryHandler(FindUserByIdQuery)
export class FindUserByIdHandler implements IQueryHandler<FindUserByIdQuery, IUser | null> {
  constructor(
    private readonly postgresRepo: UserPostgresRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: FindUserByIdQuery): Promise<IUser | null> {
    if (query.includePassword) {
      return this.postgresRepo.findById(query.id, true);
    }
    return this.cacheService.getOrCompute(
      `users:findById:${query.id}`,
      () => this.postgresRepo.findById(query.id),
      {
        freshTtl: FRESH_TTL,
        staleTtl: STALE_TTL,
        namespace: query.tenantId ? `tenant:${query.tenantId}` : 'global',
      },
    );
  }
}
