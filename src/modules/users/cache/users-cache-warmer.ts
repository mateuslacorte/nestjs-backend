import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@common/cache/cache.service';
import { CacheWarmer } from '@common/cache/interfaces/cache-warmer.interface';
import { UsersService } from '../users.service';

@Injectable()
export class UsersCacheWarmer implements CacheWarmer {
  private readonly logger = new Logger(UsersCacheWarmer.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
  ) {}

  async warm(): Promise<void> {
    const page = await this.usersService.search({ isActive: true, limit: 100 });

    await Promise.all(
      page.items.map((user) =>
        this.cacheService.getOrCompute(
          `user:${user.id}`,
          () => Promise.resolve(user),
          { namespace: 'users', freshTtl: 60, staleTtl: 300 },
        ),
      ),
    );

    this.logger.log(`Warmed ${page.items.length} active users`);
  }
}
