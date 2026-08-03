import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private readonly redis: Redis;
    private readonly defaultTtl: number;

    /* istanbul ignore next -- Nest DI constructor parameter emit */
    constructor(
        @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
        private readonly configService: ConfigService,
    ) {
        this.redis = redisClient;
        this.defaultTtl = this.configService.get<number>('redis.ttl', 3600);
    }

    /**
     * Checks Redis connectivity
     */
    async ping(): Promise<boolean> {
        const result = await this.redis.ping();
        return result === 'PONG';
    }

    /**
     * Gets a value from the cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                return JSON.parse(cached) as T;
            }
            return null;
        } catch (error) {
            this.logger.error(`Failed to get cache for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Sets a value in the cache
     */
    async set(key: string, value: any, ttl?: number): Promise<void> {
        try {
            const ttlToUse = ttl || this.defaultTtl;
            const serialized = JSON.stringify(value);
            await this.redis.setex(key, ttlToUse, serialized);
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttlToUse}s, Size: ${serialized.length} bytes)`);
        } catch (error) {
            this.logger.error(`Failed to set cache for key ${key}:`, error);
        }
    }

    /**
     * Deletes a cache key
     */
    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            this.logger.error(`Failed to delete cache for key ${key}:`, error);
        }
    }

    /**
     * Deletes all keys matching a pattern
     * Uses SCAN for production safety (does not block Redis)
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            this.logger.debug(`[Cache] Scanning keys with pattern: ${pattern}`);
            
            // Convert glob pattern to regex
            const regexPattern = pattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            const regex = new RegExp(`^${regexPattern}$`);
            
            const keys: string[] = [];
            let cursor = '0';
            
            // Use SCAN to iterate keys (safer than KEYS)
            do {
                const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = result[0];
                const foundKeys = result[1];
                
                // Keep keys that actually match the pattern
                for (const key of foundKeys) {
                    if (regex.test(key)) {
                        keys.push(key);
                    }
                }
            } while (cursor !== '0');
            
            this.logger.debug(`[Cache] Found ${keys.length} keys for pattern ${pattern}`);
            
            if (keys.length > 0) {
                // Delete in batches when there are many keys
                const batchSize = 100;
                for (let i = 0; i < keys.length; i += batchSize) {
                    const batch = keys.slice(i, i + batchSize);
                    await this.redis.del(...batch);
                }
                this.logger.log(`[Cache] ✅ Invalidated ${keys.length} caches for pattern ${pattern}`);
                if (keys.length <= 10) {
                    this.logger.debug(`[Cache] Invalidated keys: ${keys.join(', ')}`);
                }
            } else {
                this.logger.debug(`[Cache] No keys found for pattern ${pattern}`);
            }
        } catch (error) {
            this.logger.error(`[Cache] ❌ Failed to delete cache for pattern ${pattern}:`, error);
            // Fall back to KEYS if SCAN fails
            try {
                this.logger.warn(`[Cache] Falling back to KEYS for pattern ${pattern}`);
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    const batchSize = 100;
                    for (let i = 0; i < keys.length; i += batchSize) {
                        const batch = keys.slice(i, i + batchSize);
                        await this.redis.del(...batch);
                    }
                    this.logger.log(`[Cache] ✅ Invalidated ${keys.length} caches (fallback) for pattern ${pattern}`);
                }
            } catch (fallbackError) {
                this.logger.error(`[Cache] ❌ Fallback also failed:`, fallbackError);
                throw error; // Re-throw the original error
            }
        }
    }

    /**
     * Builds a cache key from a prefix and parameters
     */
    generateKey(prefix: string, ...params: any[]): string {
        const paramsStr = params
            .map(p => {
                if (typeof p === 'object' && p !== null) {
                    return JSON.stringify(p);
                }
                return String(p);
            })
            .join(':');
        return `${prefix}:${paramsStr}`;
    }
}

