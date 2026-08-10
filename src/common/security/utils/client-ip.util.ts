import { AppRequest } from '@common/http/app-http';

function headerValue(
    value: string | string[] | undefined,
): string | undefined {
    if (value == null) {
        return undefined;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    const trimmed = raw?.trim();
    return trimmed || undefined;
}

function parsePort(raw: string | undefined): number | null {
    if (!raw) {
        return null;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) {
        return parsed;
    }
    return null;
}

/**
 * Resolves the visitor IP with Cloudflare in mind.
 * Prefers `CF-Connecting-IP`, then Enterprise `True-Client-IP`,
 * then Fastify trustProxy `req.ip`, then common proxy headers.
 */
export function getClientIp(req: AppRequest): string {
    const cfConnectingIp = headerValue(req.headers['cf-connecting-ip']);
    if (cfConnectingIp) {
        return cfConnectingIp;
    }

    const trueClientIp = headerValue(req.headers['true-client-ip']);
    if (trueClientIp) {
        return trueClientIp;
    }

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

    const realIp = headerValue(req.headers['x-real-ip']);
    if (realIp) {
        return realIp;
    }

    return req.socket?.remoteAddress || 'unknown';
}

/**
 * Resolves the client origin port when available.
 * Prefers `X-Forwarded-Port` (Cloudflare / reverse-proxy).
 * When `CF-Device-Accept-CH` is present (Client Hints enabled at CF),
 * also checks common Client Hint / forwarded port headers.
 * Falls back to `socket.remotePort`.
 */
export function getClientPort(req: AppRequest): number | null {
    const forwardedPort = req.headers['x-forwarded-port'];
    if (forwardedPort) {
        const raw = Array.isArray(forwardedPort)
            ? forwardedPort[0]
            : forwardedPort.split(',')[0]?.trim();
        const fromForwarded = parsePort(raw);
        if (fromForwarded != null) {
            return fromForwarded;
        }
    }

    // Cloudflare Client Hints signal — origins may also receive a port hint
    // via Transform Rules / custom headers when Accept-CH is configured.
    const cfDeviceAcceptCh = headerValue(req.headers['cf-device-accept-ch']);
    if (cfDeviceAcceptCh) {
        const hintPort = headerValue(
            req.headers['cf-client-port'] ??
                req.headers['x-client-port'] ??
                req.headers['client-port'],
        );
        const fromHint = parsePort(hintPort);
        if (fromHint != null) {
            return fromHint;
        }
    }

    const remotePort = req.socket?.remotePort;
    if (
        typeof remotePort === 'number' &&
        Number.isFinite(remotePort) &&
        remotePort > 0
    ) {
        return remotePort;
    }

    return null;
}
