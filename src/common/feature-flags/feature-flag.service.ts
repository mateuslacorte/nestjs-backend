import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class FeatureFlagService {
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

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
        return val === '1' || val === 'true';
    }

    async enable(flag: string, target?: { userId?: string; tenantId?: string }): Promise<void> {
        const key = this.resolveKey(flag, target);
        await this.redis.set(key, '1');
    }

    async disable(flag: string, target?: { userId?: string; tenantId?: string }): Promise<void> {
        const key = this.resolveKey(flag, target);
        await this.redis.del(key);
    }

    private resolveKey(flag: string, target?: { userId?: string; tenantId?: string }): string {
        if (target?.userId) return `feature_flag:${flag}:user:${target.userId}`;
        if (target?.tenantId) return `feature_flag:${flag}:tenant:${target.tenantId}`;
        return `feature_flag:${flag}`;
    }
}
