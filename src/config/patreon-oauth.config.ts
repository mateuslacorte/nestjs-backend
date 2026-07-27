import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('patreonOAuth', () => ({
    enabled:
        process.env.PATREON_AUTH_ENABLED === 'true' ||
        process.env.PATREON_AUTH_ENABLED === '1',
    clientId: process.env.PATREON_CLIENT_ID || '',
    clientSecret: process.env.PATREON_CLIENT_SECRET || '',
    callbackUrl:
        process.env.PATREON_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/patreon/callback',
    redirectAllowlist: (process.env.PATREON_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from PATREON_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.PATREON_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
