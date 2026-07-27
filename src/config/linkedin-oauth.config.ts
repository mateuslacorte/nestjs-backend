import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('linkedinOAuth', () => ({
    enabled:
        process.env.LINKEDIN_AUTH_ENABLED === 'true' ||
        process.env.LINKEDIN_AUTH_ENABLED === '1',
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackUrl:
        process.env.LINKEDIN_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/linkedin/callback',
    redirectAllowlist: (process.env.LINKEDIN_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from LINKEDIN_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.LINKEDIN_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
