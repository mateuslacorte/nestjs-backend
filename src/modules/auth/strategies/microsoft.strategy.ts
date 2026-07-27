import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface MicrosoftProfilePayload {
    microsoftId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface MicrosoftGraphMeResponse {
    id?: string;
    mail?: string | null;
    userPrincipalName?: string | null;
    displayName?: string | null;
    givenName?: string | null;
    surname?: string | null;
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL:
                configService.get<string>('microsoftOAuth.authorizationUrl') ||
                'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenURL:
                configService.get<string>('microsoftOAuth.tokenUrl') ||
                'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            clientID:
                configService.get<string>('microsoftOAuth.clientId') ||
                'disabled',
            clientSecret:
                configService.get<string>('microsoftOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('microsoftOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/microsoft/callback',
            scope: ['openid', 'profile', 'email', 'User.Read'],
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<MicrosoftProfilePayload> {
        const { data } = await axios.get<MicrosoftGraphMeResponse>(
            'https://graph.microsoft.com/v1.0/me',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (!data?.id) {
            throw new Error('Microsoft account did not provide a user id');
        }

        const email = (data.mail || data.userPrincipalName || '').trim();
        if (!email) {
            throw new Error('Microsoft account did not provide an email');
        }

        let firstName = (data.givenName || '').trim();
        let lastName = (data.surname || '').trim();

        if (!firstName) {
            const nameParts = (data.displayName || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            firstName = nameParts[0] || 'Microsoft';
            lastName = lastName || nameParts.slice(1).join(' ');
        }

        return {
            microsoftId: data.id,
            email,
            firstName,
            lastName,
        };
    }
}
