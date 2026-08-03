import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Nest HTTP request under the Fastify adapter.
 * Extends FastifyRequest with Passport/Express-compat fields used across auth + wiki.
 */
export type AppRequest = FastifyRequest & {
    user?: unknown;
    /**
     * OAuth client redirect state recovered from Passport PKCE session
     * (Twitter). Base64url JSON `{ r: redirectUrl }`.
     */
    oauthState?: string;
    /** Express-compat; prefer {@link requestPath}. */
    path?: string;
    /** Express-compat; prefer {@link requestOriginalUrl}. */
    originalUrl?: string;
    query: Record<string, unknown>;
    body?: unknown;
};

/** Nest HTTP reply under the Fastify adapter (+ @fastify/view / @fastify/static). */
export type AppReply = FastifyReply & {
    view(page: string, data?: object): Promise<unknown> | FastifyReply;
    sendFile(filename: string, rootPath?: string): FastifyReply;
};

/** Pathname without query string (Express `req.path` equivalent). */
export function requestPath(
    req: Pick<FastifyRequest, 'url'> & { path?: string },
): string {
    if (typeof req.path === 'string' && req.path.length > 0) {
        return req.path;
    }
    return (req.url || '/').split('?')[0] || '/';
}

/** Full URL path including query (Express `req.originalUrl` equivalent). */
export function requestOriginalUrl(
    req: Pick<FastifyRequest, 'url'> & { originalUrl?: string },
): string {
    if (typeof req.originalUrl === 'string' && req.originalUrl.length > 0) {
        return req.originalUrl;
    }
    return req.url || '/';
}

export function requestHost(
    req: Pick<FastifyRequest, 'headers' | 'hostname'> & {
        get?: (name: string) => string | undefined;
    },
): string | undefined {
    if (typeof req.get === 'function') {
        return req.get('host');
    }
    if (typeof req.hostname === 'string' && req.hostname.length > 0) {
        const hostHeader = req.headers.host;
        return typeof hostHeader === 'string' ? hostHeader : req.hostname;
    }
    const host = req.headers.host;
    return typeof host === 'string' ? host : undefined;
}

export function requestProtocol(
    req: Pick<FastifyRequest, 'protocol' | 'headers'>,
): string {
    const protoHeader = req.headers['x-forwarded-proto'];
    const forwarded = Array.isArray(protoHeader)
        ? protoHeader[0]
        : protoHeader?.split(',')[0]?.trim();
    if (forwarded) {
        return forwarded;
    }
    return req.protocol || 'http';
}

/** Read a single string query param (Fastify query values may be string | string[]). */
export function queryString(
    req: { query?: Record<string, unknown> },
    key: string,
): string | undefined {
    const value = req.query?.[key];
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0];
    }
    return undefined;
}
