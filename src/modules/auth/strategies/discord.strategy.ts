import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface DiscordProfilePayload {
    discordId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface DiscordUserResponse {
    id?: string;
    username?: string;
    global_name?: string | null;
    email?: string | null;
    verified?: boolean;
}

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://discord.com/api/oauth2/authorize',
            tokenURL: 'https://discord.com/api/oauth2/token',
            clientID:
                configService.get<string>('discordOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('discordOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('discordOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/discord/callback',
            scope: ['identify', 'email'],
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<DiscordProfilePayload> {
        const { data } = await axios.get<DiscordUserResponse>(
            'https://discord.com/api/users/@me',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (!data?.id) {
            throw new UnauthorizedException('Discord account did not provide a user id');
        }
        if (!data.email) {
            throw new UnauthorizedException('Discord account did not provide an email');
        }

        const nameParts = (data.global_name || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const firstName = nameParts[0] || data.username || 'User';
        const lastName = nameParts.slice(1).join(' ');

        return {
            discordId: data.id,
            email: data.email,
            firstName,
            lastName,
        };
    }
}
