import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface FigmaProfilePayload {
    figmaId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface FigmaMeResponse {
    id: string;
    email?: string;
    handle?: string;
    img_url?: string;
}

@Injectable()
export class FigmaStrategy extends PassportStrategy(Strategy, 'figma') {
    constructor(configService: ConfigService) {
        const clientId =
            configService.get<string>('figmaOAuth.clientId') || 'disabled';
        const clientSecret =
            configService.get<string>('figmaOAuth.clientSecret') || 'disabled';

        super({
            authorizationURL: 'https://www.figma.com/oauth',
            tokenURL: 'https://api.figma.com/v1/oauth/token',
            clientID: clientId,
            clientSecret,
            callbackURL:
                configService.get<string>('figmaOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/figma/callback',
            scope: 'current_user:read',
            skipUserProfile: true,
            customHeaders: {
                Authorization:
                    'Basic ' +
                    Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            },
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<FigmaProfilePayload> {
        const { data } = await axios.get<FigmaMeResponse>(
            'https://api.figma.com/v1/me',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (!data?.id) {
            throw new Error('Figma account did not provide a user id');
        }
        if (!data.email) {
            throw new Error('Figma account did not provide an email');
        }

        const handle = (data.handle || '').trim();
        const nameParts = handle.split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ');

        return {
            figmaId: data.id,
            email: data.email,
            firstName,
            lastName,
        };
    }
}
