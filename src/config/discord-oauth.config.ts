import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('discordOAuth', () => ({
    enabled:
        process.env.DISCORD_AUTH_ENABLED === 'true' ||
        process.env.DISCORD_AUTH_ENABLED === '1',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackUrl:
        process.env.DISCORD_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/discord/callback',
    redirectAllowlist: (process.env.DISCORD_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from DISCORD_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.DISCORD_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
