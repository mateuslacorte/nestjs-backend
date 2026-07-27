import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface GitlabProfilePayload {
    gitlabId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface GitlabUserResponse {
    id?: number | string;
    email?: string;
    name?: string;
    username?: string;
    avatar_url?: string;
}

@Injectable()
export class GitlabStrategy extends PassportStrategy(Strategy, 'gitlab') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://gitlab.com/oauth/authorize',
            tokenURL: 'https://gitlab.com/oauth/token',
            clientID:
                configService.get<string>('gitlabOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('gitlabOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('gitlabOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/gitlab/callback',
            scope: 'read_user',
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<GitlabProfilePayload> {
        const { data } = await axios.get<GitlabUserResponse>(
            'https://gitlab.com/api/v4/user',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (data?.id === undefined || data?.id === null || data.id === '') {
            throw new Error('GitLab account did not provide a user id');
        }
        if (!data.email) {
            throw new Error('GitLab account did not provide an email');
        }

        const nameParts = (data.name || '').trim().split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] || data.username || 'User';
        const lastName = nameParts.slice(1).join(' ');

        return {
            gitlabId: String(data.id),
            email: data.email,
            firstName,
            lastName,
        };
    }
}
