import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface DropboxProfilePayload {
    dropboxId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface DropboxAccountResponse {
    account_id?: string;
    email?: string | null;
    name?: {
        given_name?: string | null;
        surname?: string | null;
        display_name?: string | null;
    };
}

const DROPBOX_ACCOUNT_URL =
    'https://api.dropboxapi.com/2/users/get_current_account';

@Injectable()
export class DropboxStrategy extends PassportStrategy(Strategy, 'dropbox') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://www.dropbox.com/oauth2/authorize',
            tokenURL: 'https://api.dropboxapi.com/oauth2/token',
            clientID:
                configService.get<string>('dropboxOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('dropboxOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('dropboxOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/dropbox/callback',
            scope: ['account_info.read'],
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<DropboxProfilePayload> {
        const { data } = await axios.post<DropboxAccountResponse>(
            DROPBOX_ACCOUNT_URL,
            'null',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                transformRequest: [(body) => body],
            },
        );

        if (!data?.account_id) {
            throw new UnauthorizedException('Dropbox account did not provide an account id');
        }

        const email = data.email?.trim();
        if (!email) {
            throw new UnauthorizedException('Dropbox account did not provide an email');
        }

        let firstName = (data.name?.given_name ?? '').trim();
        let lastName = (data.name?.surname ?? '').trim();

        if (!firstName && !lastName) {
            const nameParts = (data.name?.display_name ?? '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            firstName = nameParts[0] ?? '';
            lastName = nameParts.slice(1).join(' ');
        }

        if (!firstName) {
            firstName = 'Dropbox';
        }

        return {
            dropboxId: data.account_id,
            email,
            firstName,
            lastName,
        };
    }
}
