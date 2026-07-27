import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('bitbucketOAuth', () => ({
    enabled:
        process.env.BITBUCKET_AUTH_ENABLED === 'true' ||
        process.env.BITBUCKET_AUTH_ENABLED === '1',
    clientId: process.env.BITBUCKET_CLIENT_ID || '',
    clientSecret: process.env.BITBUCKET_CLIENT_SECRET || '',
    callbackUrl:
        process.env.BITBUCKET_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/bitbucket/callback',
    redirectAllowlist: (process.env.BITBUCKET_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from BITBUCKET_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.BITBUCKET_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
