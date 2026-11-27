import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface TwitchProfilePayload {
    twitchId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface TwitchHelixUser {
    id?: string;
    login?: string;
    display_name?: string;
    email?: string;
}

interface TwitchUsersResponse {
    data?: TwitchHelixUser[];
}

@Injectable()
export class TwitchStrategy extends PassportStrategy(Strategy, 'twitch') {
    private readonly clientId: string;

    constructor(configService: ConfigService) {
        const clientId =
            configService.get<string>('twitchOAuth.clientId') || 'disabled';
        super({
            authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
            tokenURL: 'https://id.twitch.tv/oauth2/token',
            clientID: clientId,
            clientSecret:
                configService.get<string>('twitchOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('twitchOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/twitch/callback',
            scope: 'user:read:email',
            skipUserProfile: true,
        });
        this.clientId = clientId;
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<TwitchProfilePayload> {
        const { data } = await axios.get<TwitchUsersResponse>(
            'https://api.twitch.tv/helix/users',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Client-Id': this.clientId,
                },
            },
        );

        const user = data?.data?.[0];
        if (!user?.id) {
            throw new UnauthorizedException('Twitch account did not provide a user id');
        }
        if (!user.email) {
            throw new UnauthorizedException('Twitch account did not provide an email');
        }

        const nameParts = (user.display_name || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const firstName = nameParts[0] || user.login || 'User';
        const lastName = nameParts.slice(1).join(' ');

        return {
            twitchId: user.id,
            email: user.email,
            firstName,
            lastName,
        };
    }
}
