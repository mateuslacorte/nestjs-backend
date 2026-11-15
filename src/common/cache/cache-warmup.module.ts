import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { CacheWarmer } from './interfaces/cache-warmer.interface';
import { CACHE_WARMERS, CacheWarmupService } from './cache-warmup.service';

@Module({})
export class CacheWarmupModule {
  static forRoot(warmers: Type<CacheWarmer>[]): DynamicModule {
    const warmersProvider: Provider = {
      provide: CACHE_WARMERS,
      useFactory: (...instances: CacheWarmer[]) => instances,
      inject: warmers,
    };

    return {
      module: CacheWarmupModule,
      providers: [...warmers, warmersProvider, CacheWarmupService],
      exports: [CacheWarmupService],
    };
  }
}
