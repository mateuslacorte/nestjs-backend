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
export class GitlabAuthGuard extends AuthGuard('gitlab') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        this.assertEnabled();
        return super.canActivate(context);
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<AppRequest>();
        const isCallback = requestPath(req).includes('/gitlab/callback');
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
        const enabled = this.configService.get<boolean>('gitlabOAuth.enabled');
        if (!enabled) {
            throw new ServiceUnavailableException('GitLab authentication is disabled');
        }
    }

    private resolveRedirect(req: AppRequest): string {
        const allowlist =
            this.configService.get<string[]>('gitlabOAuth.redirectAllowlist') || [];
        const fromQuery =
            typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '';

        if (fromQuery) {
            if (!this.isAllowedRedirect(fromQuery, allowlist)) {
                throw new BadRequestException(
                    'Redirect URL is not in GITLAB_REDIRECT_ALLOWLIST',
                );
            }
            return fromQuery;
        }

        if (allowlist.length > 0) {
            return allowlist[0];
        }

        throw new BadRequestException(
            'Missing redirect query parameter and GITLAB_REDIRECT_ALLOWLIST is empty',
        );
    }

    private isAllowedRedirect(redirect: string, allowlist: string[]): boolean {
        return allowlist.some(
            (prefix) => redirect === prefix || redirect.startsWith(prefix),
        );
    }
}
