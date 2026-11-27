import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface BitbucketProfilePayload {
    bitbucketId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface BitbucketUserResponse {
    uuid?: string;
    display_name?: string;
    username?: string;
    nickname?: string;
}

interface BitbucketEmailEntry {
    email?: string;
    is_primary?: boolean;
    is_confirmed?: boolean;
}

interface BitbucketEmailsResponse {
    values?: BitbucketEmailEntry[];
}

@Injectable()
export class BitbucketStrategy extends PassportStrategy(Strategy, 'bitbucket') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://bitbucket.org/site/oauth2/authorize',
            tokenURL: 'https://bitbucket.org/site/oauth2/access_token',
            clientID:
                configService.get<string>('bitbucketOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('bitbucketOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('bitbucketOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/bitbucket/callback',
            // account: profile (/user); email: primary email (/user/emails)
            scope: 'account email',
            skipUserProfile: true,
            customHeaders: { 'User-Agent': 'nestjs-backend' },
        });

        // Prefer Authorization: Bearer for Bitbucket API GETs
        (this as unknown as { _oauth2: { useAuthorizationHeaderforGET: (v: boolean) => void } })
            ._oauth2.useAuthorizationHeaderforGET(true);
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<BitbucketProfilePayload> {
        const headers = {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'User-Agent': 'nestjs-backend',
        };

        const { data: user } = await axios.get<BitbucketUserResponse>(
            'https://api.bitbucket.org/2.0/user',
            { headers },
        );

        if (!user?.uuid) {
            throw new UnauthorizedException('Bitbucket account did not provide a user id');
        }

        const { data: emails } = await axios.get<BitbucketEmailsResponse>(
            'https://api.bitbucket.org/2.0/user/emails',
            { headers },
        );

        const email = this.pickEmail(emails?.values);
        if (!email) {
            throw new UnauthorizedException('Bitbucket account did not provide an email');
        }

        const nameParts = (user.display_name || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const firstName =
            nameParts[0] || user.nickname || user.username || 'User';
        const lastName = nameParts.slice(1).join(' ');

        return {
            bitbucketId: user.uuid,
            email,
            firstName,
            lastName,
        };
    }

    private pickEmail(values?: BitbucketEmailEntry[]): string | undefined {
        if (!values?.length) {
            return undefined;
        }

        const primaryConfirmed = values.find(
            (e) => e.is_primary && e.is_confirmed && e.email,
        );
        if (primaryConfirmed?.email) {
            return primaryConfirmed.email;
        }

        const primary = values.find((e) => e.is_primary && e.email);
        if (primary?.email) {
            return primary.email;
        }

        const confirmed = values.find((e) => e.is_confirmed && e.email);
        if (confirmed?.email) {
            return confirmed.email;
        }

        return values.find((e) => e.email)?.email;
    }
}
