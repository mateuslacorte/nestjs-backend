import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import Strategy from 'passport-apple';
import { AppRequest } from '@common/http/app-http';
import * as jwt from 'jsonwebtoken';

export interface AppleProfilePayload {
    appleId: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface AppleIdTokenPayload {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
}

interface AppleUserBody {
    name?: {
        firstName?: string;
        lastName?: string;
    };
    email?: string;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
    constructor(configService: ConfigService) {
        super({
            clientID:
                configService.get<string>('appleOAuth.clientId') || 'disabled',
            teamID:
                configService.get<string>('appleOAuth.teamId') || 'disabled',
            keyID:
                configService.get<string>('appleOAuth.keyId') || 'disabled',
            privateKeyString:
                configService.get<string>('appleOAuth.privateKey') || 'disabled',
            callbackURL:
                configService.get<string>('appleOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/apple/callback',
            scope: ['name', 'email'],
            passReqToCallback: true,
        });
    }

    async validate(
        req: AppRequest,
        _accessToken: string,
        _refreshToken: string,
        idToken: string,
        _profile: unknown,
        done: (error: Error | null, user?: AppleProfilePayload) => void,
    ): Promise<void> {
        try {
            const decoded = jwt.decode(idToken) as AppleIdTokenPayload | null;

            if (!decoded?.sub) {
                done(new Error('Apple id_token did not provide a subject (sub)'));
                return;
            }

            const email = decoded.email;
            if (!email) {
                done(new Error('Apple id_token did not provide an email'));
                return;
            }

            // Apple only sends user name on the very first consent grant
            let firstName = 'Apple';
            let lastName = '';

            const body = req.body as
                | { user?: string | AppleUserBody }
                | undefined;
            const rawUser =
                typeof body?.user === 'string'
                    ? (JSON.parse(body.user) as AppleUserBody)
                    : (body?.user as AppleUserBody | undefined);

            if (rawUser?.name?.firstName) {
                firstName = rawUser.name.firstName.trim() || 'Apple';
                lastName = rawUser.name.lastName?.trim() || '';
            }

            done(null, {
                appleId: decoded.sub,
                email,
                firstName,
                lastName,
            });
        } catch (err) {
            done(err instanceof Error ? err : new Error(String(err)));
        }
    }
}
