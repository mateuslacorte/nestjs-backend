import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile } from '@superfaceai/passport-twitter-oauth2';

export interface TwitterProfilePayload {
    twitterId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface TwitterJsonProfile {
    confirmed_email?: string | null;
    email?: string | null;
}

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
    constructor(configService: ConfigService) {
        const clientType =
            configService.get<'confidential' | 'public'>('twitterOAuth.clientType') ||
            'confidential';

        super({
            clientType,
            clientID: configService.get<string>('twitterOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('twitterOAuth.clientSecret') || 'disabled',
            callbackURL:
                configService.get<string>('twitterOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/twitter/callback',
            scope: ['tweet.read', 'users.read', 'offline.access', 'users.email'],
            userProfileURL:
                'https://api.twitter.com/2/users/me?user.fields=profile_image_url,url,confirmed_email',
        });
    }

    validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: TwitterProfilePayload) => void,
    ): void {
        const json = (profile as Profile & { _json?: TwitterJsonProfile })._json;
        const email =
            profile.emails?.[0]?.value ||
            json?.confirmed_email ||
            json?.email ||
            undefined;

        if (!email) {
            done(new Error('Twitter account did not provide an email'), undefined);
            return;
        }

        const displayName = profile.displayName || profile.username || 'User';
        const nameParts = displayName.trim().split(/\s+/);
        const firstName = nameParts[0] || profile.username || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';

        const payload: TwitterProfilePayload = {
            twitterId: profile.id,
            email,
            firstName,
            lastName,
        };

        done(null, payload);
    }
}
