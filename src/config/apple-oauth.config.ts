import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('appleOAuth', () => ({
    enabled:
        process.env.APPLE_AUTH_ENABLED === 'true' ||
        process.env.APPLE_AUTH_ENABLED === '1',
    /** Services ID (e.g. com.example.service) */
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    /** PEM private key — store with literal \n in the env value (Docker-safe) */
    privateKey: (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    callbackUrl:
        process.env.APPLE_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/apple/callback',
    redirectAllowlist: (process.env.APPLE_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from APPLE_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.APPLE_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
