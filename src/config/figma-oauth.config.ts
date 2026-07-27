import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('figmaOAuth', () => ({
    enabled:
        process.env.FIGMA_AUTH_ENABLED === 'true' ||
        process.env.FIGMA_AUTH_ENABLED === '1',
    clientId: process.env.FIGMA_CLIENT_ID || '',
    clientSecret: process.env.FIGMA_CLIENT_SECRET || '',
    callbackUrl:
        process.env.FIGMA_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/figma/callback',
    redirectAllowlist: (process.env.FIGMA_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from FIGMA_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.FIGMA_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
