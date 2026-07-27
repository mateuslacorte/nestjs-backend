import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('coinbaseOAuth', () => ({
    enabled:
        process.env.COINBASE_AUTH_ENABLED === 'true' ||
        process.env.COINBASE_AUTH_ENABLED === '1',
    clientId: process.env.COINBASE_CLIENT_ID || '',
    clientSecret: process.env.COINBASE_CLIENT_SECRET || '',
    callbackUrl:
        process.env.COINBASE_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/coinbase/callback',
    redirectAllowlist: (process.env.COINBASE_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from COINBASE_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.COINBASE_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
