import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('githubOAuth', () => ({
    enabled:
        process.env.GITHUB_AUTH_ENABLED === 'true' ||
        process.env.GITHUB_AUTH_ENABLED === '1',
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl:
        process.env.GITHUB_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/github/callback',
    redirectAllowlist: (process.env.GITHUB_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from GITHUB_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.GITHUB_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
