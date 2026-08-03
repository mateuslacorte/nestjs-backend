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
export class AtlassianAuthGuard extends AuthGuard('atlassian') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        this.assertEnabled();
        return super.canActivate(context);
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<AppRequest>();
        const isCallback = requestPath(req).includes('/atlassian/callback');
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
        const enabled = this.configService.get<boolean>('atlassianOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException(
                'Atlassian authentication is disabled',
            );
        }
    }

    private resolveRedirect(req: AppRequest): string {
        const allowlist =
            this.configService.get<string[]>('atlassianOAuth.redirectAllowlist') ||
            [];
        const fromQuery =
            typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '';

        if (fromQuery) {
            if (!this.isAllowedRedirect(fromQuery, allowlist)) {
                throw new BadRequestException(
                    'Redirect URL is not in ATLASSIAN_REDIRECT_ALLOWLIST',
                );
            }
            return fromQuery;
        }

        if (allowlist.length > 0) {
            return allowlist[0];
        }

        throw new BadRequestException(
            'Missing redirect query parameter and ATLASSIAN_REDIRECT_ALLOWLIST is empty',
        );
    }

    private isAllowedRedirect(redirect: string, allowlist: string[]): boolean {
        return allowlist.some(
            (prefix) => redirect === prefix || redirect.startsWith(prefix),
        );
    }
}
