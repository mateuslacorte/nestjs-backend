import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('atlassianOAuth', () => ({
    enabled:
        process.env.ATLASSIAN_AUTH_ENABLED === 'true' ||
        process.env.ATLASSIAN_AUTH_ENABLED === '1',
    clientId: process.env.ATLASSIAN_CLIENT_ID || '',
    clientSecret: process.env.ATLASSIAN_CLIENT_SECRET || '',
    callbackUrl:
        process.env.ATLASSIAN_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/atlassian/callback',
    redirectAllowlist: (process.env.ATLASSIAN_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from ATLASSIAN_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.ATLASSIAN_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
