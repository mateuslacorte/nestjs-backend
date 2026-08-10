import { AppRequest } from '@common/http/app-http';

/**
 * Resolves the client IP preferring Fastify's trustProxy-aware `req.ip`.
 * Falls back to proxy headers only when `req.ip` is unavailable.
 */
export function getClientIp(req: AppRequest): string {
    if (req.ip) {
        return req.ip;
    }

    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = Array.isArray(forwarded)
            ? forwarded[0]
            : forwarded.split(',')[0];
        return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return req.socket?.remoteAddress || 'unknown';
}
