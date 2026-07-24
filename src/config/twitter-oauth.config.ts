import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('twitterOAuth', () => ({
    enabled:
        process.env.TWITTER_AUTH_ENABLED === 'true' ||
        process.env.TWITTER_AUTH_ENABLED === '1',
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    callbackUrl:
        process.env.TWITTER_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/twitter/callback',
    redirectAllowlist: (process.env.TWITTER_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from TWITTER_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.TWITTER_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
    /** confidential (web app with secret) or public (PKCE-only clients) */
    clientType:
        process.env.TWITTER_CLIENT_TYPE === 'public' ? 'public' : 'confidential',
}));
