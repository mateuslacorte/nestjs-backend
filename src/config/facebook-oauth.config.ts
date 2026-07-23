import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('facebookOAuth', () => ({
    enabled:
        process.env.FACEBOOK_AUTH_ENABLED === 'true' ||
        process.env.FACEBOOK_AUTH_ENABLED === '1',
    appId: process.env.FACEBOOK_APP_ID || '',
    appSecret: process.env.FACEBOOK_APP_SECRET || '',
    callbackUrl:
        process.env.FACEBOOK_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/facebook/callback',
    redirectAllowlist: (process.env.FACEBOOK_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from FACEBOOK_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.FACEBOOK_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
