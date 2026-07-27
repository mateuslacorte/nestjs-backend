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

    /* istanbul ignore next -- Nest DI constructor parameter emit */
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
            this.configService.get<number>('githubOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('figmaOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('linkedinOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('slackOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('atlassianOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('gitlabOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('bitbucketOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('discordOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('twitchOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('steamOpenId.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('redditOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('appleOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('spotifyOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('amazonOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('microsoftOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('patreonOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('dropboxOAuth.exchangeCodeTtlSeconds') ??
            this.configService.get<number>('coinbaseOAuth.exchangeCodeTtlSeconds') ??
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
