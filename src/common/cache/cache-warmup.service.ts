import { Injectable, Inject, OnApplicationBootstrap } from '@nestjs/common';
import { CacheWarmer } from './interfaces/cache-warmer.interface';

export const CACHE_WARMERS = 'CACHE_WARMERS';

@Injectable()
export class CacheWarmupService implements OnApplicationBootstrap {

  constructor(
    @Inject(CACHE_WARMERS) private readonly warmers: CacheWarmer[],
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.warmers.length) return;

    console.log(`Running ${this.warmers.length} cache warmer(s)…`);

    const results = await Promise.allSettled(
      this.warmers.map((w) => w.warm()),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const name = this.warmers[i].constructor.name;
      if (result.status === 'fulfilled') {
        console.log(`Cache warmer succeeded: ${name}`);
      } else {
        console.error(`Cache warmer failed: ${name}`, result.reason);
      }
    }
  }
}
