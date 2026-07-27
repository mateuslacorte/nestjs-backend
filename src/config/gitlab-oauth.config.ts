import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('gitlabOAuth', () => ({
    enabled:
        process.env.GITLAB_AUTH_ENABLED === 'true' ||
        process.env.GITLAB_AUTH_ENABLED === '1',
    clientId: process.env.GITLAB_CLIENT_ID || '',
    clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
    callbackUrl:
        process.env.GITLAB_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/gitlab/callback',
    redirectAllowlist: (process.env.GITLAB_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from GITLAB_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.GITLAB_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
