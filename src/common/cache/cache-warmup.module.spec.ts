import { CacheWarmupModule } from './cache-warmup.module';
import { CACHE_WARMERS, CacheWarmupService } from './cache-warmup.service';
import { CacheWarmer } from './interfaces/cache-warmer.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
class StubWarmer implements CacheWarmer {
  async warm(): Promise<void> {}
}

describe('CacheWarmupModule', () => {
  describe('forRoot', () => {
    it('returns a DynamicModule with module, providers and exports', () => {
      const mod = CacheWarmupModule.forRoot([StubWarmer]);

      expect(mod.module).toBe(CacheWarmupModule);
      expect(mod.exports).toEqual([CacheWarmupService]);
    });

    it('includes the warmer class and CacheWarmupService in providers', () => {
      const mod = CacheWarmupModule.forRoot([StubWarmer]);

      expect(mod.providers).toEqual(
        expect.arrayContaining([StubWarmer, CacheWarmupService]),
      );
    });

    it('includes a CACHE_WARMERS provider that injects the warmer classes', () => {
      const mod = CacheWarmupModule.forRoot([StubWarmer]);
      const warmersProvider = (mod.providers as Array<{ provide?: unknown; inject?: unknown[] }>)
        .find((p) => p.provide === CACHE_WARMERS);

      expect(warmersProvider).toBeDefined();
      expect(warmersProvider!.inject).toEqual([StubWarmer]);
    });

    it('CACHE_WARMERS useFactory returns the instances array', () => {
      const mod = CacheWarmupModule.forRoot([StubWarmer]);
      const warmersProvider = (mod.providers as Array<{
        provide?: unknown;
        useFactory?: (...args: CacheWarmer[]) => CacheWarmer[];
      }>).find((p) => p.provide === CACHE_WARMERS);

      const stub = new StubWarmer();
      const result = warmersProvider!.useFactory!(stub);
      expect(result).toEqual([stub]);
    });

    it('works with an empty warmers array', () => {
      const mod = CacheWarmupModule.forRoot([]);

      expect(mod.module).toBe(CacheWarmupModule);
      const warmersProvider = (mod.providers as Array<{
        provide?: unknown;
        useFactory?: () => CacheWarmer[];
      }>).find((p) => p.provide === CACHE_WARMERS);

      expect(warmersProvider!.useFactory!()).toEqual([]);
    });
  });
});
