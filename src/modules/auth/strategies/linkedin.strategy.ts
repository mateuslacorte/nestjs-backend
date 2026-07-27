import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface LinkedinProfilePayload {
    linkedinId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface LinkedinUserinfoResponse {
    sub?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
}

@Injectable()
export class LinkedinStrategy extends PassportStrategy(Strategy, 'linkedin') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
            tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
            clientID:
                configService.get<string>('linkedinOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('linkedinOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('linkedinOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/linkedin/callback',
            scope: 'openid profile email',
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<LinkedinProfilePayload> {
        const { data } = await axios.get<LinkedinUserinfoResponse>(
            'https://api.linkedin.com/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (!data?.sub) {
            throw new Error('LinkedIn account did not provide a user id');
        }
        if (!data.email) {
            throw new Error('LinkedIn account did not provide an email');
        }

        let firstName = (data.given_name || '').trim();
        let lastName = (data.family_name || '').trim();

        if (!firstName) {
            const nameParts = (data.name || '').trim().split(/\s+/).filter(Boolean);
            firstName = nameParts[0] || 'User';
            lastName = lastName || nameParts.slice(1).join(' ');
        }

        return {
            linkedinId: data.sub,
            email: data.email,
            firstName,
            lastName,
        };
    }
}
