import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class FeatureFlagService {
    /* istanbul ignore start -- Nest DI constructor parameter emit */
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}
    /* istanbul ignore end */

    async isEnabled(
        flag: string,
        context?: { userId?: string; tenantId?: string },
    ): Promise<boolean> {
        if (context?.userId) {
            const val = await this.redis.get(`feature_flag:${flag}:user:${context.userId}`);
            if (val !== null) return val === '1' || val === 'true';
        }

        if (context?.tenantId) {
            const val = await this.redis.get(`feature_flag:${flag}:tenant:${context.tenantId}`);
            if (val !== null) return val === '1' || val === 'true';
        }

        const val = await this.redis.get(`feature_flag:${flag}`);
        if (val === null) return false;
        return val === '1' || val === 'true';
    }

    async enable(flag: string, target?: { userId?: string; tenantId?: string }): Promise<void> {
        await this.redis.set(this.buildKey(flag, target), '1');
    }

    async disable(flag: string, target?: { userId?: string; tenantId?: string }): Promise<void> {
        await this.redis.del(this.buildKey(flag, target));
    }

    private buildKey(flag: string, target?: { userId?: string; tenantId?: string }): string {
        if (target?.userId) return `feature_flag:${flag}:user:${target.userId}`;
        if (target?.tenantId) return `feature_flag:${flag}:tenant:${target.tenantId}`;
        return `feature_flag:${flag}`;
    }
}
