import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

function parseChainIds(raw?: string): number[] {
    if (!raw?.trim()) {
        return [1];
    }

    const ids = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0);

    return ids.length > 0 ? ids : [1];
}

export default registerAs('metamaskAuth', () => ({
    enabled:
        process.env.METAMASK_AUTH_ENABLED === 'true' ||
        process.env.METAMASK_AUTH_ENABLED === '1',
    domain: process.env.METAMASK_DOMAIN || 'localhost',
    uri: process.env.METAMASK_URI || 'http://localhost:3000',
    statement:
        process.env.METAMASK_STATEMENT || 'Sign in to the NestJS Boilerplate',
    chainIds: parseChainIds(process.env.METAMASK_CHAIN_IDS),
    nonceTtlSeconds: Number(process.env.METAMASK_NONCE_TTL_SECONDS) || 300,
    /** Comma-separated roles from METAMASK_OAUTH_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(
        process.env.METAMASK_OAUTH_DEFAULT_ROLES,
    ),
}));
