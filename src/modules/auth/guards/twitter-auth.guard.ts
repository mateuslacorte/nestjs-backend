import {
    ExecutionContext,
    Injectable,
    ServiceUnavailableException,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AppRequest, requestPath } from '@common/http/app-http';

@Injectable()
export class TwitterAuthGuard extends AuthGuard('twitter') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        this.assertEnabled();
        return super.canActivate(context);
    }

    /**
     * Recover the client redirect payload that PKCESessionStore nests under
     * the OAuth `state` handle, and expose it as base64url on the request for
     * AuthService (same shape as other providers' query `state`).
     */
    handleRequest<TUser>(
        err: Error | null | undefined,
        user: TUser,
        info: { state?: string | { r?: string } } | undefined,
        context: ExecutionContext,
        status?: number,
    ): TUser {
        if (info?.state != null) {
            const req = context.switchToHttp().getRequest<AppRequest>();
            const raw = info.state;
            req.oauthState =
                typeof raw === 'string'
                    ? raw
                    : Buffer.from(JSON.stringify(raw), 'utf8').toString(
                          'base64url',
                      );
        }
        return super.handleRequest(err, user, info, context, status);
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<AppRequest>();
        const isCallback = requestPath(req).includes('/twitter/callback');
        if (isCallback) {
            return {};
        }

        const redirect = this.resolveRedirect(req);
        // Must be an object (not a string). passport-oauth2 skips PKCE
        // code_verifier session storage when `state` is a string, which
        // breaks X/Twitter OAuth 2.0 on callback (401 Unauthorized).
        return {
            state: { r: redirect },
        };
    }

    private assertEnabled(): void {
        const enabled = this.configService.get<boolean>('twitterOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Twitter authentication is disabled');
        }
    }

    private resolveRedirect(req: AppRequest): string {
        const allowlist =
            this.configService.get<string[]>('twitterOAuth.redirectAllowlist') || [];
        const fromQuery =
            typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '';

        if (fromQuery) {
            if (!this.isAllowedRedirect(fromQuery, allowlist)) {
                throw new BadRequestException(
                    'Redirect URL is not in TWITTER_REDIRECT_ALLOWLIST',
                );
            }
            return fromQuery;
        }

        if (allowlist.length > 0) {
            return allowlist[0];
        }

        throw new BadRequestException(
            'Missing redirect query parameter and TWITTER_REDIRECT_ALLOWLIST is empty',
        );
    }

    private isAllowedRedirect(redirect: string, allowlist: string[]): boolean {
        return allowlist.some(
            (prefix) => redirect === prefix || redirect.startsWith(prefix),
        );
    }
}
