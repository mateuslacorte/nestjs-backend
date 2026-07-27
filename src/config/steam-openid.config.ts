import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('steamOpenId', () => ({
    enabled:
        process.env.STEAM_AUTH_ENABLED === 'true' ||
        process.env.STEAM_AUTH_ENABLED === '1',
    /** Optional — used for GetPlayerSummaries (persona name). OpenID works without it. */
    apiKey: process.env.STEAM_API_KEY || '',
    callbackUrl:
        process.env.STEAM_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/steam/callback',
    realm: process.env.STEAM_REALM || 'http://localhost:3000/',
    redirectAllowlist: (process.env.STEAM_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from STEAM_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.STEAM_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
