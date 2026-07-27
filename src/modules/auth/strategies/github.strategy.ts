import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile } from 'passport-github2';

export interface GithubProfilePayload {
    githubId: string;
    email: string;
    firstName: string;
    lastName: string;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(configService: ConfigService) {
        super({
            clientID: configService.get<string>('githubOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('githubOAuth.clientSecret') || 'disabled',
            callbackURL:
                configService.get<string>('githubOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/github/callback',
            scope: ['user:email'],
        });
    }

    validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: GithubProfilePayload) => void,
    ): void {
        const emails = (profile.emails || []) as Array<{
            value: string;
            primary?: boolean;
        }>;
        const email =
            emails.find((e) => e.primary)?.value || emails[0]?.value;
        if (!email) {
            done(new Error('GitHub account did not provide an email'), undefined);
            return;
        }

        const displayName = profile.displayName || profile.username || '';
        const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
        const firstName =
            nameParts[0] || profile.username || 'User';
        const lastName = nameParts.slice(1).join(' ');

        const payload: GithubProfilePayload = {
            githubId: profile.id,
            email,
            firstName,
            lastName,
        };

        done(null, payload);
    }
}
