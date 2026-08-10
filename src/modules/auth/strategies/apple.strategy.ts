import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import Strategy from 'passport-apple';
import { AppRequest } from '@common/http/app-http';
import { createPublicKey } from 'crypto';
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

interface AppleJwk {
    kid: string;
    kty: string;
    use?: string;
    alg?: string;
    n?: string;
    e?: string;
    crv?: string;
    x?: string;
    y?: string;
}

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Arity 6 is required: Nest's verify wrapper uses rest params (length 0), so
 * passport-oauth2 would skip the idToken/`params` argument and break validate.
 */
@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple', 6) {
    private readonly clientID: string;
    private jwksCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

    constructor(configService: ConfigService) {
        const clientID =
            configService.get<string>('appleOAuth.clientId') || 'disabled';
        super({
            clientID,
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
        this.clientID = clientID;
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

    private async fetchAppleJwks(): Promise<AppleJwk[]> {
        const now = Date.now();
        if (
            this.jwksCache &&
            now - this.jwksCache.fetchedAt < JWKS_CACHE_TTL_MS
        ) {
            return this.jwksCache.keys;
        }

        const response = await fetch(APPLE_JWKS_URL);
        if (!response.ok) {
            throw new Error(
                `Failed to fetch Apple JWKS: HTTP ${response.status}`,
            );
        }

        const body = (await response.json()) as { keys: AppleJwk[] };
        this.jwksCache = { keys: body.keys, fetchedAt: now };
        return body.keys;
    }

    private async verifyAppleIdToken(
        idToken: string,
    ): Promise<AppleIdTokenPayload> {
        const decodedComplete = jwt.decode(idToken, { complete: true });
        if (
            !decodedComplete ||
            typeof decodedComplete === 'string' ||
            !decodedComplete.header?.kid
        ) {
            throw new Error('Apple id_token header missing kid');
        }

        const kid = decodedComplete.header.kid;
        const keys = await this.fetchAppleJwks();
        const jwk = keys.find((key) => key.kid === kid);
        if (!jwk) {
            throw new Error(`Apple id_token kid not found in JWKS: ${kid}`);
        }

        const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
        return jwt.verify(idToken, publicKey, {
            algorithms: ['RS256'],
            audience: this.clientID,
            issuer: 'https://appleid.apple.com',
        }) as AppleIdTokenPayload;
    }

    async validate(
        req: AppRequest,
        _accessToken: string,
        _refreshToken: string,
        idToken: string,
        _profile: unknown,
    ): Promise<AppleProfilePayload> {
        const decoded = await this.verifyAppleIdToken(idToken);

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
