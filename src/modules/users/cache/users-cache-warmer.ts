import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CacheService } from '@common/cache/cache.service';
import { CacheWarmer } from '@common/cache/interfaces/cache-warmer.interface';
import { UsersService } from '../users.service';

@Injectable()
export class UsersCacheWarmer implements CacheWarmer {

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly cacheService: CacheService,
  ) {}

  async warm(): Promise<void> {
    const usersService = this.moduleRef.get(UsersService, { strict: false });
    const page = await usersService.search({ isActive: true, limit: 100 });

    await Promise.all(
      page.items.map((user) =>
        this.cacheService.getOrCompute(
          `user:${user.id}`,
          () => Promise.resolve(user),
          { namespace: 'users', freshTtl: 60, staleTtl: 300 },
        ),
      ),
    );

    console.log(`Warmed ${page.items.length} active users`);
  }
}
