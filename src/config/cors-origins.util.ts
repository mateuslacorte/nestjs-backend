/**
 * Build CORS allowlist: always include this app's own origins (wiki, swagger, API),
 * plus optional extra origins from CORS_ORIGINS (unrelated clients).
 */

export function normalizeOrigin(value: string): string | null {
    const trimmed = value.trim().replace(/\/$/, '');
    if (!trimmed) {
        return null;
    }

    try {
        if (/^https?:\/\//i.test(trimmed)) {
            return new URL(trimmed).origin;
        }
    } catch {
        return null;
    }

    return null;
}

/** Parse comma-separated origin list from env (e.g. CORS_ORIGINS). */
export function parseOriginList(raw?: string | null): string[] {
    if (!raw?.trim()) {
        return [];
    }

    const out: string[] = [];
    for (const part of raw.split(',')) {
        const origin = normalizeOrigin(part);
        if (origin) {
            out.push(origin);
        }
    }
    return out;
}

function addOrigin(set: Set<string>, value: string | null | undefined): void {
    if (!value) {
        return;
    }
    const origin = normalizeOrigin(value);
    if (origin) {
        set.add(origin);
    }
}

function addLocalDevPair(set: Set<string>, protocol: string, port: number): void {
    const proto = protocol.endsWith(':') ? protocol : `${protocol}:`;
    set.add(`${proto}//localhost:${port}`);
    set.add(`${proto}//127.0.0.1:${port}`);
}

/**
 * Origins that belong to this Nest process (same host serving wiki, Swagger, REST, GraphQL).
 */
export function buildSelfOrigins(options: {
    host?: string | null;
    port?: number;
    publicUrl?: string | null;
}): string[] {
    const port = options.port && Number.isFinite(options.port) ? options.port : 3000;
    const set = new Set<string>();

    addOrigin(set, options.publicUrl);

    const hostCfg = (options.host || 'localhost').trim().replace(/\/$/, '');

    if (/^https?:\/\//i.test(hostCfg)) {
        try {
            const url = new URL(hostCfg);
            const isLoopback =
                url.hostname === 'localhost' || url.hostname === '127.0.0.1';

            if (isLoopback) {
                addLocalDevPair(set, url.protocol, port);
            } else {
                set.add(url.origin);
                // HOST often omits listen port behind a reverse proxy; also allow explicit port.
                if (!url.port && port !== 80 && port !== 443) {
                    set.add(`${url.protocol}//${url.hostname}:${port}`);
                }
            }
        } catch {
            addLocalDevPair(set, 'http:', port);
        }
    } else {
        const hostname = hostCfg || 'localhost';
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            addLocalDevPair(set, 'http:', port);
        } else {
            set.add(`http://${hostname}:${port}`);
        }
    }

    return [...set];
}

export function resolveCorsOriginsFromEnv(
    env: NodeJS.ProcessEnv = process.env,
): string[] {
    const port = parseInt(env.PORT || '3000', 10);
    const self = buildSelfOrigins({
        host: env.HOST,
        port: Number.isFinite(port) ? port : 3000,
        publicUrl: env.APP_URL || env.PUBLIC_URL,
    });
    const extra = parseOriginList(env.CORS_ORIGINS);
    return [...new Set([...self, ...extra])];
}

export function isOriginAllowed(
    origin: string | undefined,
    allowed: string[],
): boolean {
    // Same-origin, curl, server-to-server, native clients — no Origin header
    if (!origin) {
        return true;
    }
    return allowed.includes(origin);
}

/** Shared origin callback for Express `cors` and Socket.IO. */
export function createCorsOriginDelegate(allowed: string[]) {
    return (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
    ) => {
        callback(null, isOriginAllowed(origin, allowed));
    };
}
