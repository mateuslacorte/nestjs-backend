import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('googleOAuth', () => ({
    enabled:
        process.env.GOOGLE_AUTH_ENABLED === 'true' ||
        process.env.GOOGLE_AUTH_ENABLED === '1',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/google/callback',
    redirectAllowlist: (process.env.GOOGLE_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from GOOGLE_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.GOOGLE_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
