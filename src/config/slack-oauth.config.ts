import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('slackOAuth', () => ({
    enabled:
        process.env.SLACK_AUTH_ENABLED === 'true' ||
        process.env.SLACK_AUTH_ENABLED === '1',
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    callbackUrl:
        process.env.SLACK_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/slack/callback',
    redirectAllowlist: (process.env.SLACK_REDIRECT_ALLOWLIST || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    /** Comma-separated roles from SLACK_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.SLACK_OAUTH_DEFAULT_ROLES),
    exchangeCodeTtlSeconds: 60,
}));
