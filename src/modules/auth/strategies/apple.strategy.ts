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

/**
 * Arity 6 is required: Nest's verify wrapper uses rest params (length 0), so
 * passport-oauth2 would skip the idToken/`params` argument and break validate.
 */
@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple', 6) {
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

    authorizationParams(options: Record<string, unknown> = {}): Record<string, string> {
        const params: Record<string, string> = {
            response_mode: 'form_post',
        };
        if (typeof options.state === 'string' && options.state.length > 0) {
            params.state = options.state;
        }
        return params;
    }

    async validate(
        req: AppRequest,
        _accessToken: string,
        _refreshToken: string,
        idToken: string,
        _profile: unknown,
    ): Promise<AppleProfilePayload> {
        const decoded = jwt.decode(idToken) as AppleIdTokenPayload | null;

        if (!decoded?.sub) {
            throw new Error('Apple id_token did not provide a subject (sub)');
        }

        const email = decoded.email;
        if (!email) {
            throw new Error('Apple id_token did not provide an email');
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

        return {
            appleId: decoded.sub,
            email,
            firstName,
            lastName,
        };
    }
}
