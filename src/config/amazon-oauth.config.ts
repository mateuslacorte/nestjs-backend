import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('amazonOAuth', () => ({
    enabled:
        process.env.AMAZON_AUTH_ENABLED === 'true' ||
        process.env.AMAZON_AUTH_ENABLED === '1',
    clientId: process.env.AMAZON_CLIENT_ID || '',
    clientSecret: process.env.AMAZON_CLIENT_SECRET || '',
    callbackUrl:
        process.env.AMAZON_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/amazon/callback',
    redirectAllowlist: (process.env.AMAZON_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from AMAZON_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.AMAZON_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
