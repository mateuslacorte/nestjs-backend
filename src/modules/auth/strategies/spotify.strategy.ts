import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface SpotifyProfilePayload {
    spotifyId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface SpotifyMeResponse {
    id?: string;
    display_name?: string | null;
    email?: string | null;
}

@Injectable()
export class SpotifyStrategy extends PassportStrategy(Strategy, 'spotify') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://accounts.spotify.com/authorize',
            tokenURL: 'https://accounts.spotify.com/api/token',
            clientID:
                configService.get<string>('spotifyOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('spotifyOAuth.clientSecret') ||
                'disabled',
            callbackURL:
                configService.get<string>('spotifyOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/spotify/callback',
            scope: ['user-read-email', 'user-read-private'],
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<SpotifyProfilePayload> {
        const { data } = await axios.get<SpotifyMeResponse>(
            'https://api.spotify.com/v1/me',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (!data?.id) {
            throw new Error('Spotify account did not provide a user id');
        }
        if (!data.email) {
            throw new Error('Spotify account did not provide an email');
        }

        const displayName = (data.display_name || '').trim();
        const nameParts = displayName ? displayName.split(/\s+/) : [];

        const firstName = nameParts[0] || displayName || 'Spotify';
        const lastName = nameParts.slice(1).join(' ');

        return {
            spotifyId: data.id,
            email: data.email,
            firstName,
            lastName,
        };
    }
}

