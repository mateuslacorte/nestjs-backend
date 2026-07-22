import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { CacheService } from '@common/cache/cache.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
    constructor(private readonly cacheService: CacheService) {
        super();
    }

    /**
     * Check if the Redis is healthy
     * @param key - The key to check
     * @returns The health of the Redis
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const isHealthy = await this.cacheService.ping();
            const result = this.getStatus(key, isHealthy);

            if (isHealthy) {
                return result;
            }

            throw new HealthCheckError('Redis check failed', result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Redis unreachable';
            throw new HealthCheckError('Redis check failed', this.getStatus(key, false, { message }));
        }
    }
}
