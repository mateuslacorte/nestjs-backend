import { Injectable, Inject, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CacheWarmer } from './interfaces/cache-warmer.interface';

export const CACHE_WARMERS = 'CACHE_WARMERS';

@Injectable()
export class CacheWarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheWarmupService.name);

  constructor(
    @Inject(CACHE_WARMERS) private readonly warmers: CacheWarmer[],
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.warmers.length) return;

    this.logger.log(`Running ${this.warmers.length} cache warmer(s)…`);

    const results = await Promise.allSettled(
      this.warmers.map((w) => w.warm()),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const name = this.warmers[i].constructor.name;
      if (result.status === 'fulfilled') {
        this.logger.log(`Cache warmer succeeded: ${name}`);
      } else {
        this.logger.error(`Cache warmer failed: ${name}`, result.reason);
      }
    }
  }
}
