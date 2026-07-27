import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('twitchOAuth', () => ({
    enabled:
        process.env.TWITCH_AUTH_ENABLED === 'true' ||
        process.env.TWITCH_AUTH_ENABLED === '1',
    clientId: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    callbackUrl:
        process.env.TWITCH_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/twitch/callback',
    redirectAllowlist: (process.env.TWITCH_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from TWITCH_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.TWITCH_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
