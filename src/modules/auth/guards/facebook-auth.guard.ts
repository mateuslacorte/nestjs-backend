import {
    ExecutionContext,
    Injectable,
    ServiceUnavailableException,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        this.assertEnabled();
        return super.canActivate(context);
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<Request>();
        const isCallback = req.path.includes('/facebook/callback');
        if (isCallback) {
            return {};
        }

        const redirect = this.resolveRedirect(req);
        return {
            state: Buffer.from(JSON.stringify({ r: redirect }), 'utf8').toString(
                'base64url',
            ),
        };
    }

    private assertEnabled(): void {
        const enabled = this.configService.get<boolean>('facebookOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Facebook authentication is disabled');
        }
    }

    private resolveRedirect(req: Request): string {
        const allowlist =
            this.configService.get<string[]>('facebookOAuth.redirectAllowlist') || [];
        const fromQuery =
            typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '';

        if (fromQuery) {
            if (!this.isAllowedRedirect(fromQuery, allowlist)) {
                throw new BadRequestException(
                    'Redirect URL is not in FACEBOOK_REDIRECT_ALLOWLIST',
                );
            }
            return fromQuery;
        }

        if (allowlist.length > 0) {
            return allowlist[0];
        }

        throw new BadRequestException(
            'Missing redirect query parameter and FACEBOOK_REDIRECT_ALLOWLIST is empty',
        );
    }

    private isAllowedRedirect(redirect: string, allowlist: string[]): boolean {
        return allowlist.some(
            (prefix) => redirect === prefix || redirect.startsWith(prefix),
        );
    }
}
