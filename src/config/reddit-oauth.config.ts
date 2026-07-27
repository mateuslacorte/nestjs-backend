import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('redditOAuth', () => ({
    enabled:
        process.env.REDDIT_AUTH_ENABLED === 'true' ||
        process.env.REDDIT_AUTH_ENABLED === '1',
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    callbackUrl:
        process.env.REDDIT_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/reddit/callback',
    redirectAllowlist: (process.env.REDDIT_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from REDDIT_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.REDDIT_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
