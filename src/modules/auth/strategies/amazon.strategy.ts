import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface AmazonProfilePayload {
    amazonId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface AmazonProfileResponse {
    user_id?: string;
    email?: string | null;
    name?: string | null;
}

@Injectable()
export class AmazonStrategy extends PassportStrategy(Strategy, 'amazon') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://www.amazon.com/ap/oa',
            tokenURL: 'https://api.amazon.com/auth/o2/token',
            clientID:
                configService.get<string>('amazonOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('amazonOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('amazonOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/amazon/callback',
            scope: ['profile'],
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<AmazonProfilePayload> {
        const { data } = await axios.get<AmazonProfileResponse>(
            'https://api.amazon.com/user/profile',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (!data?.user_id) {
            throw new Error('Amazon account did not provide a user id');
        }
        if (!data.email) {
            throw new Error('Amazon account did not provide an email');
        }

        const nameParts = (data.name || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const firstName = nameParts[0] || 'Amazon';
        const lastName = nameParts.slice(1).join(' ');

        return {
            amazonId: data.user_id,
            email: data.email,
            firstName,
            lastName,
        };
    }
}
