import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

export interface SlackProfilePayload {
    slackId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface SlackUserinfoResponse {
    ok?: boolean;
    sub?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
}

@Injectable()
export class SlackStrategy extends PassportStrategy(Strategy, 'slack') {
    constructor(configService: ConfigService) {
        super({
            authorizationURL: 'https://slack.com/openid/connect/authorize',
            tokenURL: 'https://slack.com/api/openid.connect.token',
            clientID:
                configService.get<string>('slackOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('slackOAuth.clientSecret') || 'disabled',
            callbackURL:
                configService.get<string>('slackOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/slack/callback',
            scope: 'openid email profile',
            skipUserProfile: true,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
    ): Promise<SlackProfilePayload> {
        const { data } = await axios.get<SlackUserinfoResponse>(
            'https://slack.com/api/openid.connect.userInfo',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );

        if (!data?.sub) {
            throw new Error('Slack account did not provide a user id');
        }
        if (!data.email) {
            throw new Error('Slack account did not provide an email');
        }

        let firstName = (data.given_name || '').trim();
        let lastName = (data.family_name || '').trim();

        if (!firstName) {
            const nameParts = (data.name || '').trim().split(/\s+/).filter(Boolean);
            firstName = nameParts[0] || 'User';
            lastName = lastName || nameParts.slice(1).join(' ');
        }

        return {
            slackId: data.sub,
            email: data.email,
            firstName,
            lastName,
        };
    }
}
