import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

export default registerAs('microsoftOAuth', () => {
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

    return {
        enabled:
            process.env.MICROSOFT_AUTH_ENABLED === 'true' ||
            process.env.MICROSOFT_AUTH_ENABLED === '1',
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        tenantId,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        callbackUrl:
            process.env.MICROSOFT_CALLBACK_URL ||
            'http://localhost:3000/api/v1/auth/microsoft/callback',
        redirectAllowlist: (process.env.MICROSOFT_REDIRECT_ALLOWLIST || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        /** Comma-separated roles from MICROSOFT_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
        defaultRoles: parseOAuthDefaultRoles(
            process.env.MICROSOFT_OAUTH_DEFAULT_ROLES,
        ),
        exchangeCodeTtlSeconds: 60,
    };
});
