import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface RedditProfilePayload {
    redditId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface RedditMeResponse {
    id?: string;
    name?: string;
    icon_img?: string;
}

const REDDIT_USER_AGENT = 'nestjs-backend/1.0';

@Injectable()
export class RedditStrategy extends PassportStrategy(Strategy, 'reddit') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://www.reddit.com/api/v1/authorize',
            tokenURL: 'https://www.reddit.com/api/v1/access_token',
            clientID:
                configService.get<string>('redditOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('redditOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('redditOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/reddit/callback',
            scope: 'identity',
            skipUserProfile: true,
            customHeaders: { 'User-Agent': REDDIT_USER_AGENT },
        });

        const oauth2 = this as unknown as {
            _oauth2: {
                useAuthorizationHeaderforGET: (v: boolean) => void;
                setAuthMethod: (method: string) => void;
            };
        };
        // Reddit requires HTTP Basic for token exchange and Bearer for API GETs
        oauth2._oauth2.setAuthMethod('Basic');
        oauth2._oauth2.useAuthorizationHeaderforGET(true);
    }

    /** Reddit authorization code flow requires duration=temporary|permanent */
    authorizationParams(): Record<string, string> {
        return { duration: 'temporary' };
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<RedditProfilePayload> {
        const { data } = await axios.get<RedditMeResponse>(
            'https://oauth.reddit.com/api/v1/me',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'User-Agent': REDDIT_USER_AGENT,
                },
            },
        );

        if (!data?.id) {
            throw new Error('Reddit account did not provide a user id');
        }

        const firstName = (data.name || '').trim() || 'Reddit';

        return {
            redditId: data.id,
            // Reddit does not expose email via OAuth identity scope
            email: `${data.id}@users.noreply.reddit.com`,
            firstName,
            lastName: '',
        };
    }
}
