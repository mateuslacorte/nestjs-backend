import {
    ExecutionContext,
    Injectable,
    ServiceUnavailableException,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AppRequest, requestPath } from '@common/http/app-http';
import { isAllowedOAuthRedirect } from '../utils/oauth-redirect-allowlist.util';

@Injectable()
export class FigmaAuthGuard extends AuthGuard('figma') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        this.assertEnabled();
        return super.canActivate(context);
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<AppRequest>();
        const isCallback = requestPath(req).includes('/figma/callback');
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
        const enabled = this.configService.get<boolean>('figmaOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('Figma authentication is disabled');
        }
    }

    private resolveRedirect(req: AppRequest): string {
        const allowlist =
            this.configService.get<string[]>('figmaOAuth.redirectAllowlist') || [];
        const fromQuery =
            typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '';

        if (fromQuery) {
            if (!this.isAllowedRedirect(fromQuery, allowlist)) {
                throw new BadRequestException(
                    'Redirect URL is not in FIGMA_REDIRECT_ALLOWLIST',
                );
            }
            return fromQuery;
        }

        if (allowlist.length > 0) {
            return allowlist[0];
        }

        throw new BadRequestException(
            'Missing redirect query parameter and FIGMA_REDIRECT_ALLOWLIST is empty',
        );
    }

    private isAllowedRedirect(redirect: string, allowlist: string[]): boolean {
        return isAllowedOAuthRedirect(redirect, allowlist);
    }
}
