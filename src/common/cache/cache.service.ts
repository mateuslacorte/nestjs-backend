import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface SwrEntry<T> {
  _swr: true;
  data: T;
  freshUntil: number;
  staleUntil: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTtl: number;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {
    this.redis = redisClient;
    this.defaultTtl = this.configService.get<number>('redis.ttl', 3600);
  }

  async ping(): Promise<boolean> {
    const result = await this.redis.ping();
    return result === 'PONG';
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (parsed && (parsed as SwrEntry<T>)._swr) {
        return (parsed as SwrEntry<T>).data;
      }
      return parsed as T;
    } catch (error) {
      this.logger.error(`Cache GET failed for key ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const ttlToUse = ttl || this.defaultTtl;
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttlToUse, serialized);
      this.logger.debug(`Cache SET ${key} (TTL=${ttlToUse}s, ${serialized.length}B)`);
    } catch (error) {
      this.logger.error(`Cache SET failed for key ${key}`, error);
    }
  }

  /**
   * Stale-while-revalidate: serve immediately (fresh or stale) and
   * refresh in the background when inside the stale window.
   *
   * @param freshTtl seconds until data is considered stale (served from cache, no refresh)
   * @param staleTtl seconds until data is fully expired (served stale + background refresh)
   */
  /**
   * Build the storage key for SWR entries.
   * When `namespace` is provided the key becomes `swr:{namespace}:{key}`,
   * otherwise it falls back to the raw key for backward-compatibility.
   * Callers should omit the leading `swr:` from `key` and pass a namespace instead.
   *
   * Invalidation across all namespaces:  cacheService.delPattern(`swr:*:${key}`)
   */
  private swrKey(key: string, namespace?: string): string {
    return namespace ? `swr:${namespace}:${key}` : key;
  }

  async getOrCompute<T>(
    key: string,
    fetcher: () => Promise<T>,
    opts?: { freshTtl?: number; staleTtl?: number; namespace?: string },
  ): Promise<T> {
    const freshTtl = opts?.freshTtl ?? 60;
    const staleTtl = opts?.staleTtl ?? 300;
    const storageKey = this.swrKey(key, opts?.namespace);

    try {
      const cached = await this.redis.get(storageKey);
      if (cached) {
        const entry = JSON.parse(cached) as SwrEntry<T>;
        if (entry._swr) {
          const now = Date.now();
          if (now < entry.freshUntil) {
            this.logger.debug(`Cache SWR FRESH ${storageKey}`);
            return entry.data;
          }
          if (now < entry.staleUntil) {
            this.logger.debug(`Cache SWR STALE (bg refresh) ${storageKey}`);
            void this.refreshInBackground(storageKey, fetcher, freshTtl, staleTtl);
            return entry.data;
          }
        }
      }
    } catch {
      // fall through to fetch
    }

    const data = await fetcher();
    await this.setWithSwr(storageKey, data, freshTtl, staleTtl);
    return data;
  }

  private async setWithSwr<T>(key: string, data: T, freshTtl: number, staleTtl: number): Promise<void> {
    const now = Date.now();
    const entry: SwrEntry<T> = {
      _swr: true,
      data,
      freshUntil: now + freshTtl * 1000,
      staleUntil: now + staleTtl * 1000,
    };
    await this.redis.setex(key, staleTtl, JSON.stringify(entry));
  }

  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    freshTtl: number,
    staleTtl: number,
  ): Promise<void> {
    try {
      const data = await fetcher();
      await this.setWithSwr(key, data, freshTtl, staleTtl);
      this.logger.debug(`Cache SWR background refresh complete: ${key}`);
    } catch (err) {
      this.logger.warn(`Cache SWR background refresh failed: ${key}`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache DEL failed for key ${key}`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        for (const key of result[1]) {
          if (regex.test(key)) keys.push(key);
        }
      } while (cursor !== '0');

      if (!keys.length) return;

      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        await this.redis.del(...keys.slice(i, i + batchSize));
      }
      this.logger.debug(`Cache invalidated ${keys.length} keys for pattern ${pattern}`);
    } catch (error) {
      this.logger.error(`Cache DEL pattern failed: ${pattern}`, error);
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length) {
          for (let i = 0; i < keys.length; i += 100) {
            await this.redis.del(...keys.slice(i, i + 100));
          }
        }
      } catch (fallbackErr) {
        this.logger.error('Cache DEL pattern fallback also failed', fallbackErr);
        throw error;
      }
    }
  }

  generateKey(prefix: string, ...params: unknown[]): string {
    const paramsStr = params
      .map((p) => (typeof p === 'object' && p !== null ? JSON.stringify(p) : String(p)))
      .join(':');
    return `${prefix}:${paramsStr}`;
  }
}
