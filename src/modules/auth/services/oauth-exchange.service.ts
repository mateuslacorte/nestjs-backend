import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CacheService } from '@common/cache/cache.service';

interface ExchangeCodePayload {
    userId: string;
}

@Injectable()
export class OauthExchangeService {
    private readonly keyPrefix = 'auth:oauth:exchange:';

    constructor(
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService,
    ) {}

    async createExchangeCode(userId: string): Promise<string> {
        const code = randomBytes(32).toString('base64url');
        const ttl =
            this.configService.get<number>('googleOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('facebookOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('twitterOAuth.exchangeCodeTtlSeconds') ??
            60;

        await this.cacheService.set(
            `${this.keyPrefix}${code}`,
            { userId } satisfies ExchangeCodePayload,
            ttl,
        );

        return code;
    }

    /**
     * Validates and immediately deletes the one-time exchange code.
     */
    async consumeExchangeCode(code: string): Promise<string> {
        const key = `${this.keyPrefix}${code}`;
        const payload = await this.cacheService.get<ExchangeCodePayload>(key);

        if (!payload?.userId) {
            throw new UnauthorizedException('Invalid or expired exchange code');
        }

        await this.cacheService.del(key);
        return payload.userId;
    }
}
