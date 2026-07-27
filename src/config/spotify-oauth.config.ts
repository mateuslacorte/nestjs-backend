import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('spotifyOAuth', () => ({
    enabled:
        process.env.SPOTIFY_AUTH_ENABLED === 'true' ||
        process.env.SPOTIFY_AUTH_ENABLED === '1',
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    callbackUrl:
        process.env.SPOTIFY_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/spotify/callback',
    redirectAllowlist: (process.env.SPOTIFY_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from SPOTIFY_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.SPOTIFY_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));

