import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface AtlassianProfilePayload {
    atlassianId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface AtlassianMeResponse {
    account_id?: string;
    email?: string;
    name?: string;
    picture?: string;
    nickname?: string;
}

@Injectable()
export class AtlassianStrategy extends PassportStrategy(Strategy, 'atlassian') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://auth.atlassian.com/authorize',
            tokenURL: 'https://auth.atlassian.com/oauth/token',
            clientID:
                configService.get<string>('atlassianOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('atlassianOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('atlassianOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/atlassian/callback',
            scope: 'read:me',
            skipUserProfile: true,
        });
    }

    authorizationParams(): Record<string, string> {
        return {
            audience: 'api.atlassian.com',
            prompt: 'consent',
        };
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<AtlassianProfilePayload> {
        const { data } = await axios.get<AtlassianMeResponse>(
            'https://api.atlassian.com/me',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );

        if (!data?.account_id) {
            throw new Error('Atlassian account did not provide a user id');
        }
        if (!data.email) {
            throw new Error('Atlassian account did not provide an email');
        }

        const nameParts = (data.name || '').trim().split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] || data.nickname || 'User';
        const lastName = nameParts.slice(1).join(' ');

        return {
            atlassianId: data.account_id,
            email: data.email,
            firstName,
            lastName,
        };
    }
}
