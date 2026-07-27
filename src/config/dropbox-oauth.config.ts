import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('dropboxOAuth', () => ({
    enabled:
        process.env.DROPBOX_AUTH_ENABLED === 'true' ||
        process.env.DROPBOX_AUTH_ENABLED === '1',
    clientId: process.env.DROPBOX_CLIENT_ID || '',
    clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
    callbackUrl:
        process.env.DROPBOX_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/dropbox/callback',
    redirectAllowlist: (process.env.DROPBOX_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from DROPBOX_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.DROPBOX_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
