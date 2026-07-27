import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface CoinbaseProfilePayload {
    coinbaseId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface CoinbaseUserResponse {
    data?: {
        id?: string;
        name?: string | null;
        email?: string | null;
    };
}

const COINBASE_USER_URL = 'https://api.coinbase.com/v2/user';

@Injectable()
export class CoinbaseStrategy extends PassportStrategy(Strategy, 'coinbase') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://login.coinbase.com/oauth2/auth',
            tokenURL: 'https://login.coinbase.com/oauth2/token',
            clientID:
                configService.get<string>('coinbaseOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('coinbaseOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('coinbaseOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/coinbase/callback',
            scope: ['wallet:user:email', 'wallet:user:read'],
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<CoinbaseProfilePayload> {
        const { data } = await axios.get<CoinbaseUserResponse>(
            COINBASE_USER_URL,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'CB-VERSION': '2021-06-23',
                },
            },
        );

        const user = data?.data;
        if (!user?.id) {
            throw new Error('Coinbase account did not provide a user id');
        }

        const email = user.email?.trim();
        if (!email) {
            throw new Error('Coinbase account did not provide an email');
        }

        const nameParts = (user.name ?? '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const firstName = nameParts[0] || 'Coinbase';
        const lastName = nameParts.slice(1).join(' ');

        return {
            coinbaseId: user.id,
            email,
            firstName,
            lastName,
        };
    }
}
