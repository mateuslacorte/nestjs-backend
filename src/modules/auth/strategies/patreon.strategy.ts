import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface PatreonProfilePayload {
    patreonId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface PatreonIdentityResponse {
    data?: {
        id?: string;
        attributes?: {
            email?: string | null;
            full_name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
        };
    };
}

const PATREON_IDENTITY_URL =
    'https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=full_name,first_name,last_name,email';

@Injectable()
export class PatreonStrategy extends PassportStrategy(Strategy, 'patreon') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://www.patreon.com/oauth2/authorize',
            tokenURL: 'https://www.patreon.com/api/oauth2/token',
            clientID:
                configService.get<string>('patreonOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('patreonOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('patreonOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/patreon/callback',
            scope: ['identity', 'identity[email]'],
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<PatreonProfilePayload> {
        const { data } = await axios.get<PatreonIdentityResponse>(
            PATREON_IDENTITY_URL,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        const user = data?.data;
        if (!user?.id) {
            throw new Error('Patreon account did not provide a user id');
        }

        const attrs = user.attributes ?? {};
        const email = attrs.email?.trim();
        if (!email) {
            throw new Error('Patreon account did not provide an email');
        }

        let firstName = (attrs.first_name ?? '').trim();
        let lastName = (attrs.last_name ?? '').trim();

        if (!firstName && !lastName) {
            const nameParts = (attrs.full_name ?? '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            firstName = nameParts[0] ?? '';
            lastName = nameParts.slice(1).join(' ');
        }

        if (!firstName) {
            firstName = 'Patreon';
        }

        return {
            patreonId: user.id,
            email,
            firstName,
            lastName,
        };
    }
}
